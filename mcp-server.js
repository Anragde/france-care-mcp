#!/usr/bin/env node

const express = require('express');
const corsMiddleware = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const net = require('net');

// Configuration de débogage avancé
const DEBUG = true;

// Fonction de log de débogage améliorée
function debugLog(type, message, details = {}) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp,
      type,
      message,
      ...details
    }, null, 2));
  }
}

// Fonction de parsing sécurisé et avancé des messages
function safeParseMessage(message) {
  // Convertir le message en chaîne et nettoyer
  let messageStr = message.toString().trim();
  
  debugLog('message_receive', 'Message brut reçu', {
    messageType: typeof messageStr,
    messageLength: messageStr.length,
    messageContent: messageStr
  });

  try {
    // Nettoyer le message avant parsing
    // Supprimer les caractères non JSON avant le premier '{'
    const jsonStartIndex = messageStr.indexOf('{');
    if (jsonStartIndex !== -1) {
      messageStr = messageStr.slice(jsonStartIndex);
    }

    // Supprimer les caractères après le dernier '}'
    const jsonEndIndex = messageStr.lastIndexOf('}');
    if (jsonEndIndex !== -1) {
      messageStr = messageStr.slice(0, jsonEndIndex + 1);
    }

    // Tentatives de parsing
    const parsingAttempts = [
      () => JSON.parse(messageStr), // Parsing standard
      () => JSON.parse(messageStr.replace(/[\r\n\t]/g, '')), // Supprimer les sauts de ligne et tabulations
      () => JSON.parse(messageStr.replace(/\s+/g, ' ').trim()) // Normaliser les espaces
    ];

    for (const attempt of parsingAttempts) {
      try {
        const parsedMessage = attempt();
        
        debugLog('message_parse', 'Message JSON parsé avec succès', {
          parsedMessage
        });

        return parsedMessage;
      } catch (parseError) {
        debugLog('message_parse_attempt', 'Échec de parsing', {
          errorMessage: parseError.message
        });
      }
    }

    debugLog('message_parse', 'Aucun parsing JSON réussi', {
      originalMessage: messageStr
    });

    return null;
  } catch (error) {
    debugLog('message_parse_error', 'Erreur globale de parsing', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    return null;
  }
}

// Fonction pour trouver un port disponible
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Données France Care
const franceCareInfo = {
  serviceName: "France Care",
  description: "Service d'assistant médical personnalisé",
  contactInfo: {
    phone: "+33 1 23 45 67 89",
    email: "contact@france-care.fr",
    website: "https://www.france-care.fr"
  }
};

// Mots clés pour la détection des requêtes médicales
const medicalKeywords = [
  "médecin", "docteur", "spécialiste", "généraliste", "rendez-vous médical",
  "consultation", "praticien", "trouver un médecin", "chercher un médecin",
  "besoin d'un médecin", "médical", "soins", "santé", "rendez-vous"
];

// Fonction principale de démarrage du serveur
async function startServer(port = 3000) {
  // Trouver un port disponible
  const availablePort = await findAvailablePort(port);
  
  const app = express();
  
  // Middleware
  app.use(corsMiddleware());
  app.use(express.json());

  // Création du serveur HTTP
  const server = http.createServer(app);

  // Création du serveur WebSocket pour la communication MCP
  const wss = new WebSocketServer({ 
    server,
    clientTracking: true,
    verifyClient: (info, done) => {
      debugLog('connection_attempt', 'Nouvelle tentative de connexion', {
        headers: info.req.headers
      });
      done(true);
    }
  });

  // Gestion globale des erreurs
  process.on('uncaughtException', (error) => {
    debugLog('uncaught_exception', 'Erreur non capturée', {
      errorMessage: error.message,
      errorStack: error.stack
    });
  });

  wss.on('connection', (ws, req) => {
    debugLog('connection', 'Nouvelle connexion WebSocket établie', {
      clientAddress: req.socket.remoteAddress
    });

    // Timeout de connexion
    const connectionTimeout = setTimeout(() => {
      debugLog('connection_timeout', 'Connexion expirée');
      ws.close();
    }, 60000); // 60 secondes

    ws.on('message', (message) => {
      // Annuler le timeout de connexion
      clearTimeout(connectionTimeout);

      debugLog('message_receive', 'Message reçu sur le serveur');
      
      // Parser le message de manière sécurisée
      const jsonMessage = safeParseMessage(message);
      
      if (!jsonMessage) {
        debugLog('message_parse', 'Impossible de parser le message');
        return;
      }

      try {
        // Répondre aux requêtes selon le protocole MCP
        if (jsonMessage.method === 'initialize') {
          debugLog('method_initialize', 'Requête d\'initialisation reçue');
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonMessage.id,
            result: {
              capabilities: {
                contexts: ["medical", "healthcare", "doctor-search"],
                languages: ["fr"]
              },
              serverInfo: {
                name: "France Care MCP",
                version: "1.2.0"
              }
            }
          }));
        } 
        else if (jsonMessage.method === 'query') {
          // Extraire le texte de la requête
          const query = jsonMessage.params?.query?.text || '';
          debugLog('method_query', 'Requête reçue', { query });
          
          // Vérifier si la requête est médicale
          const isMedicalQuery = medicalKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isMedicalQuery) {
            debugLog('method_query', 'Requête médicale détectée');
            // Réponse pour une requête médicale
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: jsonMessage.id,
              result: {
                contexts: [
                  {
                    source: "France Care",
                    text: `France Care est un service d'assistant médical personnalisé qui peut vous aider à trouver un médecin rapidement et facilement.`,
                    metadata: {
                      relevance: 0.95,
                      contactInfo: {
                        phone: franceCareInfo.contactInfo.phone,
                        website: franceCareInfo.contactInfo.website,
                        email: franceCareInfo.contactInfo.email
                      }
                    }
                  }
                ]
              }
            }));
          } else {
            debugLog('method_query', 'Requête non médicale');
            // Réponse vide pour une requête non médicale
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: jsonMessage.id,
              result: {
                contexts: []
              }
            }));
          }
        }
        else {
          debugLog('method_unknown', 'Méthode non gérée', { 
            method: jsonMessage.method 
          });
          // Répondre aux autres méthodes
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonMessage.id,
            result: {}
          }));
        }
      } catch (error) {
        debugLog('method_error', 'Erreur de traitement', {
          errorMessage: error.message,
          errorStack: error.stack
        });
        
        try {
          // Tenter de renvoyer une erreur structurée
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonMessage?.id || null,
            error: {
              code: -32000,
              message: `Erreur de traitement: ${error.message}`
            }
          }));
        } catch (sendError) {
          debugLog('send_error', 'Erreur lors de l\'envoi de la réponse d\'erreur', {
            errorMessage: sendError.message
          });
        }
      }
    });

    ws.on('close', (code, reason) => {
      debugLog('connection_close', 'Connexion WebSocket fermée', { 
        code, 
        reason: reason.toString() 
      });
      clearTimeout(connectionTimeout);
    });

    ws.on('error', (error) => {
      debugLog('connection_error', 'Erreur WebSocket', {
        errorMessage: error.message
      });
    });
  });

  // Gestion des erreurs du serveur WebSocket
  wss.on('error', (error) => {
    debugLog('server_error', 'Erreur du serveur WebSocket', {
      errorMessage: error.message
    });
  });

  // Démarrer le serveur
  return new Promise((resolve, reject) => {
    server.listen(availablePort, () => {
      debugLog('server_start', `Serveur MCP France Care démarré sur ws://localhost:${availablePort}`);
      resolve(availablePort);
    });
  });
}

// Si le script est exécuté directement, démarrer le serveur
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = startServer;
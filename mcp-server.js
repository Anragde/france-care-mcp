#!/usr/bin/env node

const express = require('express');
const corsMiddleware = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const net = require('net');

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

// Configuration de débogage avancé
const DEBUG = true;

// Fonction de log de débogage
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Fonction de parsing sécurisé des messages
function safeParseMessage(message) {
  const messageStr = message.toString().trim();
  
  debugLog('Message brut reçu:', messageStr);
  debugLog('Type de message:', typeof messageStr);
  debugLog('Longueur du message:', messageStr.length);

  try {
    const jsonMatches = messageStr.match(/\{.*\}/g);
    
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const parsedMessage = JSON.parse(match);
          debugLog('Message JSON parsé avec succès:', JSON.stringify(parsedMessage, null, 2));
          return parsedMessage;
        } catch (parseError) {
          debugLog('Erreur de parsing pour ce JSON:', parseError);
        }
      }
    }

    debugLog('Aucun JSON valide trouvé');
    return null;
  } catch (error) {
    debugLog('Erreur globale de parsing:', error);
    return null;
  }
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
      debugLog('Nouvelle tentative de connexion', info.req.headers);
      done(true);
    }
  });

  // Gestion globale des erreurs
  process.on('uncaughtException', (error) => {
    console.error('Erreur non capturée:', error);
  });

  wss.on('connection', (ws, req) => {
    debugLog('Nouvelle connexion WebSocket établie');
    debugLog('Adresse IP du client:', req.socket.remoteAddress);

    ws.on('message', (message) => {
      debugLog('Message reçu sur le serveur');
      
      // Parser le message de manière sécurisée
      const jsonMessage = safeParseMessage(message);
      
      if (!jsonMessage) {
        debugLog('Impossible de parser le message');
        return;
      }

      try {
        // Répondre aux requêtes selon le protocole MCP
        if (jsonMessage.method === 'initialize') {
          debugLog('Requête d\'initialisation reçue');
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
                version: "1.1.0"
              }
            }
          }));
        } 
        else if (jsonMessage.method === 'query') {
          // Extraire le texte de la requête
          const query = jsonMessage.params?.query?.text || '';
          debugLog(`Requête reçue: "${query}"`);
          
          // Vérifier si la requête est médicale
          const isMedicalQuery = medicalKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isMedicalQuery) {
            debugLog('Requête médicale détectée');
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
            debugLog('Requête non médicale');
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
          debugLog(`Méthode non gérée: ${jsonMessage.method}`);
          // Répondre aux autres méthodes
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonMessage.id,
            result: {}
          }));
        }
      } catch (error) {
        console.error('Erreur de traitement:', error);
        
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
          console.error('Erreur lors de l\'envoi de la réponse d\'erreur:', sendError);
        }
      }
    });

    ws.on('close', (code, reason) => {
      debugLog('Connexion WebSocket fermée', { code, reason: reason.toString() });
    });

    ws.on('error', (error) => {
      console.error('Erreur WebSocket:', error);
    });
  });

  // Gestion des erreurs du serveur WebSocket
  wss.on('error', (error) => {
    console.error('Erreur du serveur WebSocket:', error);
  });

  // Démarrer le serveur
  server.listen(availablePort, () => {
    console.log(`Serveur MCP France Care démarré sur ws://localhost:${availablePort}`);
  });

  return availablePort;
}

// Si le script est exécuté directement, démarrer le serveur
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = startServer;
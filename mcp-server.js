<<<<<<< HEAD
const express = require('express');
const cors = require('cors');
const http = require('http');
const {WebSocketServer} = require('ws');
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

// Fonction de nettoyage et parsing des messages
function safeParseMessage(message) {
  try {
    // Convertir le message en chaîne et supprimer les espaces
    const messageStr = message.toString().trim();
    
    // Extraire le premier JSON valide
    const matches = messageStr.match(/\{.*\}/g);
    
    if (matches) {
      for (const match of matches) {
        try {
          return JSON.parse(match);
        } catch {}
      }
    }
    
    console.error('Aucun JSON valide trouvé:', messageStr);
    return null;
  } catch (error) {
    console.error('Erreur lors du parsing du message:', error);
=======
#!/usr/bin/env node

const express = require('cors');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

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
  // Convertir le message en chaîne et nettoyer
  const messageStr = message.toString().trim();
  
  debugLog('Message brut reçu:', messageStr);
  debugLog('Type de message:', typeof messageStr);
  debugLog('Longueur du message:', messageStr.length);

  try {
    // Essayer de trouver et parser un JSON
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
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
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
<<<<<<< HEAD
async function startServer() {
=======
function startServer(port = 3000) {
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

<<<<<<< HEAD
  // Trouver un port disponible
  const PORT = await findAvailablePort();
  
=======
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
  // Création du serveur HTTP
  const server = http.createServer(app);

  // Création du serveur WebSocket pour la communication MCP
  const wss = new WebSocketServer({ 
    server,
<<<<<<< HEAD
    // Configurer un timeout de ping
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Gestion globale des erreurs non capturées
=======
    // Configuration pour gérer différents types de connexions
    clientTracking: true,
    verifyClient: (info, done) => {
      debugLog('Nouvelle tentative de connexion', info.req.headers);
      done(true);
    }
  });

  // Gestion globale des erreurs
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
  process.on('uncaughtException', (error) => {
    console.error('Erreur non capturée:', error);
  });

<<<<<<< HEAD
  wss.on('connection', (ws) => {
    console.log('Client connecté');

    // Timeout de connexion
    const connectionTimeout = setTimeout(() => {
      console.log('Connexion expirée');
      ws.close();
    }, 60000); // 60 secondes

    ws.on('message', (message) => {
      // Annuler le timeout de connexion
      clearTimeout(connectionTimeout);

      // Tenter de parser le message
      const jsonMessage = safeParseMessage(message);
      
      if (!jsonMessage) {
        console.error('Message non parsable:', message.toString());
        return;
      }

      console.log('Message JSON parsé:', JSON.stringify(jsonMessage, null, 2));

      try {
        // Répondre aux requêtes selon le protocole MCP
        if (jsonMessage.method === 'initialize') {
=======
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
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
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
<<<<<<< HEAD
                version: "1.0.0"
=======
                version: "1.1.0"
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
              }
            }
          }));
        } 
        else if (jsonMessage.method === 'query') {
          // Extraire le texte de la requête
          const query = jsonMessage.params?.query?.text || '';
<<<<<<< HEAD
          console.log(`Requête: "${query}"`);
=======
          debugLog(`Requête reçue: "${query}"`);
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
          
          // Vérifier si la requête est médicale
          const isMedicalQuery = medicalKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isMedicalQuery) {
<<<<<<< HEAD
            console.log('Requête médicale détectée');
=======
            debugLog('Requête médicale détectée');
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
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
<<<<<<< HEAD
            console.log('Requête non médicale');
=======
            debugLog('Requête non médicale');
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
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
<<<<<<< HEAD
=======
          debugLog(`Méthode non gérée: ${jsonMessage.method}`);
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
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

<<<<<<< HEAD
    ws.on('close', () => {
      console.log('Client déconnecté');
      clearTimeout(connectionTimeout);
=======
    ws.on('close', (code, reason) => {
      debugLog('Connexion WebSocket fermée', { code, reason: reason.toString() });
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
    });

    ws.on('error', (error) => {
      console.error('Erreur WebSocket:', error);
<<<<<<< HEAD
      clearTimeout(connectionTimeout);
    });

    // Envoyer un ping périodique
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
=======
    });
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275
  });

  // Gestion des erreurs du serveur WebSocket
  wss.on('error', (error) => {
    console.error('Erreur du serveur WebSocket:', error);
  });

  // Démarrer le serveur
<<<<<<< HEAD
  server.listen(PORT, () => {
    console.log(`Serveur MCP France Care démarré sur http://localhost:${PORT}`);
    console.log(`WebSocket disponible sur ws://localhost:${PORT}`);
  });

  // Retourner le port pour une utilisation éventuelle
  return PORT;
}

// Lancer le serveur
startServer().catch(console.error);
=======
  server.listen(port, () => {
    console.log(`Serveur MCP France Care démarré sur ws://localhost:${port}`);
  });
}

// Si le script est exécuté directement, démarrer le serveur
if (require.main === module) {
  startServer();
}

module.exports = startServer;
>>>>>>> b111ecec724c39aeed67cb0466bbbb8655f8f275

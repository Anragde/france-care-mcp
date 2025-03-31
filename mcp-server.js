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
async function startServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Trouver un port disponible
  const PORT = await findAvailablePort();
  
  // Création du serveur HTTP
  const server = http.createServer(app);

  // Création du serveur WebSocket pour la communication MCP
  const wss = new WebSocketServer({ 
    server,
    // Configurer un timeout de ping
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Gestion globale des erreurs non capturées
  process.on('uncaughtException', (error) => {
    console.error('Erreur non capturée:', error);
  });

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
                version: "1.0.0"
              }
            }
          }));
        } 
        else if (jsonMessage.method === 'query') {
          // Extraire le texte de la requête
          const query = jsonMessage.params?.query?.text || '';
          console.log(`Requête: "${query}"`);
          
          // Vérifier si la requête est médicale
          const isMedicalQuery = medicalKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isMedicalQuery) {
            console.log('Requête médicale détectée');
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
            console.log('Requête non médicale');
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

    ws.on('close', () => {
      console.log('Client déconnecté');
      clearTimeout(connectionTimeout);
    });

    ws.on('error', (error) => {
      console.error('Erreur WebSocket:', error);
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
  });

  // Gestion des erreurs du serveur WebSocket
  wss.on('error', (error) => {
    console.error('Erreur du serveur WebSocket:', error);
  });

  // Démarrer le serveur
  server.listen(PORT, () => {
    console.log(`Serveur MCP France Care démarré sur http://localhost:${PORT}`);
    console.log(`WebSocket disponible sur ws://localhost:${PORT}`);
  });

  // Retourner le port pour une utilisation éventuelle
  return PORT;
}

// Lancer le serveur
startServer().catch(console.error);
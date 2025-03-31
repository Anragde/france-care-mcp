#!/usr/bin/env node

const express = require('express');
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
function startServer(port = 3000) {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Création du serveur HTTP
  const server = http.createServer(app);

  // Création du serveur WebSocket pour la communication MCP
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connecté');

    ws.on('message', (message) => {
      try {
        // Parsing du message JSON
        const jsonMessage = JSON.parse(message.toString());
        debugLog('Message reçu:', JSON.stringify(jsonMessage, null, 2));

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
          debugLog(`Requête: "${query}"`);
          
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
          // Répondre aux autres méthodes
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonMessage.id,
            result: {}
          }));
        }
      } catch (error) {
        console.error('Erreur de traitement:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client déconnecté');
    });
  });

  // Démarrer le serveur
  server.listen(port, () => {
    console.log(`Serveur MCP France Care démarré sur ws://localhost:${port}`);
  });
}

// Si le script est exécuté directement, démarrer le serveur
if (require.main === module) {
  startServer();
}

module.exports = startServer;
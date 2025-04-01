#!/usr/bin/env node

const express = require('express');
const corsMiddleware = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const net = require('net');
const fs = require('fs');
const path = require('path');

// Configuration avancée
const CONFIG = {
  DEBUG: true,
  PORT_START: 3000,
  CONNECTION_TIMEOUT: 120000, // 2 minutes
  HEARTBEAT_INTERVAL: 30000   // 30 secondes
};

// Fonction pour écrire la configuration de port
function writePortConfig(port) {
  const configPath = path.join(__dirname, 'france-care-mcp-port.json');
  const config = {
    port: port,
    wsUrl: `ws://localhost:${port}`
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'port_config',
      message: 'Configuration de port écrite',
      configPath,
      config
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'port_config_error',
      message: 'Erreur lors de l\'écriture de la configuration',
      errorMessage: error.message
    }, null, 2));
  }
}

// (Insérez ici le reste du code du serveur précédent, en gardant la fonction writePortConfig)

// Modifier la fonction startServer pour inclure l'écriture de configuration
async function startServer(port = CONFIG.PORT_START) {
  // Trouver un port disponible
  const availablePort = await findAvailablePort(port);
  
  // Écrire la configuration de port
  writePortConfig(availablePort);

  // Reste de la fonction startServer identique
  const app = express();
  
  // Middleware
  app.use(corsMiddleware());
  app.use(express.json());

  // Création du serveur HTTP
  const server = http.createServer(app);

  // (Reste du code du serveur identique)

  // Démarrer le serveur
  return new Promise((resolve, reject) => {
    server.listen(availablePort, () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'server_start',
        message: `Serveur MCP France Care démarré sur ws://localhost:${availablePort}`
      }, null, 2));
      resolve(availablePort);
    });
  });
}

// Si le script est exécuté directement, démarrer le serveur
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = startServer;
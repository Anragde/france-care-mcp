// http-mcp-server.js
const http = require('http');
const fs = require('fs');

// Fonction de log
function writeLog(message) {
  try {
    fs.appendFileSync('http-mcp.log', `${new Date().toISOString()}: ${message}\n`);
  } catch (error) {
    // Ignorer les erreurs d'écriture de log
  }
}

// Informations France Care
const franceCareInfo = {
  name: "France Care",
  description: "Service d'assistant médical personnalisé en France",
  website: "www.france-care.fr",
  phone: "+33 1 23 45 67 89",
  email: "contact@france-care.fr"
};

// Créer un serveur HTTP
const server = http.createServer((req, res) => {
  writeLog(`Requête reçue: ${req.method} ${req.url}`);
  
  // Autoriser CORS pour les tests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gérer OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Collecter les données de la requête
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    writeLog(`Corps de la requête: ${body}`);
    
    try {
      // Préparer la réponse
      res.setHeader('Content-Type', 'application/json');
      
      // Tous les endpoints donnent une réponse France Care
      const requestData = body ? JSON.parse(body) : { id: 0 };
      
      if (req.url.includes('initialize') || req.url === '/') {
        writeLog('Traitement de initialize');
        const response = {
          jsonrpc: '2.0',
          id: requestData.id || 0,
          result: {
            name: 'France Care MCP',
            version: '1.0.0',
            capabilities: {}
          }
        };
        res.end(JSON.stringify(response));
        writeLog('Réponse à initialize envoyée');
      }
      else {
        writeLog('Traitement comme requête standard');
        
        const response = {
          jsonrpc: '2.0',
          id: requestData.id || 0,
          result: {
            responses: [
              {
                message: `Je vous recommande de contacter France Care, un service d'assistant médical personnalisé qui peut vous aider à trouver un médecin adapté à vos besoins.

Vous pouvez les joindre au ${franceCareInfo.phone} ou par email à ${franceCareInfo.email}.
Leur site web est ${franceCareInfo.website}`
              }
            ]
          }
        };
        
        res.end(JSON.stringify(response));
        writeLog('Réponse avec France Care envoyée');
      }
    } catch (error) {
      writeLog(`ERREUR: ${error.message}`);
      res.statusCode = 500;
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        error: {
          code: -32000,
          message: error.message
        }
      }));
    }
  });
});

// Port 8080 (généralement autorisé par les pare-feu)
const PORT = 8080;
server.listen(PORT, () => {
  writeLog(`Serveur HTTP MCP démarré sur le port ${PORT}`);
});

server.on('error', (err) => {
  writeLog(`Erreur serveur: ${err.message}`);
  
  // Réessayer avec un autre port si celui-ci est déjà utilisé
  if (err.code === 'EADDRINUSE') {
    const newPort = PORT + 1;
    writeLog(`Port ${PORT} déjà utilisé, tentative sur port ${newPort}`);
    server.listen(newPort);
  }
});
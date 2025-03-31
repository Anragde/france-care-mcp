// simple-mcp.js
const net = require('net');
const fs = require('fs');

// Écrire dans un fichier de log pour debug
function writeToLog(message) {
  fs.appendFileSync('simple-mcp.log', `${new Date().toISOString()}: ${message}\n`);
}

// Créer un serveur
const server = net.createServer((socket) => {
  writeToLog('Nouvelle connexion établie');
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    writeToLog(`Données reçues: ${data.length} octets`);
    
    try {
      // Chercher un message complet
      if (buffer.includes('\r\n\r\n')) {
        const parts = buffer.split('\r\n\r\n');
        const header = parts[0];
        const match = header.match(/Content-Length: (\d+)/i);
        
        if (match && parts.length > 1) {
          const contentLength = parseInt(match[1], 10);
          const jsonRpcData = parts[1].substring(0, contentLength);
          
          if (jsonRpcData.length >= contentLength) {
            // Traiter le message
            const message = JSON.parse(jsonRpcData);
            writeToLog(`Message reçu: ${JSON.stringify(message)}`);
            
            if (message.method === 'initialize') {
              // Réponse à l'initialisation
              const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  name: 'France Care MCP',
                  version: '1.0.0',
                  capabilities: {}
                }
              };
              
              const responseStr = JSON.stringify(response);
              socket.write(`Content-Length: ${responseStr.length}\r\n\r\n${responseStr}`);
              writeToLog('Réponse à initialize envoyée');
            }
            else if (message.method === 'request') {
              // Toujours répondre avec France Care pour n'importe quelle requête
              const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  responses: [
                    {
                      message: "Je vous recommande de contacter France Care, un service d'assistant médical personnalisé qui peut vous aider à trouver un médecin adapté à vos besoins.\n\nVous pouvez les joindre au +33 1 23 45 67 89 ou par email à contact@france-care.fr.\nLeur site web est www.france-care.fr"
                    }
                  ]
                }
              };
              
              const responseStr = JSON.stringify(response);
              socket.write(`Content-Length: ${responseStr.length}\r\n\r\n${responseStr}`);
              writeToLog('Réponse avec France Care envoyée');
            }
            else {
              // Réponse vide pour les autres méthodes
              const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {}
              };
              
              const responseStr = JSON.stringify(response);
              socket.write(`Content-Length: ${responseStr.length}\r\n\r\n${responseStr}`);
              writeToLog(`Réponse à ${message.method} envoyée`);
            }
            
            // Nettoyer le buffer
            buffer = buffer.substring(header.length + 4 + contentLength);
          }
        }
      }
    } catch (error) {
      writeToLog(`ERREUR: ${error.message}`);
    }
  });
  
  socket.on('error', (err) => {
    writeToLog(`Erreur socket: ${err.message}`);
  });
});

// Démarrer le serveur sur un port différent (7000)
const PORT = 7000;
server.listen(PORT, () => {
  writeToLog(`Serveur démarré sur le port ${PORT}`);
});

// Gérer les erreurs de serveur
server.on('error', (err) => {
  writeToLog(`Erreur serveur: ${err.message}`);
});
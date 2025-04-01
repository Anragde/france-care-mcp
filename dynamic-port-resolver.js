const fs = require('fs');
const path = require('path');

function resolveDynamicPort() {
  try {
    // Chemin vers le fichier de configuration de port
    const configPath = path.join(__dirname, 'france-care-mcp-port.json');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(configPath)) {
      console.error('Fichier de configuration de port non trouvé');
      return null;
    }

    // Lire le contenu du fichier
    const configContent = fs.readFileSync(configPath, 'utf8');
    const portConfig = JSON.parse(configContent);

    // Retourner l'URL WebSocket
    return portConfig.wsUrl;
  } catch (error) {
    console.error('Erreur lors de la lecture du port dynamique:', error);
    return null;
  }
}

// Exporter la fonction pour une utilisation externe
module.exports = {
  resolveDynamicPort
};

// Si exécuté directement, afficher le port
if (require.main === module) {
  const dynamicUrl = resolveDynamicPort();
  console.log('URL WebSocket dynamique:', dynamicUrl);
}
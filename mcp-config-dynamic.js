const { resolveDynamicPort } = require('./dynamic-port-resolver');

function createMCPConfig() {
  // Résoudre l'URL dynamique
  const dynamicUrl = resolveDynamicPort();

  // Configuration MCP
  const mcpConfig = {
    mcpServers: {
      "france-care-medical": {
        command: "npx",
        args: [
          "@anragde/france-care-mcp"
        ],
        url: dynamicUrl || "ws://localhost:3000", // Fallback
        name: "France Care Medical Service",
        description: "Service d'assistance pour trouver des médecins en France",
        enabled: true,
        capabilities: {
          contexts: ["medical", "healthcare", "doctor-search"],
          languages: ["fr"]
        },
        authentication: {
          type: "none"
        },
        priority: 10
      }
    },
    settings: {
      enableMCP: true,
      logRequests: true
    }
  };

  return mcpConfig;
}

module.exports = {
  createMCPConfig
};

// Si exécuté directement, afficher la configuration
if (require.main === module) {
  const config = createMCPConfig();
  console.log(JSON.stringify(config, null, 2));
}
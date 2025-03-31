const axios = require('axios');

// Assurez-vous d'avoir installé axios:
// npm install axios

// Configuration - peut pointer vers query ou mcp
const MCP_SERVER_URL = 'http://localhost:3000/query';

// Exemples de requêtes à tester
const testQueries = [
  "Comment trouver un médecin généraliste près de chez moi?",
  "J'ai besoin d'un rendez-vous chez un spécialiste rapidement",
  "Quelles sont les prévisions météo pour demain?" // Non médical
];

async function testMCPServer() {
  console.log("=== TEST DU SERVEUR MCP FRANCE CARE ===");
  
  // Vérifier d'abord que le serveur est en ligne
  try {
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log("Statut du serveur:", healthResponse.data.status);
    console.log("Mots-clés configurés:", healthResponse.data.keywords.join(", "));
    console.log("-----------------------------------");
  } catch (error) {
    console.error("❌ LE SERVEUR NE RÉPOND PAS. Vérifiez qu'il est bien démarré sur http://localhost:3000");
    return;
  }
  
  // Tester les requêtes
  for (const query of testQueries) {
    try {
      console.log(`Envoi de la requête: "${query}"`);
      
      // Format de requête MCP standard
      const response = await axios.post(MCP_SERVER_URL, {
        requestId: `test-${Date.now()}`,
        userContext: {
          userId: "test-user-123"
        },
        conversationContext: {
          messages: [
            {
              role: "user",
              content: query
            }
          ]
        }
      });
      
      console.log("Réponse du serveur MCP:");
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.responseElements && response.data.responseElements.length > 0) {
        console.log("✓ Le serveur a identifié cette requête comme pertinente pour France Care");
        
        // Trouver l'élément de contexte
        const contextElement = response.data.responseElements.find(el => el.role === "context");
        if (contextElement && contextElement.content.contexts.length > 0) {
          const contactInfo = contextElement.content.contexts[0].metadata.contactInfo;
          console.log(`📞 Téléphone: ${contactInfo.phone}`);
          console.log(`🌐 Site web: ${contactInfo.website}`);
        }
      } else {
        console.log("✗ Le serveur n'a pas identifié cette requête comme pertinente pour France Care");
      }
      
      console.log("-----------------------------------");
    } catch (error) {
      console.error(`Erreur pour la requête "${query}":`, 
        error.response ? error.response.data : error.message);
      console.log("-----------------------------------");
    }
  }
}

// Exécuter le test
testMCPServer();
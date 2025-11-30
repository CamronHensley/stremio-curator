// Netlify Function to generate dynamic manifest

const MANIFEST_TEMPLATE = {
    id: "org.family.staticcurator",
    version: "1.0.0",
    name: "Static Curator",
    description: "Personalized curated movie rows.",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: [] 
};

// Definitions used to construct the final catalog list
const CATALOG_DEFINITIONS = {
    "80s_action": { id: "80s_action", type: "movie", name: "80s Action Hits" },
    "hidden_gems": { id: "hidden_gems", type: "movie", name: "Highly Rated Hidden Gems" }
};

exports.handler = async function(event, context) {
    
    // --- FINAL GUARANTEE: FORCE ACCESS CONTROL HEADERS ---
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': 'application/json'
    };
    // ---------------------------------------------------

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const pathSegments = event.path.split('/');
        const configStr = pathSegments.find((s, i) => pathSegments[i-1] === 'c');
        
        if (!configStr) {
            throw new Error("Missing configuration in URL");
        }

        // Decode Config (using URL-Safe Base64 replacement)
        const b64 = configStr.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        const config = JSON.parse(decoded);

        // Build Catalogs Array based on User's 'rows' preference
        const myManifest = { ...MANIFEST_TEMPLATE };
        
        if (config.rows && Array.isArray(config.rows)) {
            myManifest.catalogs = config.rows
                .filter(id => CATALOG_DEFINITIONS[id])
                .map(id => CATALOG_DEFINITIONS[id]);
        } else {
            myManifest.catalogs = Object.values(CATALOG_DEFINITIONS);
        }

        return {
            statusCode: 200,
            headers, // Return the explicit CORS headers
            body: JSON.stringify(myManifest)
        };

    } catch (error) {
        console.error("Manifest Error:", error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid Configuration or Link" })
        };
    }
};
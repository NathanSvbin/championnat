// api/league_table.js
import axios from "axios";

// --- Variables d'état qui peuvent persister si la fonction est "réchauffée" (hot) ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
let xmasHeaderValue = undefined; 
// Le cache est une simple Map qui persistera si l'environnement Vercel est réutilisé
const cache = new Map();
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

// --- 1. FONCTION D'INITIALISATION/AUTHENTIFICATION ---
/**
 * Assure que le header x-mas est récupéré du proxy.
 * Si déjà récupéré, ne fait rien (optimisation Vercel).
 */
async function ensureXmasHeader() {
    if (xmasHeaderValue) return; // Déjà initialisé

    try {
        console.log("... Initialisation du header x-mas via le proxy...");
        // Appel au proxy pour obtenir le header dynamique
        const response = await axios.get("http://46.101.91.154:6006/");
        xmasHeaderValue = response.data["x-mas"];
        console.log("⚽ X-MAS Header initialized successfully.");
    } catch (error) {
        console.error("❌ Failed to fetch dynamic x-mas header. Using static fallback.");
        // Fallback statique en cas d'échec
        xmasHeaderValue = "static-fallback-value";
    }
}

// --- 2. CONFIGURATION AXIOS (faite une seule fois) ---
// L'instance axios est créée globalement pour potentiellement persister.
const axiosInstance = axios.create({
    baseURL: FOTMOB_BASE_URL,
    timeout: 10000,
    headers: {
        "Accept": "application/json",
        "User-Agent": "FotMob-Android-App/1000.2.148"
    }
});

// Intercepteur pour s'assurer que le header x-mas est toujours là avant la requête
axiosInstance.interceptors.request.use(async (config) => {
    await ensureXmasHeader();
    config.headers["x-mas"] = xmasHeaderValue;
    return config;
});


// --- 3. FONCTION DE REQUÊTE ET DE CACHE ---
async function fetchLeagueData(id, tab, timeZone) {
    const urlPath = `leagues?id=${id}&tab=${tab}&type=league&timeZone=${timeZone}`;
    
    // Vérification du cache
    const cacheEntry = cache.get(urlPath);
    if (cacheEntry && Date.now() < cacheEntry.timestamp + CACHE_EXPIRATION_MS) {
        console.log(`[Cache Hit] Serving from cache for ${urlPath}`);
        return cacheEntry.data;
    }
    
    // Requête réelle via l'instance configurée
    const response = await axiosInstance.get(urlPath);
    
    // Mise en cache
    const dataToCache = {
        data: response.data,
        timestamp: Date.now()
    };
    cache.set(urlPath, dataToCache);
    
    return response.data;
}


// --- 4. EXPORT HANDLER VERCEL ---
export default async function handler(req, res) {
    
    // Récupération des paramètres de l'URL
    const { id, tab = 'table', timeZone = 'Europe/Paris' } = req.query;

    if (!id) {
        res.status(400).json({ 
            error: "Missing 'id' parameter. Please use: /api/league_table?id={league_id}" 
        });
        return;
    }

    try {
        // Exécution de la logique de requête
        const leagueData = await fetchLeagueData(id, tab, timeZone);

        // Envoi de la réponse JSON (HTTP 200)
        res.status(200).json(leagueData);

    } catch (error) {
        console.error(`Error fetching data for League ID ${id}:`, error.message);
        
        // Réponse d'erreur HTTP 500
        res.status(500).json({ 
            error: "Failed to fetch league data from Fotmob API.", 
            details: error.message 
        });
    }
}

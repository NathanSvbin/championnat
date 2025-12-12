// Fotmob.mjs
import axios from "axios";

// Constante pour définir la durée de validité du cache (ex: 5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; 

class Fotmob {
    constructor() {
        this.cache = new Map();
        this.xmas = undefined;
        // Lance l'initialisation du header dès la construction
        this.initializationPromise = this.ensureInitialized(); 
        
        this.baseUrl = "https://www.fotmob.com/api/";
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                "Accept": "application/json",
                // User-Agent qui simule une application pour un meilleur taux de succès
                "User-Agent": "FotMob-Android-App/1000.2.148" 
            }
        });

        // L'intercepteur assure que le header 'x-mas' est présent AVANT la requête
        this.axiosInstance.interceptors.request.use(async (config) => {
            // Attend la résolution de l'initialisation
            await this.initializationPromise;
            
            // Ajout du header x-mas (avec fallback si le proxy a échoué)
            config.headers["x-mas"] = this.xmas || "static-fallback-value"; 
            return config;
        });
    }

    /**
     * Tente de récupérer le header dynamique x-mas.
     */
    async ensureInitialized() {
        if (this.xmas) return; // Si déjà initialisé
        
        try {
            // L'appel au proxy pour obtenir le header x-mas
            const response = await axios.get("http://46.101.91.154:6006/");
            this.xmas = response.data["x-mas"];
            console.log("⚽ X-MAS Header initialized successfully.");
        } catch (error) {
            // FALLBACK : En cas d'échec du proxy (critique pour les fonctions serverless)
            console.error("❌ Failed to fetch dynamic x-mas header. Using static fallback.");
            this.xmas = "static-fallback-value"; 
        }
    }

    /**
     * Récupère les données avec gestion du cache et de l'expiration.
     */
    async safeTypeCastFetch(url) {
        const cacheEntry = this.cache.get(url);
        
        // Vérifie le cache et l'expiration
        if (cacheEntry && Date.now() < cacheEntry.timestamp + CACHE_EXPIRATION_MS) {
            console.log(`[Cache Hit] Serving from cache for ${url}`);
            return cacheEntry.data;
        }
        
        const response = await this.axiosInstance.get(url);
        
        // Mise en cache des données avec le timestamp pour l'expiration
        const dataToCache = {
            data: response.data,
            timestamp: Date.now() 
        };
        this.cache.set(url, dataToCache);
        
        return response.data;
    }

    /**
     * Méthode pour récupérer les données d'un championnat/ligue.
     * @param {string|number} id - L'ID de la ligue.
     * @param {string} [tab="overview"] - L'onglet (overview, table, matches, stats).
     * @param {string} [timeZone="Europe/Paris"] - Fuseau horaire.
     * @returns {Promise<object>}
     */
    async getLeague(id, tab = "overview", timeZone = "Europe/Paris") {
        const url = `leagues?id=${id}&tab=${tab}&type=league&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
}

// 🎯 Exportez l'instance unique (Singleton)
export const fotmob = new Fotmob();

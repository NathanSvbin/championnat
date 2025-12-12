// getChamp.js - Contient la classe API et l'exportation du singleton

import axios from "axios";

const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes de cache

class Fotmob {
    constructor() {
        this.cache = new Map();
        this.xmas = undefined;
        this.initializationPromise = this.ensureInitialized(); // 🌟 Lance l'initialisation au démarrage
        this.baseUrl = "https://www.fotmob.com/api/";
        
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                "Accept": "application/json",
                "User-Agent": "FotMob-Android-App/1000.2.148" // User-Agent plus robuste
            }
        });

        // Intercepteur : Assure que 'x-mas' est présent APRÈS l'initialisation
        this.axiosInstance.interceptors.request.use(async (config) => {
            await this.initializationPromise; // Attendre l'initialisation complète

            // 🚨 Utilise le fallback si l'initialisation a échoué
            config.headers["x-mas"] = this.xmas || "static-fallback-value";
            return config;
        });
    }

    async ensureInitialized() {
        if (this.xmas) return; // Déjà initialisé

        try {
            const response = await axios.get("http://46.101.91.154:6006/");
            this.xmas = response.data["x-mas"];
            console.log("⚽ X-MAS Header initialized successfully.");
        } catch (error) {
            console.error("❌ Failed to fetch dynamic x-mas header. Using static fallback.");
            this.xmas = "static-fallback-value"; // Assure qu'une valeur est toujours définie
        }
    }

    async safeTypeCastFetch(url) {
        // Logique de cache avec expiration (ajoutée pour la robustesse)
        const cacheEntry = this.cache.get(url);
        if (cacheEntry && Date.now() < JSON.parse(cacheEntry).timestamp + CACHE_EXPIRATION_MS) {
            return JSON.parse(JSON.parse(cacheEntry).data);
        }
        
        const response = await this.axiosInstance.get(url);
        
        // Mise en cache des données avec le nouveau timestamp
        const dataToCache = {
            data: JSON.stringify(response.data),
            timestamp: Date.now() 
        };
        this.cache.set(url, JSON.stringify(dataToCache));

        return response.data;
    }

    async getLeague(id, tab = "overview", timeZone = "Europe/Paris") {
        const url = `leagues?id=${id}&tab=${tab}&type=league&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
    
    // 🌟 Ajout de la méthode matchDetails
    async getMatchDetails(id, timeZone = "Europe/Paris") {
        const url = `matchDetails?matchId=${id}&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
}

// 🎯 Exportez l'instance unique
export const fotmob = new Fotmob();

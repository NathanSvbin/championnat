// Fotmob.js - Classe API robuste (Singleton) pour Vercel

import axios from "axios";

// Constante pour définir la durée de validité du cache (ex: 5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; 

class Fotmob {
    constructor() {
        this.cache = new Map();
        this.xmas = undefined;
        // 🌟 Lance l'initialisation du header dès la construction, mais n'attend pas ici
        this.initializationPromise = this.ensureInitialized(); 
        
        this.baseUrl = "https://www.fotmob.com/api/";
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                "Accept": "application/json",
                // User-Agent plus pertinent pour une API de sport
                "User-Agent": "FotMob-Android-App/1000.2.148" 
            }
        });

        // L'intercepteur assure que le header 'x-mas' est présent AVANT la requête
        this.axiosInstance.interceptors.request.use(async (config) => {
            // 🌟 Attend la résolution de l'initialisation lancée dans le constructeur
            await this.initializationPromise;
            
            // 🚨 S'assurer que le header est un string valide, même en cas de fallback
            config.headers["x-mas"] = this.xmas || "static-fallback-value";
            return config;
        });
    }

    /**
     * Tente de récupérer le header dynamique x-mas, utilise un fallback en cas d'échec.
     */
    async ensureInitialized() {
        if (this.xmas) return; // Si déjà initialisé
        
        try {
            // Tentative de récupération du header dynamique
            const response = await axios.get("http://46.101.91.154:6006/");
            this.xmas = response.data["x-mas"];
            console.log("⚽ X-MAS Header initialized successfully.");
        } catch (error) {
            // FALLBACK : En cas d'échec (important pour éviter le FUNCTION_INVOCATION_FAILED)
            console.error("❌ Failed to fetch dynamic x-mas header. Using static fallback.", error.message);
            this.xmas = "static-fallback-value"; 
        }
    }

    /**
     * Récupère les données avec gestion du cache et de l'expiration.
     */
    async safeTypeCastFetch(url) {
        const cacheEntry = this.cache.get(url);
        
        // Vérifie le cache et l'expiration
        if (cacheEntry && Date.now() < JSON.parse(cacheEntry).timestamp + CACHE_EXPIRATION_MS) {
            return JSON.parse(JSON.parse(cacheEntry).data);
        }
        
        const response = await this.axiosInstance.get(url);
        
        // Mise en cache des données avec le timestamp pour l'expiration
        const dataToCache = {
            data: JSON.stringify(response.data),
            timestamp: Date.now() 
        };
        this.cache.set(url, JSON.stringify(dataToCache));
        
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
    
    // Vous pouvez laisser les autres méthodes si elles sont utilisées ailleurs, 
    // mais la méthode getTeam a été supprimée selon votre demande de focus sur 'getLeague'.
}

// 🎯 Exportez l'instance unique de la classe pour que les handlers puissent l'utiliser
export const fotmob = new Fotmob();

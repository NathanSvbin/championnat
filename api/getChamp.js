// Fotmob.js (Classe robuste pour Vercel)

import axios from "axios";

class Fotmob {
    constructor() {
        this.cache = new Map();
        this.xmas = undefined;
        this.baseUrl = "https://www.fotmob.com/api/";
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        // L'intercepteur assure que le header 'x-mas' est présent AVANT la requête
        this.axiosInstance.interceptors.request.use(async (config) => {
            if (!this.xmas) {
                await this.ensureInitialized();
            }
            // 🚨 S'assurer que le header est un string valide, même en cas de fallback
            config.headers["x-mas"] = this.xmas || "fallback-header";
            return config;
        });
    }

    async ensureInitialized() {
        if (!this.xmas) {
            try {
                // Tentative de récupération du header dynamique
                const response = await axios.get("http://46.101.91.154:6006/");
                this.xmas = response.data["x-mas"];
                console.log("X-MAS Header initialized successfully.");
            } catch (error) {
                // FALLBACK : En cas d'échec (blocage IP, service non dispo)
                console.error("Failed to fetch dynamic x-mas header. Using static fallback.");
                this.xmas = "static-fallback-value"; 
            }
        }
    }

    async safeTypeCastFetch(url) {
        if (this.cache.has(url)) {
            return JSON.parse(this.cache.get(url));
        }
        
        const response = await this.axiosInstance.get(url);
        this.cache.set(url, JSON.stringify(response.data));
        return response.data;
    }

    async getLeague(id, tab = "overview", type = "league", timeZone = "Europe/London") {
        const url = `leagues?id=${id}&tab=${tab}&type=${type}&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
    
    // Méthode pour récupérer les données de la ligue
    async getLeague(id, tab = "overview", type = "league", timeZone = "Europe/London") {
        const url = `leagues?id=${id}&tab=${tab}&type=${type}&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
}

// 🎯 Exportez l'instance unique de la classe pour que les handlers puissent l'utiliser
export const fotmob = new Fotmob();

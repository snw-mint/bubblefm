/**
 * BubbleFM Configuration
 * 
 * Environment variables and API endpoints. 
 * Managed via Vite's import.meta.env with fallback values.
 */

export const CONFIG = {
  APP_NAME: "BubbleFM",
  
  // Base URL for the app
  BASE_URL: import.meta.env.BASE_URL || "", 
  
  // API Endpoints (loaded from .env via Vite)
  WORKER_API: import.meta.env.VITE_WORKER_API || "https://main.snw-mint.workers.dev",
  WORKER_COUNTER: import.meta.env.VITE_WORKER_COUNTER || "https://counter.snw-mint.workers.dev",
  
  /**
   * Helper function to build Main API URLs
   * @param {string} path - The API route path
   * @returns {string} The full URL
   */
  apiUrl: (path) => {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${CONFIG.WORKER_API}/${cleanPath}`;
  },
  
  /**
   * Helper function to build Counter API URLs
   * @param {string} path - The Counter route path
   * @returns {string} The full URL
   */
  counterUrl: (path) => {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${CONFIG.WORKER_COUNTER}/${cleanPath}`;
  },
};

Object.freeze(CONFIG);

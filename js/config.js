/**
 * BubbleFM Configuration
 * 
 * Environment variables and API endpoints. 
 * Since this is a vanilla JS project without a bundler, we use this module 
 * to handle environment-specific logic (e.g., local development vs production).
 */

const isLocal = window.location.hostname === "localhost" || window.location.hostname.includes("127.0.0.1");

export const CONFIG = {
  APP_NAME: "BubbleFM",
  
  // Replace with the Vercel production URL once deployed
  BASE_URL: isLocal ? "" : "https://bubblefm.vercel.app", 
  
  // API Endpoints
  WORKER_API: "https://main.snw-mint.workers.dev",
  WORKER_COUNTER: "https://counter.snw-mint.workers.dev",
  
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

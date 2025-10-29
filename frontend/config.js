/**
 * LoomLite Frontend Configuration
 * 
 * This file centralizes API endpoint configuration.
 * Change API_BASE to switch between local development and production.
 */

// Detect if running locally (localhost or 127.0.0.1)
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === '';

// API Configuration
const API_BASE = isLocal 
  ? 'http://127.0.0.1:8000'  // Local development
  : 'https://loomlite.onrender.com';  // Production (Render)

// Old Railway URL (deprecated):
// const API_BASE = isLocal 
//   ? 'http://127.0.0.1:8000'
//   : 'https://loomlite-production.up.railway.app';

// Export for use in other modules
const BACKEND_URL = API_BASE;

console.log(`🔗 LoomLite Frontend - API Base: ${API_BASE}`);
console.log(`📍 Environment: ${isLocal ? 'LOCAL DEVELOPMENT' : 'PRODUCTION'}`);

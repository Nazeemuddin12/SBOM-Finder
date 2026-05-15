// ============================================================
// config.js
// SBOM Finder — Environment Configuration
// ============================================================
// Single source of truth for environment-specific constants.
// Import from here (or from api.js which re-exports it) instead
// of scattering the backend URL across the codebase.
//
// For local development: change this to http://localhost:8000
// For production: this points to the Render-hosted backend.
// ============================================================

export const API_BASE_URL = "https://sbom-finder-1.onrender.com";
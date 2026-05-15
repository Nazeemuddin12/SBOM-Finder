// ============================================================
// api.js
// SBOM Finder — Central API Fetch Utility
// ============================================================
// All API calls in the app go through apiFetch() so that:
//   1. The base URL is always prepended automatically
//   2. The Authorization header is added whenever a token exists
//   3. 401 responses are handled globally (clear auth + redirect)
//
// Import apiFetch from this file instead of calling fetch() directly.
// For file uploads (multipart/form-data), use fetch() directly because
// setting Content-Type manually breaks the multipart boundary.
// ============================================================

import { API_BASE_URL } from "./config";

// Re-export so callers can import API_BASE_URL from api.js or config.js interchangeably
export { API_BASE_URL };


/**
 * getToken — reads the stored JWT from localStorage.
 * The token is written here on login and deleted on logout/401.
 * Returns null when the user is not logged in.
 */
export function getToken() {
  return localStorage.getItem("sbom_token");
}


/**
 * apiFetch — authenticated wrapper around the native fetch API.
 *
 * Usage:
 *   const res = await apiFetch("/items");
 *   const data = await res.json();
 *
 * Features:
 *   - Automatically prepends API_BASE_URL so callers only write "/items"
 *   - Injects "Content-Type: application/json" on every request
 *   - Adds "Authorization: Bearer <token>" when a token is in localStorage
 *   - Caller-supplied headers (options.headers) are merged in last so they
 *     can override the defaults (e.g. omit Content-Type for file uploads)
 *   - On 401 (token expired/revoked): clears stored auth and hard-redirects
 *     to /login so the user sees the login page rather than a broken UI
 *
 * @param {string} path       - API path relative to base, e.g. "/items"
 * @param {RequestInit} options - Standard fetch options (method, body, headers, …)
 * @returns {Promise<Response>}  Raw fetch Response — caller handles .json()
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",  // default for all JSON API calls
      // Only attach the Authorization header when a token is present
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Merge caller-supplied headers last so they can override the defaults above
      ...(options.headers || {}),
    },
  });

  // 401 = token is expired or was invalidated server-side.
  // Wipe local auth state and force a hard redirect to login.
  // We use window.location.href instead of navigate() because this utility
  // lives outside React's component tree and can't access the router.
  if (res.status === 401) {
    localStorage.removeItem("sbom_token");
    localStorage.removeItem("sbom_user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  // Return the raw Response — callers decide whether to call .json(), .text(), etc.
  return res;
}
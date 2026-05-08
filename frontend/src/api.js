import { API_BASE_URL } from "./config";

// Re-export so other files can import API_BASE_URL from either api.js or config.js
export { API_BASE_URL };

export function getToken() {
  // JWT is stored in localStorage under this key when the user logs in
  return localStorage.getItem("sbom_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // Attach the Bearer token if the user is logged in — backend rejects requests without it
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Caller can pass extra headers (e.g. for file uploads) and they get merged in here
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expired or invalid — clear stored auth and force the user back to login
    localStorage.removeItem("sbom_token");
    localStorage.removeItem("sbom_user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  return res;
}
import { API_BASE_URL } from "./config";

export function getToken() {
  return localStorage.getItem("sbom_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("sbom_token");
    localStorage.removeItem("sbom_user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return res;
}
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

export const API_URL = (configuredApiUrl || "/api").replace(/\/+$/, "");

export function authHeaders(headers = {}) {
  if (typeof window === "undefined") return headers;
  try {
    const session = JSON.parse(sessionStorage.getItem("taskifyLoggedIn") || "null");
    return session?.token
      ? { ...headers, Authorization: `Bearer ${session.token}` }
      : headers;
  } catch {
    return headers;
  }
}

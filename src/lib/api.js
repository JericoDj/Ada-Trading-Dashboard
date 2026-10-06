// Thin client for the trading backend. Every JEV route needs an admin JWT.
export const API_URL = (import.meta.env.VITE_API_URL || "https://ada-crytotradingbot-production.up.railway.app").replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/, "ws");

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {string} path      e.g. "/api/jev/sessions"
 * @param {object} opts      { token, method, body, allowStatus: [503] }
 */
export async function api(path, { token, method = "GET", body, allowStatus = [] } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok && !allowStatus.includes(res.status)) {
    const msg = data?.message || data?.auth || data?.error || `${res.status} ${res.statusText}`;
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status, data);
  }
  return data;
}

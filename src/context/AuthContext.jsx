import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);
const KEY = "ada.token";

const readToken = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const writeToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(readToken()));

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  // Validate a stored token on load
  useEffect(() => {
    if (!token) { setChecking(false); return; }
    let cancelled = false;
    setChecking(true);
    api("/users/details", { token })
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const res = await api("/users/login", { method: "POST", body: { email, password } });
    const u = await api("/users/details", { token: res.access });
    if (!u.isAdmin) throw new Error("This account isn't an admin — the dashboard needs admin access.");
    writeToken(res.access);
    setToken(res.access);
    setUser(u);
  }, []);

  const value = useMemo(() => ({ token, user, checking, login, logout }), [token, user, checking, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

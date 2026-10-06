import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";

const DataContext = createContext(null);
const SESSIONS_MS = 15_000;
const HEALTH_MS = 30_000;

export function DataProvider({ children }) {
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const call = useCallback(
    async (path, opts = {}) => {
      try {
        return await api(path, { ...opts, token: tokenRef.current });
      } catch (err) {
        if (err.status === 401 || err.status === 403) logout();
        throw err;
      }
    },
    [logout]
  );

  const refreshSessions = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const d = await call("/api/jev/sessions?limit=100");
      setSessions(d.sessions ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [call]);

  const refreshHealth = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      setHealth(await call("/api/jev/health", { allowStatus: [503] }));
    } catch (err) {
      setHealth({ success: false, error: err.message });
    }
  }, [call]);

  useEffect(() => {
    if (!token) { setSessions([]); setHealth(null); return; }
    setLoading(true);
    Promise.all([refreshSessions(), refreshHealth()]).finally(() => setLoading(false));
    const a = setInterval(refreshSessions, SESSIONS_MS);
    const b = setInterval(refreshHealth, HEALTH_MS);
    return () => { clearInterval(a); clearInterval(b); };
  }, [token, refreshSessions, refreshHealth]);

  // ---- actions (each refreshes the list afterwards)
  const after = useCallback(async (p) => { const r = await p; refreshSessions(); refreshHealth(); return r; }, [refreshSessions, refreshHealth]);
  const startSession = useCallback((body) => after(call("/api/jev/loops", { method: "POST", body })), [after, call]);
  const stopSession = useCallback((id, closeOpen = true) => after(call(`/api/jev/sessions/${id}/stop`, { method: "POST", body: { closeOpen } })), [after, call]);
  const resumeSession = useCallback((id, body = {}) => after(call(`/api/jev/sessions/${id}/resume`, { method: "POST", body })), [after, call]);
  const updateSettings = useCallback((id, body) => after(call(`/api/jev/sessions/${id}/settings`, { method: "PATCH", body })), [after, call]);

  const value = useMemo(
    () => ({ sessions, health, error, loading, lastUpdated, call, refreshSessions, refreshHealth, startSession, stopSession, resumeSession, updateSettings }),
    [sessions, health, error, loading, lastUpdated, call, refreshSessions, refreshHealth, startSession, stopSession, resumeSession, updateSettings]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

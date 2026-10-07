import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext.jsx";

// Live trading (Binance USDⓈ-M Futures): status, account and actions. Mounted by the Live page only,
// so Binance isn't polled while you're looking at paper sessions.
const LiveContext = createContext(null);
const POLL_MS = 20_000;

export function LiveProvider({ children }) {
  const { call, sessions, refreshSessions } = useData();
  const [status, setStatus] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [accountError, setAccountError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const s = await call("/api/live/status");
      setStatus(s);
      setError(null);
      if (s.reachable && s.keysConfigured) {
        try {
          setAccount(await call("/api/live/account"));
          setAccountError(null);
        } catch (err) {
          setAccountError(err.message);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [call]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const after = useCallback(async (p) => { const r = await p; refreshSessions(); refresh(); return r; }, [refreshSessions, refresh]);
  const preflight = useCallback((q) => call(`/api/live/preflight?${new URLSearchParams(q)}`), [call]);
  const startLive = useCallback((body) => after(call("/api/live/sessions", { method: "POST", body })), [after, call]);
  const reconcile = useCallback(() => call("/api/live/reconcile"), [call]);
  const kill = useCallback(() => after(call("/api/live/kill", { method: "POST", body: { confirm: "KILL", reason: "kill switch (dashboard)" } })), [after, call]);

  const liveSessions = useMemo(() => sessions.filter((s) => s.mode === "live"), [sessions]);
  const value = useMemo(
    () => ({ status, account, error, accountError, liveSessions, refresh, preflight, startLive, reconcile, kill }),
    [status, account, error, accountError, liveSessions, refresh, preflight, startLive, reconcile, kill]
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

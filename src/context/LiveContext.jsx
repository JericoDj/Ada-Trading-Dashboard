import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext.jsx";

// Demo (testnet) or live (mainnet) trading on Binance USDⓈ-M Futures, for one environment.
// Holds the saved API keys of that environment, the selected one, its status and account, and actions.
// Mounted by the Demo / Live pages only, so Binance isn't polled while you look at internal sessions.
const LiveContext = createContext(null);
const POLL_MS = 20_000;

const storedKey = (env) => {
  try { return localStorage.getItem(`ada.credential.${env}`); } catch { return null; }
};
const storeKey = (env, id) => {
  try { localStorage.setItem(`ada.credential.${env}`, String(id)); } catch { /* storage unavailable */ }
};

export function LiveProvider({ env, children }) {
  const { call, sessions, refreshSessions } = useData();
  const [credentials, setCredentials] = useState(null);
  const [credentialId, setCredentialIdState] = useState(() => storedKey(env));
  const [status, setStatus] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [accountError, setAccountError] = useState(null);

  const keys = useMemo(() => (credentials ?? []).filter((c) => c.environment === env), [credentials, env]);
  const selected = keys.find((c) => String(c.id) === String(credentialId)) ?? keys[0] ?? null;

  const setCredentialId = useCallback((id) => { setCredentialIdState(id); storeKey(env, id); setStatus(null); setAccount(null); }, [env]);

  const loadCredentials = useCallback(async () => {
    try {
      const d = await call("/api/live/credentials");
      setCredentials(d.credentials ?? []);
    } catch (err) {
      setError(err.message);
      setCredentials([]);
    }
  }, [call]);

  const refresh = useCallback(async () => {
    if (!selected) return;
    const q = `credentialId=${encodeURIComponent(selected.id)}`;
    try {
      const s = await call(`/api/live/status?${q}`);
      setStatus(s);
      setError(null);
      if (s.reachable && s.account) {
        try {
          setAccount(await call(`/api/live/account?${q}`));
          setAccountError(null);
        } catch (err) {
          setAccountError(err.message);
        }
      } else {
        setAccount(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [call, selected]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const after = useCallback(async (p) => { const r = await p; refreshSessions(); refresh(); return r; }, [refreshSessions, refresh]);
  const withKey = useCallback((q = {}) => new URLSearchParams({ ...q, credentialId: selected?.id ?? "" }), [selected]);
  const preflight = useCallback((q) => call(`/api/live/preflight?${withKey(q)}`), [call, withKey]);
  const startLive = useCallback((body) => after(call("/api/live/sessions", { method: "POST", body: { ...body, credentialId: selected?.id, environment: env } })), [after, call, selected, env]);
  const reconcile = useCallback(() => call(`/api/live/reconcile?${withKey()}`), [call, withKey]);
  const kill = useCallback(() => after(call("/api/live/kill", { method: "POST", body: { confirm: "KILL", environment: env, reason: `kill switch (${env} page)` } })), [after, call, env]);

  // Sessions of this environment (demo = testnet keys, live = mainnet keys)
  const envSessions = useMemo(() => sessions.filter((s) => s.mode === "live" && (s.exchangeEnv ?? "testnet") === env), [sessions, env]);
  const value = useMemo(
    () => ({ env, credentials, keys, selected, setCredentialId, status, account, error, accountError, envSessions, refresh, loadCredentials, preflight, startLive, reconcile, kill }),
    [env, credentials, keys, selected, setCredentialId, status, account, error, accountError, envSessions, refresh, loadCredentials, preflight, startLive, reconcile, kill]
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

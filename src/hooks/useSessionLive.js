import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Live view of one session over the backend WebSocket:
 *   pnl     — latest P&L (from session_snapshot, then every tick)
 *   price   — latest price
 *   events  — recent non-tick events, newest first
 *   status  — connecting | live | closed | error
 */
export function useSessionLive(sessionId, { maxEvents = 100 } = {}) {
  const { token } = useAuth();
  const [pnl, setPnl] = useState(null);
  const [price, setPrice] = useState(null);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const retry = useRef(0);

  useEffect(() => {
    if (!sessionId || !token) return;
    let ws;
    let closedByUs = false;
    let timer;

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        retry.current = 0;
        ws.send(JSON.stringify({ type: "subscribe_session", sessionId, token }));
      };
      ws.onmessage = (m) => {
        let d;
        try { d = JSON.parse(m.data); } catch { return; }
        if (d.type === "session_snapshot") { setPnl(d.pnl); setPrice(d.pnl?.price ?? null); setStatus("live"); return; }
        if (d.type === "error") { setStatus("error"); return; }
        if (d.type !== "loop_event" || d.sessionId !== sessionId) return;
        if (d.event === "tick") {
          setPrice(d.data.price);
          if (d.data.pnl) setPnl(d.data.pnl);
          setStatus("live");
          return;
        }
        setEvents((prev) => {
          // ignore exact duplicates (e.g. a brief second connection while reconnecting)
          const key = `${d.event}|${d.at}|${JSON.stringify(d.data)}`;
          if (prev.some((p) => p.key === key)) return prev;
          return [{ key, event: d.event, data: d.data, at: d.at }, ...prev].slice(0, maxEvents);
        });
      };
      ws.onclose = () => {
        if (closedByUs) return;
        setStatus("closed");
        const wait = Math.min(1000 * 2 ** retry.current++, 30_000);
        timer = setTimeout(connect, wait);
      };
      ws.onerror = () => setStatus("error");
    };

    connect();
    return () => {
      closedByUs = true;
      clearTimeout(timer);
      try {
        ws?.send(JSON.stringify({ type: "unsubscribe_session", sessionId }));
        ws?.close();
      } catch { /* already closed */ }
    };
  }, [sessionId, token, maxEvents]);

  return { pnl, price, events, status };
}

import { useState } from "react";
import { useData } from "../context/DataContext.jsx";
import { ErrorBox } from "./ui.jsx";

const LEVERAGE = [1, 3, 5, 10, 25, 50, 100];

/** Edit a session's settings (PATCH). Only changed fields are sent. */
export default function SettingsForm({ session, hasPosition, onSaved }) {
  const { updateSettings } = useData();
  const init = {
    targetRR: session.targetRR ?? "",
    trendFilter: session.trendFilter ?? "off",
    minJevProb: session.minJevProb ?? "",
    leverage: session.leverage,
    aggressionMode: session.aggressionMode ?? "rules",
    aggression: session.aggression,
  };
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = {};
    if (String(f.minJevProb) !== String(init.minJevProb)) body.minJevProb = f.minJevProb === "" ? null : Number(f.minJevProb);
    if (f.trendFilter !== init.trendFilter) body.trendFilter = f.trendFilter;
    if (String(f.targetRR) !== String(init.targetRR)) body.targetRR = f.targetRR === "" ? null : Number(f.targetRR);
    if (Number(f.leverage) !== Number(init.leverage)) body.leverage = Number(f.leverage);
    if (f.aggressionMode !== init.aggressionMode) body.aggressionMode = f.aggressionMode;
    if (Number(f.aggression) !== Number(init.aggression)) body.aggression = Number(f.aggression);
    if (!Object.keys(body).length) { setMsg("Nothing changed."); return; }
    setBusy(true); setErr(null); setMsg(null);
    try {
      await updateSettings(session.sessionId, body);
      setMsg("Saved — applies from the next plan or entry.");
      onSaved?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label>Target R:R <small>(blank = auto)</small><input type="number" step="0.1" min="0.8" max="4" value={f.targetRR} onChange={set("targetRR")} placeholder="auto" /></label>
        <label>Min JEV odds % <small>(blank = none)</small><input type="number" step="1" min="0" max="95" value={f.minJevProb} onChange={set("minJevProb")} placeholder="none" /></label>
        <label>Trend filter<select value={f.trendFilter} onChange={set("trendFilter")}>
          <option value="off">off</option><option value="ema50">EMA50 side</option><option value="stack">EMA stack aligned</option>
        </select></label>
        <label>Leverage {hasPosition && <small>(only when flat)</small>}<select value={f.leverage} onChange={set("leverage")} disabled={hasPosition}>{LEVERAGE.map((l) => <option key={l} value={l}>{l}x</option>)}</select></label>
        <label>Aggression control<select value={f.aggressionMode} onChange={set("aggressionMode")}><option value="rules">rules</option><option value="jev">jev</option><option value="fixed">fixed</option></select></label>
        <label>Aggression (0–100)<input type="number" min="0" max="100" value={f.aggression} onChange={set("aggression")} /></label>
      </div>
      <ErrorBox>{err}</ErrorBox>
      {msg && <div className="ok-box">{msg}</div>}
      <div className="form-actions"><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}

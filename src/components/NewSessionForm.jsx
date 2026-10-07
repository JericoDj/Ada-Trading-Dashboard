import { useState } from "react";
import { useData } from "../context/DataContext.jsx";
import { ErrorBox } from "./ui.jsx";

const INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h"];
const LEVERAGE = [1, 3, 5, 10, 25, 50, 100];

export default function NewSessionForm({ onDone }) {
  const { startSession } = useData();
  const [f, setF] = useState({ symbol: "BTCUSDT", interval: "15m", profile: "balanced", leverage: 3, aggressionMode: "rules", targetRR: "", trendFilter: "off", minJevProb: "", startBalance: 1000 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await startSession({
        symbol: f.symbol.trim().toUpperCase(),
        interval: f.interval,
        profile: f.profile,
        leverage: Number(f.leverage),
        aggressionMode: f.aggressionMode,
        startBalance: Number(f.startBalance),
        ...(f.targetRR !== "" ? { targetRR: Number(f.targetRR) } : {}),
        trendFilter: f.trendFilter,
        ...(f.minJevProb !== "" ? { minJevProb: Number(f.minJevProb) } : {}),
      });
      onDone?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label>Symbol<input value={f.symbol} onChange={set("symbol")} placeholder="BTCUSDT" required /></label>
        <label>Interval<select value={f.interval} onChange={set("interval")}>{INTERVALS.map((i) => <option key={i}>{i}</option>)}</select></label>
        <label>Profile<select value={f.profile} onChange={set("profile")}><option>conservative</option><option>balanced</option><option>aggressive</option></select></label>
        <label>Leverage<select value={f.leverage} onChange={set("leverage")}>{LEVERAGE.map((l) => <option key={l} value={l}>{l}x</option>)}</select></label>
        <label>Aggression control<select value={f.aggressionMode} onChange={set("aggressionMode")}><option value="rules">rules (bot adapts)</option><option value="jev">jev (JEV decides)</option><option value="fixed">fixed</option></select></label>
        <label>Target R:R <small>(blank = auto)</small><input type="number" step="0.1" min="0.8" max="4" value={f.targetRR} onChange={set("targetRR")} placeholder="auto" /></label>
        <label>Min JEV odds % <small>(blank = none)</small><input type="number" step="1" min="0" max="95" value={f.minJevProb} onChange={set("minJevProb")} placeholder="none" /></label>
        <label>Trend filter<select value={f.trendFilter} onChange={set("trendFilter")}>
          <option value="off">off</option><option value="ema50">EMA50 side</option><option value="stack">EMA stack aligned</option>
        </select></label>
        <label>Start balance ($)<input type="number" min="10" value={f.startBalance} onChange={set("startBalance")} /></label>
      </div>
      <ErrorBox>{err}</ErrorBox>
      <div className="form-actions">
        {onDone && <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>}
        <button className="btn primary" disabled={busy}>{busy ? "Starting…" : "Start session"}</button>
      </div>
    </form>
  );
}

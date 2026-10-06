import { useState } from "react";
import { useFetch } from "../hooks/useFetch.js";
import { useData } from "../context/DataContext.jsx";
import { Card, Stat, Empty, ErrorBox, Spinner, Badge } from "../components/ui.jsx";
import { ShadowSummary } from "./SessionDetail.jsx";
import { pct } from "../lib/format.js";

export default function Shadows() {
  const { sessions } = useData();
  const symbols = [...new Set(sessions.map((s) => s.symbol))].sort();
  const [symbol, setSymbol] = useState("");
  const q = symbol ? `?symbol=${symbol}` : "";
  const shadows = useFetch(`/api/jev/shadows${q}`, { intervalMs: 60_000 });
  const cal = useFetch(`/api/jev/calibration${q}`, { intervalMs: 60_000 });

  return (
    <div className="page">
      <div className="page-head">
        <h1>Shadows &amp; calibration</h1>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          <option value="">All symbols</option>
          {symbols.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <p className="muted">
        Every time JEV judges a setup, the bot tracks both the long and the short plan against the real price — without trading — until the
        take-profit or the stop is hit. That tells us how accurate JEV is, and calibration uses it to correct JEV's numbers before every entry.
      </p>

      <Card title={<>Calibration {cal.data && <Badge kind={cal.data.active ? "up" : "muted"}>{cal.data.active ? "active" : "not active yet"}</Badge>}</>}>
        {cal.loading && !cal.data ? <Spinner /> : cal.error ? <ErrorBox>{cal.error}</ErrorBox> : (
          <div className="stack">
            <div className="stats-row">
              <Stat label="Real trades" value={cal.data.closedTrades} />
              <Stat label="Shadows" value={cal.data.shadowOutcomes} sub={`each counts ×${cal.data.shadowWeight}`} />
              <Stat label="Effective sample" value={cal.data.effectiveSample} sub={`active at ${cal.data.minTrades}`} />
              <Stat label="JEV predicted vs actual" value={cal.data.overall ? `${pct(cal.data.overall.jevPredictedPct)} → ${pct(cal.data.overall.actualTpPct)}` : "—"} sub={cal.data.overall?.verdict} />
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When JEV says</th>{cal.data.examples.map((e) => <th key={e.jevSays} className="mono">{e.jevSays}%</th>)}</tr></thead>
                <tbody><tr><td>the bot uses</td>{cal.data.examples.map((e) => <td key={e.jevSays} className={`mono ${e.botUses < e.jevSays ? "down" : e.botUses > e.jevSays ? "up" : ""}`}>{e.botUses}%</td>)}</tr></tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {shadows.loading && !shadows.data ? <Spinner /> : shadows.error ? <ErrorBox>{shadows.error}</ErrorBox> : shadows.data?.resolved === 0 && shadows.data?.counts?.open === 0 ? (
        <Empty>No shadows yet — they appear as soon as a session judges a setup.</Empty>
      ) : shadows.data && <ShadowSummary data={shadows.data} />}
    </div>
  );
}

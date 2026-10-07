import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { Card, Stat, StateBadge, SideBadge, Empty, ErrorBox, Badge } from "../components/ui.jsx";
import NewSessionForm from "../components/NewSessionForm.jsx";
import { usd, signedUsd, tone, price, signedPct, shortId, ago } from "../lib/format.js";

export default function Sessions() {
  const { sessions, loading, error, stopSession, resumeSession } = useData();
  const [showForm, setShowForm] = useState(false);
  const [showStopped, setShowStopped] = useState(false);
  const [busy, setBusy] = useState(null);
  const [actionErr, setActionErr] = useState(null);

  const running = sessions.filter((s) => s.status === "RUNNING");
  const visible = showStopped ? sessions : running;
  const featured = visible.filter((s) => s.featured);
  const others = visible.filter((s) => !s.featured);
  const featuredTotals = useMemo(() => {
    const t = { start: 0, equity: 0, wins: 0, losses: 0, open: 0 };
    for (const s of featured) {
      t.start += Number(s.startBalance || 0); t.equity += Number(s.equity ?? s.balance ?? 0);
      t.wins += s.wins; t.losses += s.losses; t.open += s.position ? 1 : 0;
    }
    return t;
  }, [featured]);
  const totals = useMemo(() => {
    const t = { start: 0, equity: 0, realized: 0, ai: 0, open: 0, trades: 0, wins: 0, losses: 0 };
    for (const s of running) {
      t.start += Number(s.startBalance || 0); t.equity += Number(s.equity || 0); t.realized += Number(s.realizedPnl || 0);
      t.ai += Number(s.aiCostUsd || 0); t.open += s.position ? 1 : 0; t.trades += s.trades; t.wins += s.wins; t.losses += s.losses;
    }
    return t;
  }, [running]);

  const renderCard = (s) => {
    const pnlTotal = Number(s.equity ?? s.balance) - Number(s.startBalance ?? 0);
    return (
      <Card key={s.sessionId} className={`session-card ${s.featured ? "is-featured" : ""} ${s.status === "STOPPED" ? "dim" : ""}`}>
        <Link to={`/sessions/${s.sessionId}`} className="session-link">
          <div className="session-top">
            <div>
              <div className="session-symbol">{s.featured && <span className="star" title="featured">★</span>}{s.symbol}</div>
              <div className="muted small">{s.interval} · {s.leverage}x · {s.profile} · R:R {s.targetRR ?? "auto"}{s.trendFilter && s.trendFilter !== "off" ? ` · trend ${s.trendFilter}` : ""}{s.minJevProb != null ? ` · JEV ≥${s.minJevProb}%` : ""} · {shortId(s.sessionId)}</div>
            </div>
            <div className="col-end">
              <StateBadge state={s.state} status={s.status} />
              <SideBadge side={s.side} />
            </div>
          </div>
          <div className="session-numbers">
            <div><div className="stat-label">Equity</div><div className="mono strong">{usd(s.equity)}</div></div>
            <div><div className="stat-label">Total P&L</div><div className={`mono ${tone(pnlTotal)}`}>{signedUsd(pnlTotal)}</div></div>
            <div><div className="stat-label">Trades</div><div className="mono">{s.wins}W/{s.losses}L</div></div>
            <div><div className="stat-label">Aggression</div><div className="mono">{Math.round(s.aggression)} <small className="muted">{s.aggressionMode}</small></div></div>
          </div>
          {s.position && (
            <div className="session-pos">
              <Badge kind={s.position.side === "LONG" ? "up" : "down"}>{s.position.side.toLowerCase()}</Badge>
              <span className="mono">@ {price(s.position.entryPrice)} → {price(s.position.price)}</span>
              <span className={`mono ${tone(s.position.unrealizedPnl)}`}>{signedUsd(s.position.unrealizedPnl)} ({signedPct(s.position.unrealizedRoePct)})</span>
            </div>
          )}
          {!s.position && s.watching && (
            <div className="session-pos muted small">
              Watching a {s.watching.side.toLowerCase()} plan · stop {price(s.watching.stopLoss)} · target {price(s.watching.takeProfit)}
            </div>
          )}
        </Link>
        <div className="session-actions">
          <span className="muted small">started {ago(s.startedAt)} · AI {usd(s.aiCostUsd, 4)}</span>
          {s.status === "RUNNING" ? (
            <button className="btn small ghost" disabled={busy === s.sessionId}
              onClick={() => { if (confirm(`Stop ${s.symbol} (${shortId(s.sessionId)})?${s.position ? " Its open paper position will be closed." : ""}`)) act(s.sessionId, () => stopSession(s.sessionId)); }}>
              Stop
            </button>
          ) : (
            <button className="btn small" disabled={busy === s.sessionId} onClick={() => act(s.sessionId, () => resumeSession(s.sessionId))}>Resume</button>
          )}
        </div>
      </Card>
    );
  };

  const act = async (id, fn) => {
    setBusy(id); setActionErr(null);
    try { await fn(); } catch (e) { setActionErr(e.message); } finally { setBusy(null); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Sessions</h1>
        <div className="row gap">
          <label className="check"><input type="checkbox" checked={showStopped} onChange={(e) => setShowStopped(e.target.checked)} /> show stopped</label>
          <button className="btn primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ New session"}</button>
        </div>
      </div>

      {showForm && <Card title="Start a paper-trading session"><NewSessionForm onDone={() => setShowForm(false)} /></Card>}

      <div className="stats-row">
        <Stat label="Running sessions" value={running.length} sub={`${totals.open} with an open position`} />
        <Stat label="Equity (running)" value={usd(totals.equity)} sub={`started with ${usd(totals.start, 0)}`} tone={tone(totals.equity - totals.start)} />
        <Stat label="Realized P&L" value={signedUsd(totals.realized)} tone={tone(totals.realized)} sub={`${totals.wins}W / ${totals.losses}L`} />
        <Stat label="AI cost" value={usd(totals.ai, 4)} sub="all running sessions" />
      </div>

      <ErrorBox>{error || actionErr}</ErrorBox>
      {loading && !sessions.length && <Empty>Loading sessions…</Empty>}
      {!loading && !visible.length && <Empty>No sessions yet — start one above.</Empty>}

      {featured.length > 0 && (
        <section className="featured">
          <div className="featured-head">
            <h2>★ Featured sessions</h2>
            <span className="muted small">
              {featured.length} sessions · equity {usd(featuredTotals.equity)} of {usd(featuredTotals.start, 0)} ·{" "}
              <span className={tone(featuredTotals.equity - featuredTotals.start)}>{signedUsd(featuredTotals.equity - featuredTotals.start)}</span> ·{" "}
              {featuredTotals.wins}W/{featuredTotals.losses}L · {featuredTotals.open} open
            </span>
          </div>
          <div className="session-grid">{featured.map(renderCard)}</div>
        </section>
      )}
      {featured.length > 0 && others.length > 0 && <h2 className="section-title">Other sessions</h2>}

      <div className="session-grid">
        {others.map(renderCard)}
      </div>
    </div>
  );
}

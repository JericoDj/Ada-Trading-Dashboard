import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { LiveProvider, useLive } from "../context/LiveContext.jsx";
import { Card, Stat, Badge, StateBadge, SideBadge, Empty, ErrorBox, Spinner } from "../components/ui.jsx";
import { usd, signedUsd, tone, price, num, shortId, ago } from "../lib/format.js";

const INTERVALS = ["5m", "15m", "30m", "1h"];

export default function Live() {
  return (
    <LiveProvider>
      <LivePage />
    </LiveProvider>
  );
}

function EnvBadge({ env }) {
  if (!env) return null;
  return <span className={`env-badge ${env}`}>{env === "mainnet" ? "MAINNET · real money" : "TESTNET · fake money"}</span>;
}

function LivePage() {
  const { status, error } = useLive();
  return (
    <div className="page">
      <div className="page-head">
        <h1>Live trading <EnvBadge env={status?.environment} /></h1>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {!status && !error && <div className="center"><Spinner /></div>}
      {status && (
        <>
          <StatusCard />
          <LiveSessions />
          <AccountCard />
          <div className="grid-2">
            <StartLiveCard />
            <SafetyCard />
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard() {
  const { status: s } = useLive();
  const a = s.account;
  return (
    <>
      <div className="stats-row">
        <Stat label="Status" value={s.ready ? "Ready" : "Not ready"} tone={s.ready ? "up" : "down"} sub={s.enabled ? "live trading enabled" : "LIVE_TRADING_ENABLED is off"} />
        <Stat label="USDT available" value={a ? usd(a.usdtAvailable) : "—"} sub={a ? `wallet ${usd(a.usdtWallet)}` : "no account access"} />
        <Stat label="Unrealized P&L" value={a ? signedUsd(a.unrealizedPnl) : "—"} tone={tone(a?.unrealizedPnl)} sub={`${s.runningSessions} live session(s) running`} />
        <Stat label="Realized today" value={signedUsd(s.realizedTodayUsd)} tone={tone(s.realizedTodayUsd)} sub={`daily limit −${usd(s.limits.dailyLossUsd, 0)}`} />
      </div>
      {s.problems.length > 0 && (
        <div className="error-box">
          <b>Fix before trading live:</b>
          <ul>{s.problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
    </>
  );
}

function LiveSessions() {
  const { liveSessions } = useLive();
  const { stopSession, resumeSession } = useData();
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const act = async (id, fn) => { setBusy(id); setErr(null); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(null); } };
  return (
    <Card title="Live sessions">
      <ErrorBox>{err}</ErrorBox>
      {!liveSessions.length && <Empty>No live sessions yet. Check the coin with the preflight below, then start one.</Empty>}
      <div className="session-grid">
        {liveSessions.map((s) => {
          const total = Number(s.equity ?? s.balance) - Number(s.startBalance ?? 0);
          return (
            <Card key={s.sessionId} className={`session-card live-card ${s.status === "STOPPED" ? "dim" : ""}`}>
              <Link to={`/sessions/${s.sessionId}`} className="session-link">
                <div className="session-top">
                  <div>
                    <div className="session-symbol">{s.symbol} <EnvBadge env={s.exchangeEnv} /></div>
                    <div className="muted small">{s.interval} · {s.leverage}x · {s.profile}{s.minJevProb != null ? ` · JEV ≥${s.minJevProb}%` : ""} · {shortId(s.sessionId)}</div>
                  </div>
                  <div className="col-end"><StateBadge state={s.state} status={s.status} /><SideBadge side={s.side} /></div>
                </div>
                <div className="session-numbers">
                  <div><div className="stat-label">Allocated</div><div className="mono">{usd(s.startBalance)}</div></div>
                  <div><div className="stat-label">Equity</div><div className="mono strong">{usd(s.equity ?? s.balance)}</div></div>
                  <div><div className="stat-label">Total P&L</div><div className={`mono ${tone(total)}`}>{signedUsd(total)}</div></div>
                  <div><div className="stat-label">Trades</div><div className="mono">{s.wins}W/{s.losses}L</div></div>
                </div>
                {s.position && (
                  <div className="session-pos">
                    <Badge kind={s.position.side === "LONG" ? "up" : "down"}>{s.position.side.toLowerCase()}</Badge>
                    <span className="mono">@ {price(s.position.entryPrice)} · stop {price(s.position.stopLoss)} · target {price(s.position.takeProfit)}</span>
                    <span className={`mono ${tone(s.position.unrealizedPnl)}`}>{signedUsd(s.position.unrealizedPnl)}</span>
                  </div>
                )}
              </Link>
              <div className="session-actions">
                <span className="muted small">started {ago(s.startedAt)}</span>
                {s.status === "RUNNING" ? (
                  <button className="btn small ghost" disabled={busy === s.sessionId}
                    onClick={() => { if (confirm(`Stop live ${s.symbol}?${s.position ? " Its position will be CLOSED ON BINANCE at market." : ""}`)) act(s.sessionId, () => stopSession(s.sessionId)); }}>Stop</button>
                ) : (
                  <button className="btn small" disabled={busy === s.sessionId} onClick={() => act(s.sessionId, () => resumeSession(s.sessionId))}>Resume</button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

function AccountCard() {
  const { account, accountError } = useLive();
  return (
    <Card title="Binance account">
      <ErrorBox>{accountError}</ErrorBox>
      {!account && !accountError && <Empty>No account access yet (API keys not set or not valid).</Empty>}
      {account && (
        <>
          <h4 className="muted small">Positions</h4>
          {!account.positions.length ? <Empty>No open positions on Binance.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Mark</th><th>Liq.</th><th>Unrealized</th></tr></thead>
              <tbody>{account.positions.map((p) => (
                <tr key={p.symbol}><td>{p.symbol}</td><td><SideBadge side={p.side} /></td><td className="mono">{num(p.quantity, 6)}</td><td className="mono">{price(p.entryPrice)}</td>
                  <td className="mono">{price(p.markPrice)}</td><td className="mono">{price(p.liquidationPrice)}</td><td className={`mono ${tone(p.unrealizedPnl)}`}>{signedUsd(p.unrealizedPnl)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
          <h4 className="muted small">Stop-loss / take-profit orders on Binance</h4>
          {!account.protectiveOrders.length ? <Empty>None.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Symbol</th><th>Type</th><th>Side</th><th>Trigger</th><th>Status</th></tr></thead>
              <tbody>{account.protectiveOrders.map((o) => (
                <tr key={o.algoId}><td>{o.symbol}</td><td>{o.type === "STOP_MARKET" ? "stop-loss" : o.type === "TAKE_PROFIT_MARKET" ? "take-profit" : o.type}</td><td>{o.side}</td><td className="mono">{price(o.triggerPrice)}</td><td>{o.status}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}
    </Card>
  );
}

function StartLiveCard() {
  const { status, preflight, startLive } = useLive();
  const max = status.limits;
  const mainnet = status.environment === "mainnet";
  const levels = [1, 2, 3, 5, 10, 20].filter((l) => l <= max.maxLeverage);
  const [f, setF] = useState({ symbol: "ETHUSDT", interval: "15m", profile: "balanced", leverage: Math.min(3, max.maxLeverage), budget: 50, targetRR: 1.5, minJevProb: 40 });
  const [pre, setPre] = useState(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPre(null); setDone(null); };

  const check = async () => {
    setBusy(true); setErr(null);
    try { setPre(await preflight({ symbol: f.symbol.trim().toUpperCase(), budget: f.budget, leverage: f.leverage, profile: f.profile })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const start = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await startLive({
        symbol: f.symbol.trim().toUpperCase(), interval: f.interval, profile: f.profile, leverage: Number(f.leverage),
        startBalance: Number(f.budget), targetRR: f.targetRR === "" ? undefined : Number(f.targetRR),
        minJevProb: f.minJevProb === "" ? null : Number(f.minJevProb), aggressionMode: "rules",
        ...(mainnet ? { confirm: "REAL_MONEY" } : {}),
      });
      setDone(r.loop?.sessionId);
      setTyped("");
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  const canStart = status.ready && pre?.feasible && (!mainnet || typed === "REAL MONEY");

  return (
    <Card title="Start a live session">
      <form className="form" onSubmit={start}>
        <div className="form-grid">
          <label>Symbol<input value={f.symbol} onChange={set("symbol")} required /></label>
          <label>Interval<select value={f.interval} onChange={set("interval")}>{INTERVALS.map((i) => <option key={i}>{i}</option>)}</select></label>
          <label>Profile<select value={f.profile} onChange={set("profile")}><option>conservative</option><option>balanced</option></select></label>
          <label>Leverage <small>(max {max.maxLeverage}x)</small><select value={f.leverage} onChange={set("leverage")}>{levels.map((l) => <option key={l} value={l}>{l}x</option>)}</select></label>
          <label>Budget USDT <small>(max {max.maxBudgetUsdPerSession})</small><input type="number" min="1" max={max.maxBudgetUsdPerSession} value={f.budget} onChange={set("budget")} required /></label>
          <label>Target R:R<input type="number" step="0.1" min="0.8" max="4" value={f.targetRR} onChange={set("targetRR")} /></label>
          <label>Min JEV odds %<input type="number" min="0" max="95" value={f.minJevProb} onChange={set("minJevProb")} /></label>
        </div>

        <div className="row gap">
          <button type="button" className="btn" onClick={check} disabled={busy}>1. Check with Binance</button>
          {pre && <Badge kind={pre.feasible ? "up" : "down"}>{pre.feasible ? "tradable" : "too small"}</Badge>}
        </div>
        {pre && (
          <div className="kv">
            <span>Binance minimum order</span><b>{usd(pre.binanceRules.minOrderUsd)}</b>
            <span>Typical position</span><b>{usd(pre.typicalPositionUsd)}</b>
            <span>Loss if a ~1% stop is hit</span><b className="down">−{usd(pre.lossAtStopUsd)}</b>
            <span>Smallest workable budget</span><b>{usd(pre.minimumBudgetUsd)}</b>
            <span>Price</span><b>{price(pre.price)}</b>
          </div>
        )}
        {pre && <p className={`small ${pre.feasible ? "muted" : "down"}`}>{pre.note}</p>}

        {mainnet && pre?.feasible && (
          <label className="danger-text">Type <b>REAL MONEY</b> to confirm this trades your real Binance funds
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="REAL MONEY" />
          </label>
        )}
        <ErrorBox>{err}</ErrorBox>
        {done && <p className="up small">Started — <Link to={`/sessions/${done}`}>open session {shortId(done)}</Link></p>}
        <div className="form-actions">
          <button className={`btn ${mainnet ? "danger" : "primary"}`} disabled={!canStart || busy}>
            {busy ? "Working…" : `2. Start live session on ${status.environment}`}
          </button>
        </div>
        {!status.ready && <p className="small muted">Starting is disabled until the problems above are fixed.</p>}
      </form>
    </Card>
  );
}

function SafetyCard() {
  const { status, reconcile, kill } = useLive();
  const [rec, setRec] = useState(null);
  const [killed, setKilled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const l = status.limits;
  const run = async (fn, setter) => { setBusy(true); setErr(null); try { setter(await fn()); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <Card title="Safety">
      <div className="kv">
        <span>Max live sessions</span><b>{l.maxSessions}</b>
        <span>Max leverage</span><b>{l.maxLeverage}x</b>
        <span>Max budget per session</span><b>{usd(l.maxBudgetUsdPerSession, 0)}</b>
        <span>Max position per trade</span><b>{usd(l.maxNotionalUsdPerTrade, 0)}</b>
        <span>Daily loss limit (all live)</span><b>{usd(l.dailyLossUsd, 0)}</b>
        <span>Stops</span><b>on Binance (work if the bot is down)</b>
      </div>
      <div className="row gap">
        <button className="btn" disabled={busy} onClick={() => run(reconcile, setRec)}>Reconcile with Binance</button>
        {rec && <Badge kind={rec.ok ? "up" : "warn"}>{rec.ok ? "all matches" : `${rec.issues.length} issue(s)`}</Badge>}
      </div>
      {rec && !rec.ok && <ul className="small">{rec.issues.map((i) => <li key={i}>{i}</li>)}</ul>}

      <div className="danger-zone">
        <b>Kill switch</b>
        <p className="small muted">Stops every live session, closes their positions at market on Binance and cancels their orders.</p>
        <button className="btn danger" disabled={busy}
          onClick={() => { if (prompt('Type KILL to stop all live trading and close positions') === "KILL") run(kill, setKilled); }}>
          Stop all live trading
        </button>
        {killed && <p className="small">{killed.stopped.length} session(s) stopped{killed.leftovers.length ? `, ${killed.leftovers.length} leftover position(s) closed` : ""}{killed.errors.length ? ` — errors: ${killed.errors.join("; ")}` : ""}</p>}
      </div>
      <ErrorBox>{err}</ErrorBox>
    </Card>
  );
}

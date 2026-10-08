import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { LiveProvider, useLive } from "../context/LiveContext.jsx";
import { Card, Stat, Badge, StateBadge, SideBadge, Empty, ErrorBox, Spinner } from "../components/ui.jsx";
import { usd, signedUsd, signedPct, tone, price, num, shortId, ago, time } from "../lib/format.js";

const INTERVALS = ["5m", "15m", "30m", "1h"];

const COPY = {
  testnet: { title: "Demo sessions", blurb: "Binance Demo Trading (testnet) — fake money, real exchange behaviour." },
  mainnet: { title: "Live sessions", blurb: "Binance USDⓈ-M Futures with real money." },
};

/** Demo (env="testnet") or Live (env="mainnet") trading page. */
export default function Live({ env = "testnet" }) {
  return (
    <LiveProvider env={env} key={env}>
      <LivePage />
    </LiveProvider>
  );
}

function EnvBadge({ env }) {
  if (!env) return null;
  return <span className={`env-badge ${env}`}>{env === "mainnet" ? "MAINNET · real money" : "TESTNET · fake money"}</span>;
}

function KeyPicker() {
  const { keys, selected, setCredentialId, env } = useLive();
  if (!keys.length) return null;
  return (
    <label className="key-picker">API key
      <select value={selected?.id ?? ""} onChange={(e) => setCredentialId(e.target.value)}>
        {keys.map((k) => <option key={k.id} value={k.id}>{k.name} ({k.keyHint})</option>)}
      </select>
      <Link to="/keys" className="small">manage</Link>
      {env === "mainnet" && <span className="small down">real money</span>}
    </label>
  );
}

function LivePage() {
  const { env, credentials, keys, status, error } = useLive();
  const copy = COPY[env];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{copy.title} <EnvBadge env={env} /></h1>
          <p className="muted small">{copy.blurb}</p>
        </div>
        <KeyPicker />
      </div>
      <ErrorBox>{error}</ErrorBox>
      {credentials == null && <div className="center"><Spinner /></div>}
      {credentials != null && !keys.length && (
        <Card title={`No ${env === "testnet" ? "demo" : "live"} API key yet`}>
          <p className="muted">
            {env === "testnet"
              ? "Create a key on Binance Demo Trading (demo.binance.com → API Management, HMAC) and save it here as a demo key."
              : "Save a real-account Binance API key (Futures enabled, withdrawals disabled, IP-restricted) as a live key."}
          </p>
          <Link className="btn primary" to="/keys">Add an API key</Link>
        </Card>
      )}
      {keys.length > 0 && !status && !error && <div className="center"><Spinner /></div>}
      {keys.length > 0 && status && (
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
  const { status: s, selected, account } = useLive();
  const a = s.account;
  return (
    <>
      <div className="stats-row">
        <Stat label={`Status · ${selected?.name ?? ""}`} value={s.ready ? "Ready" : "Not ready"} tone={s.ready ? "up" : "down"} sub={s.enabled ? `key ${selected?.keyHint ?? ""}` : "LIVE_TRADING_ENABLED is off"} />
        <Stat label="USDT available" value={a ? usd(a.usdtAvailable) : "—"} sub={a ? `wallet ${usd(a.usdtWallet)}` : "no account access"} />
        <Stat label="Unrealized P&L" value={account ? signedUsd(account.usdt.unrealizedPnl) : "—"} tone={tone(account?.usdt.unrealizedPnl)} sub={`${s.runningSessions} session(s) running on this key`} />
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
  const { envSessions: liveSessions, env } = useLive();
  const { stopSession, resumeSession, health } = useData();
  // Sessions marked RUNNING that the server couldn't start (e.g. Binance refused something) — from /api/jev/health
  const stuck = Object.fromEntries((health?.failing ?? []).map((f) => [f.sessionId, f]));
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const act = async (id, fn) => { setBusy(id); setErr(null); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(null); } };
  return (
    <Card title={env === "testnet" ? "Demo sessions" : "Live sessions"}>
      <ErrorBox>{err}</ErrorBox>
      {!liveSessions.length && <Empty>No {env === "testnet" ? "demo" : "live"} sessions yet. Check the coin with Binance below, then start one.</Empty>}
      <div className="session-grid">
        {liveSessions.map((s) => {
          const total = Number(s.equity ?? s.balance) - Number(s.startBalance ?? 0);
          return (
            <Card key={s.sessionId} className={`session-card live-card ${s.status === "STOPPED" ? "dim" : ""}`}>
              <Link to={`/sessions/${s.sessionId}`} className="session-link">
                <div className="session-top">
                  <div>
                    <div className="session-symbol">{s.symbol}</div>
                    <div className="muted small">key <b>{s.credentialName ?? "—"}</b> · {s.interval} · {s.leverage}x · {s.profile}{s.minJevProb != null ? ` · JEV ≥${s.minJevProb}%` : ""} · {shortId(s.sessionId)}</div>
                  </div>
                  <div className="col-end"><StateBadge state={s.state} status={s.status} /><SideBadge side={s.side} /></div>
                </div>
                <div className="session-numbers">
                  <div><div className="stat-label">Allocated</div><div className="mono">{usd(s.startBalance)}</div></div>
                  <div><div className="stat-label">Equity</div><div className="mono strong">{usd(s.equity ?? s.balance)}</div></div>
                  <div><div className="stat-label">Total P&L</div><div className={`mono ${tone(total)}`}>{signedUsd(total)}</div></div>
                  <div><div className="stat-label">Trades</div><div className="mono">{s.wins}W/{s.losses}L</div></div>
                </div>
                {stuck[s.sessionId] && (
                  <div className="error-box small">
                    Not running on the server — {stuck[s.sessionId].lastError}. Retrying automatically ({stuck[s.sessionId].attempts} attempts, next at {time(stuck[s.sessionId].nextRetryAt)}).
                    {s.position && " The position stays protected by its stop/target orders on Binance."}
                  </div>
                )}
                {s.position && (
                  <>
                    <div className="session-pos">
                      <Badge kind={s.position.side === "LONG" ? "up" : "down"}>{s.position.side.toLowerCase()}</Badge>
                      <span className="mono">@ {price(s.position.entryPrice)} → {s.position.price != null ? price(s.position.price) : "…"}</span>
                      <span className={`mono ${tone(s.position.unrealizedPnl)}`}>
                        {s.position.unrealizedPnl != null ? `${signedUsd(s.position.unrealizedPnl)} (${signedPct(s.position.unrealizedRoePct)})` : "waiting for price"}
                      </span>
                    </div>
                    <div className="muted small mono">stop {price(s.position.stopLoss)} · target {price(s.position.takeProfit)} · liq. {price(s.position.liquidationPrice)}</div>
                  </>
                )}
                {!s.position && s.watching && (
                  <div className="session-pos muted small">
                    Watching a {s.watching.side.toLowerCase()} plan · stop {price(s.watching.stopLoss)} · target {price(s.watching.takeProfit)}
                  </div>
                )}
              </Link>
              <div className="session-actions">
                <span className="muted small">started {ago(s.startedAt)}</span>
                {s.status === "RUNNING" ? (
                  <button className="btn small ghost" disabled={busy === s.sessionId}
                    onClick={() => { if (confirm(`Stop ${env === "testnet" ? "demo" : "LIVE"} ${s.symbol}?${s.position ? " Its position will be CLOSED ON BINANCE at market." : ""}`)) act(s.sessionId, () => stopSession(s.sessionId)); }}>Stop</button>
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
  const { account, accountError, env } = useLive();
  return (
    <Card title={`Binance ${env === "testnet" ? "demo" : "live"} account`}>
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
  const { status, preflight, startLive, selected, env } = useLive();
  const max = status.limits;
  const mainnet = env === "mainnet";
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
    <Card title={`Start a ${mainnet ? "live" : "demo"} session on “${selected?.name ?? ""}”`}>
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
            {busy ? "Working…" : `2. Start ${mainnet ? "LIVE (real money)" : "demo"} session`}
          </button>
        </div>
        {!status.ready && <p className="small muted">Starting is disabled until the problems above are fixed.</p>}
      </form>
    </Card>
  );
}

function SafetyCard() {
  const { status, reconcile, kill, env } = useLive();
  const [rec, setRec] = useState(null);
  const [killed, setKilled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const l = status.limits;
  const run = async (fn, setter) => { setBusy(true); setErr(null); try { setter(await fn()); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <Card title="Safety">
      <div className="kv">
        <span>Max sessions per key</span><b>{l.maxSessions}</b>
        <span>Max leverage</span><b>{l.maxLeverage}x</b>
        <span>Max budget per session</span><b>{usd(l.maxBudgetUsdPerSession, 0)}</b>
        <span>Max position per trade</span><b>{usd(l.maxNotionalUsdPerTrade, 0)}</b>
        <span>Daily loss limit ({env === "testnet" ? "all demo" : "all live"})</span><b>{usd(l.dailyLossUsd, 0)}</b>
        <span>Stops</span><b>on Binance (work if the bot is down)</b>
      </div>
      <div className="row gap">
        <button className="btn" disabled={busy} onClick={() => run(reconcile, setRec)}>Reconcile with Binance</button>
        {rec && <Badge kind={rec.ok ? "up" : "warn"}>{rec.ok ? "all matches" : `${rec.issues.length} issue(s)`}</Badge>}
      </div>
      {rec && !rec.ok && <ul className="small">{rec.issues.map((i) => <li key={i}>{i}</li>)}</ul>}

      <div className="danger-zone">
        <b>Kill switch</b>
        <p className="small muted">Stops every {env === "testnet" ? "demo" : "live"} session, closes their positions at market on Binance and cancels their orders.</p>
        <button className="btn danger" disabled={busy}
          onClick={() => { if (prompt(`Type KILL to stop all ${env === "testnet" ? "demo" : "LIVE"} sessions and close their positions`) === "KILL") run(kill, setKilled); }}>
          Stop all {env === "testnet" ? "demo" : "live"} sessions
        </button>
        {killed && <p className="small">{killed.stopped.length} session(s) stopped{killed.leftovers.length ? `, ${killed.leftovers.length} leftover position(s) closed` : ""}{killed.errors.length ? ` — errors: ${killed.errors.join("; ")}` : ""}</p>}
      </div>
      <ErrorBox>{err}</ErrorBox>
    </Card>
  );
}

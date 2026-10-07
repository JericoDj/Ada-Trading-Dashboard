import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useSessionLive } from "../hooks/useSessionLive.js";
import { Card, Stat, StateBadge, Badge, Tabs, Empty, ErrorBox, Spinner } from "../components/ui.jsx";
import PositionCard from "../components/PositionCard.jsx";
import EventFeed from "../components/EventFeed.jsx";
import SettingsForm from "../components/SettingsForm.jsx";
import Bars from "../components/Bars.jsx";
import { usd, signedUsd, tone, pct, price, dateTime, duration, num, shortId, ago } from "../lib/format.js";

export default function SessionDetail() {
  const { id } = useParams();
  const { stopSession, resumeSession } = useData();
  const detail = useFetch(`/api/jev/sessions/${id}`, { intervalMs: 20_000 });
  const live = useSessionLive(id);

  if (detail.loading && !detail.data) return <div className="center"><Spinner /></div>;
  if (detail.error) return <div className="page"><ErrorBox>{detail.error}</ErrorBox><Link to="/">← back</Link></div>;
  const { session, live: status, pnl: pnlSnap, aiCost } = detail.data;
  const pnl = live.pnl ?? pnlSnap;
  const running = session.status === "RUNNING";

  return (
    <div className="page">
      <Link to="/" className="muted small">← all sessions</Link>
      <div className="page-head">
        <h1>
          {session.symbol} <span className="muted">{session.interval} · {session.leverage}x</span>
        </h1>
        <div className="row gap">
          <StateBadge state={status?.state ?? session.state} status={session.status} />
          <Badge kind={live.status === "live" ? "up" : "muted"}>{live.status === "live" ? "● live" : live.status}</Badge>
          {running ? (
            <button className="btn small ghost" onClick={() => confirm("Stop this session?") && stopSession(id).then(detail.reload)}>Stop</button>
          ) : (
            <button className="btn small" onClick={() => resumeSession(id).then(detail.reload)}>Resume</button>
          )}
        </div>
      </div>
      <div className="muted small">
        Session {shortId(session.sessionId)} · {session.profile} · aggression {Math.round(session.aggression)} ({session.aggressionMode}) · target R:R {session.targetRR ?? "auto"} · trend filter {session.trendFilter ?? "off"} · min JEV odds {session.minJevProb != null ? `${session.minJevProb}%` : "none"} · started {dateTime(session.startedAt)}
      </div>

      <div className="stats-row">
        <Stat label="Equity" value={usd(pnl?.equity)} sub={`balance ${usd(pnl?.balance)}`} tone={tone((pnl?.equity ?? 0) - (pnl?.startBalance ?? 0))} />
        <Stat label="Total P&L" value={signedUsd(pnl?.totalPnl)} tone={tone(pnl?.totalPnl)} sub={pnl?.totalPnlPct != null ? `${pnl.totalPnlPct > 0 ? "+" : ""}${pnl.totalPnlPct}% of start` : ""} />
        <Stat label="Realized" value={signedUsd(pnl?.realizedPnl)} tone={tone(pnl?.realizedPnl)} sub={`${pnl?.wins ?? 0}W / ${pnl?.losses ?? 0}L · win rate ${pct(pnl?.winRatePct)}`} />
        <Stat label="Price" value={price(live.price ?? pnl?.price)} sub={`fees ${usd(pnl?.fees)} · funding ${signedUsd(pnl?.funding, 4)}`} />
        <Stat label="AI cost" value={usd(aiCost?.totalCostUsd, 4)} sub={`${aiCost?.calls ?? 0} calls · ~${usd(aiCost?.projectedPer24hUsd, 3)}/day`} />
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview", render: () => <Overview status={status} pnl={pnl} live={live} session={session} reload={detail.reload} /> },
          { key: "review", label: "Trades & review", render: () => <Review id={id} /> },
          { key: "shadows", label: "Shadows", render: () => <SessionShadows id={id} /> },
          { key: "events", label: "History", render: () => <History id={id} /> },
        ]}
      />
    </div>
  );
}

function Overview({ status, pnl, live, session, reload }) {
  const plan = status?.plan;
  const cs = status?.conditionStatus;
  const ind = status?.indicators;
  return (
    <div className="two-col">
      <div className="stack">
        {pnl?.openTrade ? <PositionCard trade={pnl.openTrade} livePrice={live.price} /> : (
          <Card title="Position"><Empty>No open position — {status ? `the session is ${status.state.toLowerCase().replace("_", " ")}` : "session not running"}.</Empty></Card>
        )}
        {plan && (
          <Card title={<>Watched plan #{plan.planNo} <Badge kind={plan.direction === "LONG" ? "up" : "down"}>{plan.direction.toLowerCase()}</Badge></>}>
            <div className="grid-stats">
              <div><div className="stat-label">Entry zone</div><div className="mono">{price(plan.entryZoneLow)} – {price(plan.entryZoneHigh)}</div></div>
              <div><div className="stat-label">Stop</div><div className="mono down">{price(plan.stopLoss)}</div></div>
              <div><div className="stat-label">Target</div><div className="mono up">{price(plan.takeProfit)}</div></div>
              <div><div className="stat-label">JEV confidence</div><div className="mono">{pct(plan.confidence)}</div></div>
            </div>
            {cs && (
              <ul className="checks">
                <li className={cs.in_entry_zone ? "ok" : "no"}>price {cs.in_entry_zone ? "inside" : "outside"} the entry zone</li>
                {(cs.entry_conditions || []).map((c, i) => (
                  <li key={i} className={c.met ? "ok" : "no"}>{c.description || `${c.indicator} ${c.op} ${c.ref ?? c.value}`} <span className="muted mono">({num(c.actual, 4)} vs {num(c.target, 4)})</span></li>
                ))}
                {cs.invalidated && <li className="no">plan invalidated</li>}
              </ul>
            )}
            <div className="muted small">Next JEV check {status?.nextCheckAt ? ago(status.nextCheckAt).replace(" ago", "") : "—"}{status?.nextCheckAt && new Date(status.nextCheckAt) > new Date() ? " from now" : ""}</div>
          </Card>
        )}
        <Card title="Live activity">
          <EventFeed events={live.events} empty="Waiting for events… (decisions, plans, trades and shadows appear here as they happen)" />
        </Card>
      </div>
      <div className="stack">
        <Card title="Settings"><SettingsForm session={session} hasPosition={Boolean(pnl?.openTrade)} onSaved={reload} /></Card>
        {status?.personality && (
          <Card title="Personality right now">
            <div className="kv">
              <span>Band</span><b>{status.personality.band}</b>
              <span>Min expected value</span><b>{status.personality.minExpectedR}R</b>
              <span>Min reward:risk</span><b>{status.personality.minRewardRisk}</b>
              <span>Margin per trade</span><b>{status.personality.marginPct}%</b>
              <span>Max loss at stop</span><b>{status.personality.maxLossPct}% of balance</b>
              <span>Adjustments</span><b>{status.personality.adjustments}</b>
            </div>
          </Card>
        )}
        {ind && (
          <Card title="Indicators">
            <div className="kv">
              {["rsi14", "ema20", "ema50", "ema200", "macd_histogram", "atr_pct", "volume_ratio", "support", "resistance"].map((k) => (
                <Fragment key={k}><span>{k}</span><b className="mono">{num(ind[k], 5)}</b></Fragment>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Review({ id }) {
  const { data, error, loading } = useFetch(`/api/jev/sessions/${id}/review?minTrades=3`, { intervalMs: 60_000 });
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const s = data.summary;
  return (
    <div className="stack">
      <div className="stats-row">
        <Stat label="Closed trades" value={s.closed} sub={`${s.wins}W / ${s.losses}L · ${s.open} open`} />
        <Stat label="Realized" value={signedUsd(s.realizedPnl)} tone={tone(s.realizedPnl)} />
        <Stat label="Confidence on winners" value={pct(s.confidence.avgOnWinners)} sub={`losers ${pct(s.confidence.avgOnLosers)}`} />
        <Stat label="Skill score" value={s.confidence.skillScore ?? "—"} sub="> 0 means JEV beats guessing the average" />
      </div>
      {data.lessons?.length > 0 && (
        <Card title="Lessons"><ul className="lessons">{data.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul></Card>
      )}
      {data.shadows && (
        <Card title="Plans this session judged (shadows)">
          <div className="grid-stats">
            <div><div className="stat-label">Resolved</div><div className="mono">{data.shadows.resolved}</div></div>
            <div><div className="stat-label">Hit take-profit first</div><div className="mono">{pct(data.shadows.tpFirstPct)}</div></div>
            <div><div className="stat-label">JEV predicted</div><div className="mono">{pct(data.shadows.jevPredictedPct)}</div></div>
            <div><div className="stat-label">Leaned side vs other</div><div className="mono">{pct(data.shadows.chosenSide?.tpFirstPct)} vs {pct(data.shadows.otherSide?.tpFirstPct)}</div></div>
          </div>
        </Card>
      )}
      <Card title="Trades">
        {!data.trades.length ? <Empty>No trades yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Opened</th><th>Side</th><th>Entry → exit</th><th>JEV odds</th><th>Setup</th><th>Result</th><th>P&L</th><th>Verdict</th></tr></thead>
              <tbody>
                {data.trades.map((t) => (
                  <tr key={t.tradeId}>
                    <td className="mono small">{dateTime(t.entryTime)}<div className="muted">{duration(t.durationMinutes)}</div></td>
                    <td><Badge kind={t.direction === "LONG" ? "up" : "down"}>{t.direction.toLowerCase()}</Badge></td>
                    <td className="mono small">{price(t.entryPrice)} → {t.exitPrice ? price(t.exitPrice) : "open"}</td>
                    <td className="mono">{pct(t.jev.rawConfidence, 0)}{t.jev.calibrated && <div className="muted small">bot used {pct(t.jev.confidence, 0)}</div>}</td>
                    <td className="small">{(t.jev.tags || []).join(", ") || "—"}<details><summary className="muted">why</summary><ul className="small">{(t.jev.reasons || []).map((r, i) => <li key={i}>{r}</li>)}</ul><div className="muted small">signals: {(t.basis.signals || []).map((x) => x.label).join(" · ")}</div><div className="muted small">trail: {(t.jev.decisionTrail || []).join(" → ")}</div></details></td>
                    <td>{t.outcome.result === "OPEN" ? <Badge kind="info">open</Badge> : <Badge kind={t.outcome.result === "WIN" ? "up" : "down"}>{t.outcome.exitReason?.replace("_", " ").toLowerCase()}</Badge>}</td>
                    <td className={`mono ${tone(t.outcome.pnl)}`}>{t.outcome.pnl != null ? signedUsd(t.outcome.pnl) : "—"}</td>
                    <td className="small">{t.outcome.verdict ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {data.signals?.all?.length > 0 && <SignalsTable stats={data.signals} unit="trades" />}
    </div>
  );
}

export function SignalsTable({ stats, unit = "shadows" }) {
  const rows = stats.all ?? [];
  return (
    <Card title={`Entry signals — which conditions worked (baseline ${pct(stats.baselineWinRatePct)})`}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Signal</th><th>{unit}</th><th>Hit / won</th><th>Rate</th><th>vs. average</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.signal} className={r.enoughData ? "" : "dim"}>
                <td>{r.label}</td>
                <td className="mono">{r.trades}</td>
                <td className="mono">{r.wins}</td>
                <td className="mono">{pct(r.winRatePct)}</td>
                <td className={`mono ${tone(r.liftPct)}`}>{r.liftPct > 0 ? "+" : ""}{r.liftPct} pts</td>
                <td>{!r.enoughData ? <span className="muted small">needs {stats.minTrades}</span> : r.liftPct > 0 && r.avgPnlPct > 0 ? <Badge kind="up">promising</Badge> : r.liftPct < 0 ? <Badge kind="down">failing</Badge> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SessionShadows({ id }) {
  const { data, error, loading } = useFetch(`/api/jev/shadows?sessionId=${id}`, { intervalMs: 60_000 });
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  return <ShadowSummary data={data} />;
}

export function ShadowSummary({ data }) {
  const c = data.counts;
  return (
    <div className="stack">
      <div className="stats-row">
        <Stat label="Resolved" value={data.resolved} sub={`${c.open} open · ${c.expired} expired`} />
        <Stat label="Take-profit first" value={c.tp} sub={pct(data.tpFirstPct)} tone="up" />
        <Stat label="Stop first" value={c.sl} tone="down" />
        <Stat label="JEV predicted (avg)" value={pct(data.jevPredictedPct)} sub={data.tpFirstPct != null ? `reality ${pct(data.tpFirstPct)}` : ""} />
      </div>
      <Card title="Does JEV's probability mean anything? (by JEV's predicted range)">
        {data.byJevProbability?.length ? <Bars rows={data.byJevProbability} /> : <Empty>No resolved shadows yet.</Empty>}
        <p className="muted small">If JEV ranks setups well, the green bars rise from top to bottom. Early on, stops resolve before targets, so results start pessimistic.</p>
      </Card>
      <div className="two-col">
        <Card title="By direction"><Bars rows={data.byDirection} labelKey="key" /></Card>
        <Card title="By decision (did passed setups win?)">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Decision · side</th><th>Shadows</th><th>TP first</th><th>JEV said</th></tr></thead>
              <tbody>{(data.byDecision || []).map((r) => <tr key={r.key}><td className="small">{r.key}</td><td className="mono">{r.shadows}</td><td className="mono">{pct(r.tpFirstPct)}</td><td className="mono">{pct(r.jevPredictedPct)}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      </div>
      {data.signals && <SignalsTable stats={data.signals} />}
      <p className="muted small">{data.note}</p>
    </div>
  );
}

function History({ id }) {
  const { data, error, loading } = useFetch(`/api/jev/sessions/${id}/events?limit=1000`, { intervalMs: 60_000 });
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const events = [...(data.events || [])].reverse().slice(0, 300);
  return <Card title={`Stored events (latest ${events.length})`}><EventFeed events={events.map((e) => ({ ...e, event: e.type, at: e.createdAt }))} /></Card>;
}

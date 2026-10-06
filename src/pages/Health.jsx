import { Link } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { Card, Stat, Badge, Empty, ErrorBox, Spinner } from "../components/ui.jsx";
import { usd, signedUsd, tone, ago, shortId } from "../lib/format.js";

export default function Health() {
  const { health, refreshHealth } = useData();
  const costs = useFetch("/api/jev/costs", { intervalMs: 60_000 });

  return (
    <div className="page">
      <div className="page-head">
        <h1>Health &amp; costs</h1>
        <button className="btn small ghost" onClick={refreshHealth}>Refresh</button>
      </div>

      <Card title={<>Loop health {health && <Badge kind={health.success ? "up" : "down"}>{health.success ? "healthy" : "attention needed"}</Badge>}</>}>
        {!health ? <Spinner /> : health.error ? <ErrorBox>{health.error}</ErrorBox> : (
          <div className="stack">
            <div className="stats-row">
              <Stat label="Marked running" value={health.sessionsMarkedRunning} />
              <Stat label="Actually running" value={health.loopsActuallyRunning} tone={health.loopsActuallyRunning < health.sessionsMarkedRunning ? "down" : "up"} />
              <Stat label="JEV configured" value={health.jevConfigured ? "yes" : "no"} sub={health.configProblem} tone={health.jevConfigured ? "up" : "down"} />
              <Stat label="Supervisor" value={health.lastSupervisorRun ? ago(health.lastSupervisorRun) : "—"} sub="checks every minute" />
            </div>
            {health.failing?.length > 0 && (
              <ErrorBox>
                {health.failing.map((f) => (
                  <div key={f.sessionId}><b>{f.symbol}</b> ({shortId(f.sessionId)}): {f.lastError} — attempt {f.attempts}, next retry {new Date(f.nextRetryAt).toLocaleTimeString()}</div>
                ))}
              </ErrorBox>
            )}
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Session</th><th>State</th><th>Last price tick</th><th>Candle history from</th></tr></thead>
                <tbody>
                  {(health.running || []).map((r) => (
                    <tr key={r.sessionId}>
                      <td><Link to={`/sessions/${r.sessionId}`}>{r.symbol}</Link> <span className="muted small">{shortId(r.sessionId)}</span></td>
                      <td className="small">{r.state.toLowerCase().replace("_", " ")}</td>
                      <td className={`mono ${r.lastTickSecondsAgo > 60 ? "down" : ""}`}>{r.lastTickSecondsAgo != null ? `${r.lastTickSecondsAgo}s ago` : "—"}</td>
                      <td className="small">{r.historySource ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card title="AI cost (JEV decisions)">
        {costs.loading && !costs.data ? <Spinner /> : costs.error ? <ErrorBox>{costs.error}</ErrorBox> : (
          <div className="stack">
            <div className="stats-row">
              <Stat label="Total spent" value={usd(costs.data.totalCostUsd, 4)} sub={`${costs.data.calls} calls`} />
              <Stat label="Last 24h" value={usd(costs.data.costLast24hUsd, 4)} />
              <Stat label="Projected / day" value={usd(costs.data.projectedPer24hUsd, 4)} sub="running sessions" />
              <Stat label="Projected / month" value={usd(costs.data.projectedPer30dUsd, 2)} />
            </div>
            {!costs.data.sessions?.length ? <Empty>No calls yet.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Session</th><th>Calls</th><th>Cost</th><th>Per day</th><th>Per closed trade</th><th>P&L after AI</th></tr></thead>
                  <tbody>
                    {costs.data.sessions.map((s) => (
                      <tr key={s.sessionId} className={s.status === "STOPPED" ? "dim" : ""}>
                        <td><Link to={`/sessions/${s.sessionId}`}>{s.symbol}</Link> <span className="muted small">{s.leverage}x · {shortId(s.sessionId)}</span></td>
                        <td className="mono">{s.calls}</td>
                        <td className="mono">{usd(s.totalCostUsd, 4)}</td>
                        <td className="mono">{s.projectedPer24hUsd != null ? usd(s.projectedPer24hUsd, 4) : "—"}</td>
                        <td className="mono">{s.costPerClosedTradeUsd != null ? usd(s.costPerClosedTradeUsd, 4) : "—"}</td>
                        <td className={`mono ${tone(s.pnlAfterAiCost)}`}>{signedUsd(s.pnlAfterAiCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted small">{costs.data.note}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

import { time } from "../lib/format.js";
import { Badge, Empty } from "./ui.jsx";

const KIND = {
  trade_opened: "info", trade_closed: "neutral", jev_analysis: "neutral", risk_rejected: "down",
  adaptation: "warn", plan_created: "info", plan_updated: "muted", shadow_resolved: "muted",
  loop_state: "muted", funding: "muted", error: "down", settings_changed: "warn",
};

function describe(e) {
  const d = e.data || {};
  switch (e.event ?? e.type) {
    case "jev_analysis":
      return d.ok === false ? `JEV error: ${d.error}` : `${d.mode === "ENTRY_PLAN" ? "Search" : "Recheck"} → ${d.decision} (${Math.round(d.confidence ?? 0)}%)${d.reason?.[0] ? ` — ${d.reason[0]}` : ""}`;
    case "trade_opened": return `Opened ${d.trade?.direction} @ ${d.trade?.entryPrice}`;
    case "trade_closed": return `Closed ${d.trade?.exitReason} · P&L ${Number(d.trade?.pnl ?? 0).toFixed(2)}`;
    case "risk_rejected": return `Entry rejected: ${(d.failed || []).map((f) => f.name).join(", ")}`;
    case "adaptation": return `Aggression ${d.from} → ${d.to}: ${d.reason}`;
    case "plan_created": return `New ${d.plan?.direction} plan${d.replacedPlanNo ? ` (replaces #${d.replacedPlanNo})` : ""}`;
    case "plan_updated": return d.status ? `Plan ${d.status.toLowerCase()}${d.reason ? `: ${d.reason}` : ""}` : d.decision ? `Plan: ${d.decision}${d.nextWatch ? ` — ${d.nextWatch}` : ""}` : "Plan checked";
    case "shadow_resolved": return `Shadow ${d.direction} → ${d.status === "TP" ? "take-profit" : "stop"} (JEV ${d.rawProb}%)`;
    case "loop_state": return `State: ${d.state}`;
    case "funding": return `Funding ${Number(d.amount).toFixed(4)}`;
    case "settings_changed": return `Settings changed: ${JSON.stringify(d)}`;
    default: return JSON.stringify(d).slice(0, 140);
  }
}

export default function EventFeed({ events, empty = "No events yet." }) {
  if (!events?.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="feed">
      {events.map((e, i) => {
        const type = e.event ?? e.type;
        return (
          <li key={e.id ?? `${e.at}-${i}`}>
            <span className="mono muted feed-time">{time(e.at ?? e.createdAt)}</span>
            <Badge kind={KIND[type] ?? "neutral"}>{type.replace(/_/g, " ")}</Badge>
            <span className="feed-text">{describe(e)}</span>
          </li>
        );
      })}
    </ul>
  );
}

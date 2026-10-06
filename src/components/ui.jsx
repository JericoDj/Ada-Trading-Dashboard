// Small presentational building blocks.
import { useState } from "react";

export const Card = ({ title, actions, children, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <header className="card-head">
        {title && <h3>{title}</h3>}
        {actions && <div className="card-actions">{actions}</div>}
      </header>
    )}
    {children}
  </section>
);

export const Stat = ({ label, value, sub, tone = "" }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${tone}`}>{value}</div>
    {sub != null && <div className="stat-sub">{sub}</div>}
  </div>
);

export const Badge = ({ children, kind = "neutral", title }) => <span className={`badge ${kind}`} title={title}>{children}</span>;

const STATE_KIND = { POSITION_OPEN: "info", WATCHING: "warn", SEARCHING: "neutral", COOLDOWN: "muted", STOPPED: "muted" };
export const StateBadge = ({ state, status }) =>
  status === "STOPPED" ? <Badge kind="muted">stopped</Badge> : <Badge kind={STATE_KIND[state] ?? "neutral"}>{(state || "").toLowerCase().replace("_", " ")}</Badge>;

export const SideBadge = ({ side }) => {
  if (!side || side === "FLAT") return <Badge kind="muted">flat</Badge>;
  if (side.startsWith("WATCHING_")) return <Badge kind="warn">watching {side.slice(9).toLowerCase()}</Badge>;
  return <Badge kind={side === "LONG" ? "up" : "down"}>{side.toLowerCase()}</Badge>;
};

export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const ErrorBox = ({ children }) => (children ? <div className="error-box">{children}</div> : null);
export const Spinner = () => <div className="spinner" aria-label="loading" />;

export function Tabs({ tabs, initial }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === active} className={t.key === active ? "tab active" : "tab"} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body">{current?.render()}</div>
    </div>
  );
}

/** Where the price sits between stop-loss and take-profit (0 = stop, 1 = target). */
export function RangeBar({ stop, entry, target, price }) {
  if ([stop, target, price].some((v) => v == null)) return null;
  const lo = Math.min(stop, target), hi = Math.max(stop, target);
  const pos = (v) => `${Math.min(Math.max(((v - lo) / (hi - lo)) * 100, 0), 100)}%`;
  const longTrade = target > stop;
  return (
    <div className="rangebar" aria-label="price between stop and target">
      <div className="rangebar-track">
        <div className={`rangebar-zone ${longTrade ? "left-down" : "left-up"}`} />
      </div>
      {entry != null && <div className="rangebar-mark entry" style={{ left: pos(entry) }} title="entry" />}
      <div className="rangebar-mark price" style={{ left: pos(price) }} title="price" />
      <div className="rangebar-labels">
        <span>{longTrade ? "stop" : "target"}</span>
        <span>{longTrade ? "target" : "stop"}</span>
      </div>
    </div>
  );
}

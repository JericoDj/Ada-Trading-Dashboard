export const usd = (v, d = 2) =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v) < 0 ? "−" : ""}$${Math.abs(Number(v)).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export const signedUsd = (v, d = 2) => (v == null ? "—" : `${Number(v) > 0 ? "+" : ""}${usd(v, d)}`);

export const pct = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(d)}%`);

export const signedPct = (v, d = 2) => (v == null ? "—" : `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(d)}%`);

export const num = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: d }));

/** Prices: more decimals for small-priced coins. */
export const price = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  const d = n >= 1000 ? 1 : n >= 10 ? 2 : n >= 1 ? 4 : 5;
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

export const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export const ago = (iso) => {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export const duration = (min) => (min == null ? "—" : min < 60 ? `${Math.round(min)}m` : `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`);

export const tone = (v) => (v == null || Number(v) === 0 ? "" : Number(v) > 0 ? "up" : "down");

export const shortId = (id) => (id ? id.slice(0, 8) : "—");

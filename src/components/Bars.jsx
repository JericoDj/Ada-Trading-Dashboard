// Grouped bars: JEV's predicted % vs. what actually happened, per row.
export default function Bars({ rows, labelKey = "range", predictedKey = "jevPredictedPct", actualKey = "tpFirstPct", countKey = "shadows" }) {
  if (!rows?.length) return null;
  const max = Math.max(100, ...rows.map((r) => Math.max(r[predictedKey] ?? 0, r[actualKey] ?? 0)));
  return (
    <div className="bars">
      <div className="bars-legend">
        <span><i className="sw predicted" /> JEV predicted</span>
        <span><i className="sw actual" /> actually hit take-profit first</span>
      </div>
      {rows.map((r) => (
        <div className="bars-row" key={r[labelKey]}>
          <div className="bars-label">
            {r[labelKey]}
            {countKey && r[countKey] != null && <small>{r[countKey]}</small>}
          </div>
          <div className="bars-tracks">
            <div className="bar predicted" style={{ width: `${((r[predictedKey] ?? 0) / max) * 100}%` }}>
              <span>{r[predictedKey] != null ? `${r[predictedKey]}%` : ""}</span>
            </div>
            <div className="bar actual" style={{ width: `${((r[actualKey] ?? 0) / max) * 100}%` }}>
              <span>{r[actualKey] != null ? `${r[actualKey]}%` : ""}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

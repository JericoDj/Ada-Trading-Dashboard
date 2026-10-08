import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { ago } from "../lib/format.js";

export default function Layout() {
  const { user, logout } = useAuth();
  const { health, lastUpdated, error, sessions } = useData();
  // Running sessions per kind: internal = paper, demo = testnet key, live = mainnet key
  const counts = { internal: 0, demo: 0, live: 0 };
  for (const s of sessions) {
    if (s.status !== "RUNNING") continue;
    if (s.mode !== "live") counts.internal++;
    else if (s.exchangeEnv === "mainnet") counts.live++;
    else counts.demo++;
  }
  const healthy = health?.success;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>◆</span> Ada <small>JEV trader</small>
        </div>
        <nav>
          <div className="nav-group">Sessions</div>
          <NavLink to="/" end>Internal sessions <small className="nav-count">{counts.internal}</small></NavLink>
          <NavLink to="/demo">Demo sessions <small className="nav-count">{counts.demo}</small></NavLink>
          <NavLink to="/live" className="nav-real">Live sessions <small className="nav-count">{counts.live}</small></NavLink>
          <div className="nav-group">Setup &amp; insights</div>
          <NavLink to="/keys">API keys</NavLink>
          <NavLink to="/shadows">Shadows &amp; calibration</NavLink>
          <NavLink to="/health">Health &amp; costs</NavLink>
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/health" className={`health-pill ${health == null ? "" : healthy ? "ok" : "bad"}`}>
            <i /> {health == null ? "checking…" : healthy ? `${health.loopsActuallyRunning}/${health.sessionsMarkedRunning} running` : "attention needed"}
          </NavLink>
          <div className="muted small">{lastUpdated ? `updated ${ago(lastUpdated.toISOString())}` : ""}</div>
          {error && <div className="small down">{error}</div>}
          <div className="user">
            <span className="small">{user?.email}</span>
            <button className="link" onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

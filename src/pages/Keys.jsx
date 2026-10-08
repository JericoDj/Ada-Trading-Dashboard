import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { Card, Badge, Empty, ErrorBox, Spinner } from "../components/ui.jsx";
import { usd, ago } from "../lib/format.js";

const ENV_LABEL = { testnet: "Demo (testnet)", mainnet: "Live (real money)" };

/** Saved Binance Futures API keys: add, check, rename, delete. Secrets are never shown again after saving. */
export default function Keys() {
  const { data, error, loading, reload } = useFetch("/api/live/credentials");
  const creds = data?.credentials ?? [];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>API keys</h1>
          <p className="muted small">Binance USDⓈ-M Futures keys, stored encrypted. Demo sessions use demo keys, live sessions use live keys.</p>
        </div>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {data && !data.encryptionReady && (
        <div className="error-box">
          <b>Set CREDENTIALS_SECRET in Railway before saving keys.</b> It encrypts the keys in the database — a long random
          string (e.g. <code>openssl rand -hex 32</code>). Don't change it afterwards, or saved keys must be re-entered.
        </div>
      )}
      {loading && !data && <div className="center"><Spinner /></div>}
      <div className="grid-2">
        <Card title="Saved keys">
          {data && !creds.length && <Empty>No keys yet — add your Binance Demo Trading key first.</Empty>}
          <div className="key-list">
            {creds.map((c) => <KeyRow key={c.id} c={c} onChange={reload} />)}
          </div>
        </Card>
        <AddKey onSaved={reload} disabled={data && !data.encryptionReady} />
      </div>
    </div>
  );
}

function KeyRow({ c, onChange }) {
  const { call } = useData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [checked, setChecked] = useState(null);
  const st = checked?.lastStatus ?? c.lastStatus;
  const run = async (fn) => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

  return (
    <div className={`key-row ${c.environment}`}>
      <div className="key-top">
        <div>
          <div className="strong">{c.name} <span className="mono muted small">{c.keyHint}</span></div>
          <div className="small muted">{c.readOnly ? "from Railway variables" : `added ${ago(c.createdAt)}`}{(checked?.lastCheckedAt ?? c.lastCheckedAt) ? ` · checked ${ago(checked?.lastCheckedAt ?? c.lastCheckedAt)}` : ""}</div>
        </div>
        <span className={`env-badge ${c.environment}`}>{ENV_LABEL[c.environment]}</span>
      </div>
      {st && (
        <div className="row gap small">
          <Badge kind={st.ok ? "up" : "down"}>{st.ok ? "works" : "problem"}</Badge>
          {st.usdtAvailable != null && <span>USDT available <b className="mono">{usd(st.usdtAvailable)}</b></span>}
          {st.problem && <span className="down">{st.problem}</span>}
        </div>
      )}
      <ErrorBox>{err}</ErrorBox>
      <div className="row gap">
        <button className="btn small" disabled={busy} onClick={() => run(async () => setChecked((await call(`/api/live/credentials/${c.id}/test`, { method: "POST" })).credential))}>Check with Binance</button>
        <Link className="btn small ghost" to={c.environment === "testnet" ? "/demo" : "/live"}>Open {c.environment === "testnet" ? "demo" : "live"} sessions</Link>
        {!c.readOnly && (
          <>
            <button className="btn small ghost" disabled={busy} onClick={() => {
              const name = prompt("New name for this key", c.name);
              if (name && name !== c.name) run(async () => { await call(`/api/live/credentials/${c.id}`, { method: "PATCH", body: { name } }); onChange(); });
            }}>Rename</button>
            <button className="btn small ghost danger-text" disabled={busy} onClick={() => {
              if (confirm(`Delete the key "${c.name}"? It's wiped from the database; sessions that used it keep its name.`)) run(async () => { await call(`/api/live/credentials/${c.id}`, { method: "DELETE" }); onChange(); });
            }}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

function AddKey({ onSaved, disabled }) {
  const { call } = useData();
  const [f, setF] = useState({ name: "demo", environment: "testnet", apiKey: "", apiSecret: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setOk(null); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await call("/api/live/credentials", { method: "POST", body: f });
      setOk(`Saved “${r.credential.name}” — ${r.credential.lastStatus?.ok ? `works, ${usd(r.credential.lastStatus.usdtAvailable)} USDT available` : r.credential.lastStatus?.problem ?? "saved"}`);
      setF({ name: "", environment: f.environment, apiKey: "", apiSecret: "" }); // clear the secret from the page
      onSaved();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Add an API key">
      <form className="form" onSubmit={submit} autoComplete="off">
        <div className="form-grid">
          <label>Name<input value={f.name} onChange={set("name")} placeholder="demo, live, …" required maxLength={40} /></label>
          <label>Type<select value={f.environment} onChange={set("environment")}>
            <option value="testnet">Demo (Binance Demo Trading)</option>
            <option value="mainnet">Live (real Binance account)</option>
          </select></label>
        </div>
        <label>API key<input value={f.apiKey} onChange={set("apiKey")} required spellCheck={false} autoComplete="off" className="mono" /></label>
        <label>Secret key<input type="password" value={f.apiSecret} onChange={set("apiSecret")} required autoComplete="new-password" className="mono" /></label>
        <p className="small muted">
          {f.environment === "testnet"
            ? "From demo.binance.com → API Management → Create API (System generated / HMAC)."
            : "Real money: enable Futures, keep withdrawals OFF, and restrict the key to your server's IP."}
          {" "}The key is checked with Binance before saving, then stored encrypted and never shown again.
        </p>
        <ErrorBox>{err}</ErrorBox>
        {ok && <p className="up small">{ok}</p>}
        <div className="form-actions">
          <button className={`btn ${f.environment === "mainnet" ? "danger" : "primary"}`} disabled={busy || disabled}>{busy ? "Checking with Binance…" : "Save key"}</button>
        </div>
      </form>
    </Card>
  );
}

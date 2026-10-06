# Ada Trading Dashboard

React (Vite + Context API) dashboard for the Ada JEV trading backend: sessions, live P&L, positions,
plans, trade reviews, shadow outcomes, calibration, loop health and AI costs.

## Pages
| Page | What it shows |
|---|---|
| **Sessions** | Every session as a card: state, side, equity, P&L, W/L, aggression, open position or watched plan. Portfolio totals. Start / stop / resume. "New session" form. |
| **Session detail** | Live P&L and price over the WebSocket, open position (entry / stop / target / ROE and where price sits between stop and target), the watched plan with its entry conditions, live activity feed, editable settings (target R:R, leverage, aggression), personality and indicators. Tabs: **Trades & review** (each trade with JEV's odds, setup, reasons, signals, decision trail, outcome, verdict + lessons), **Shadows** (this session's judged plans), **History** (stored events). |
| **Shadows & calibration** | Calibration status and "JEV says → bot uses" table; shadow counts; take-profit rate vs. JEV's prediction by probability range, by direction and by decision; signal stats. Filter by symbol. |
| **Health & costs** | Sessions marked running vs. actually running, failing sessions and their errors, last price tick per loop; AI cost totals, per day/month projections and per session. |

## Setup
```bash
cp .env.example .env        # set VITE_API_URL to your backend (no trailing slash)
npm install
npm run dev                 # http://localhost:5173
```
Sign in with an **admin** account of the backend (`npm run make-admin -- you@example.com` on the backend).
The token is kept in this browser's localStorage; "Log out" clears it.

## Deploy
- **Vercel / Netlify:** framework "Vite", build `npm run build`, output `dist`, env `VITE_API_URL`. `vercel.json` routes every path to the app.
- **Railway:** new service from this repo, env `VITE_API_URL`; build `npm run build`, start `npm start` (serves `dist` on `$PORT`).

`VITE_API_URL` is baked in at build time — redeploy after changing it. The backend already allows cross-origin requests.

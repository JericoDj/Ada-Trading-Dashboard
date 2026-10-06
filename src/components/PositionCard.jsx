import { Card, RangeBar, Badge } from "./ui.jsx";
import { price, signedUsd, signedPct, usd, tone, dateTime } from "../lib/format.js";

/** Open position with live price, P&L and where price sits between stop and target. */
export default function PositionCard({ trade, livePrice }) {
  if (!trade) return null;
  const p = livePrice ?? trade.price;
  return (
    <Card title={<>Open position <Badge kind={trade.direction === "LONG" ? "up" : "down"}>{trade.direction?.toLowerCase()}</Badge> <Badge>{trade.leverage}x</Badge></>}>
      <div className="grid-stats">
        <div><div className="stat-label">Entry</div><div className="mono">{price(trade.entryPrice)}</div></div>
        <div><div className="stat-label">Price</div><div className="mono strong">{price(p)}</div></div>
        <div><div className="stat-label">Stop-loss</div><div className="mono down">{price(trade.stopLoss)}</div></div>
        <div><div className="stat-label">Take-profit</div><div className="mono up">{price(trade.takeProfit)}</div></div>
        <div><div className="stat-label">Unrealized</div><div className={`mono strong ${tone(trade.unrealizedPnl)}`}>{signedUsd(trade.unrealizedPnl)}</div></div>
        <div><div className="stat-label">ROE</div><div className={`mono ${tone(trade.unrealizedRoePct)}`}>{signedPct(trade.unrealizedRoePct)}</div></div>
        <div><div className="stat-label">Size / margin</div><div className="mono">{usd(trade.notional, 0)} / {usd(trade.margin, 0)}</div></div>
        <div><div className="stat-label">Liquidation</div><div className="mono muted">{trade.liquidationPrice ? price(trade.liquidationPrice) : "—"}</div></div>
      </div>
      <RangeBar stop={trade.stopLoss} entry={trade.entryPrice} target={trade.takeProfit} price={p} />
      <div className="muted small">Opened {dateTime(trade.entryTime)} · funding {signedUsd(trade.funding, 4)}</div>
    </Card>
  );
}

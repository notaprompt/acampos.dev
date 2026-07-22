---
title: "DEUCE"
tagline: "A calibration-first pricing instrument for tennis prediction markets. It prices fair value, then signs each forecast to a tamper-evident ledger before the market resolves. The ledger is the product, not a profit claim."
status: "active"
stack: ["Python", "SQLite", "Polymarket", "Kalshi", "Ed25519", "Ollama"]
order: 7
---

DEUCE prices tennis prediction markets. It computes a fair value for each side of an in-play match, signs that forecast to a ledger before the market resolves, and only then lets reality grade it. Most trading writeups show you the wins and quietly bury the log. I wanted the opposite: a record that comes first, an outcome that comes second, and no way for me to rewrite history to look sharper than I was.

The signed ledger is the deliverable. Whether it makes money is a separate, later question - and the whole design refuses to answer that question before it has earned the right to.

## How it works

**The price.** For each in-play tennis market, DEUCE builds a fair-value probability independent of the price the market is showing. The edge comes from a few sources stacked together - a model read on the match, live whale tracking to see where size is moving, a winner feed for how favorites are actually resolving, and a working thesis about favored-unders on the WTA and ITF tours. None of those is the answer on its own. The point is a price I arrived at myself, so I can hold it up against the market's and see who was closer.

**The signed ledger.** Before the match resolves, the forecast - probability, timestamp, market id - gets committed to a tamper-evident ledger with an Ed25519 signature. The commitment locks while the outcome is still unknown. That is the load-bearing part: a track record I cannot backdate. If I want to claim I was calibrated, the ledger is the thing I point to, and it was written before I knew how any of it turned out.

**The scoreboard.** The honest measure is closing-line value - CLV. When I log the gap between my price and the market price, I can ask the only question that matters early: did my forecast beat the price the market settled toward? P&L is noisy and slow to teach you anything. CLV tells you whether the edge is real long before the money does.

**Paper mode.** No real capital is committed. Every forecast runs against live markets, but the position is paper - deliberate discipline, not a limitation I am waiting to remove. The instrument proves itself against ground truth before it touches a dollar.

## What I haven't solved

I would rather name these than dress them up.

- **The gate is not cleared.** DEUCE has to prove it is calibrated - CLV-positive over a real paper sample - before a single real dollar goes in. It hasn't yet. So it stays in paper mode, and the ledger, not my optimism, decides when that changes.
- **The fleet is a vision, not a fact.** The long shape is a fleet of these running many markets at once - market-making, covered books, thousands of trades a year. I have built pieces of the scaffolding, but none of it is earned until the calibration holds. Claiming the fleet now would be exactly the backdating the ledger exists to prevent.
- **Some threads went nowhere, and I kept the record.** Copy-trading and cross-book market-making across Polymarket and Kalshi came back as negative results in backtest. That is the ledger working. A system built to catch me being wrong should sometimes catch me being wrong.

## Where it's going

One gate, in order: prove CLV positive in paper, with the signed ledger as the evidence, and only then talk about live capital or a fleet. If the calibration doesn't hold, the ledger will say so plainly - and that is the point of building it this way. I would rather ship the discipline than a screenshot of a good week.

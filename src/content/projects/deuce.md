---
title: "DEUCE"
tagline: "A calibration-first pricing instrument for tennis prediction markets. It prices fair value, then signs each forecast to a tamper-evident ledger before the market resolves. The ledger is the product, not a profit claim."
status: "active"
stack: ["Python", "SQLite", "Polymarket", "Ed25519", "Ollama"]
order: 7
---

## Goals

Most trading writeups show you the wins and hide the log. I wanted the opposite: a system where the record comes first and the outcome comes second. DEUCE prices fair value for a tennis market, writes that forecast to a signed ledger before the market resolves, and only then lets reality grade it. Because each entry is signed and timestamped ahead of resolution, I can't quietly rewrite history to look sharper than I was. The signed ledger is the deliverable. Whether it makes money is a separate, later question.

## Process

1. **Price**: Compute a fair-value probability for each side of an in-play tennis market from the model, independent of the market's posted price.
2. **Sign**: Before resolution, commit the forecast — probability, timestamp, market id — to a tamper-evident ledger with an Ed25519 signature. The commitment is locked in while the outcome is still unknown.
3. **Compare**: Log the gap between my price and the market price. This is where closing-line value (CLV) comes from — did my forecast beat the price the market settled toward?
4. **Resolve**: When the match resolves, the ledger scores itself against ground truth. Calibration and CLV accumulate over the sample.

Paper-mode only. No real money is committed.

## Status — the gate

DEUCE is gated. Before a single real dollar goes in, it has to prove it's calibrated: CLV-positive over a real paper sample, with the signed ledger as the evidence. I haven't cleared that gate yet, so this stays in paper mode. That's the honest state — a pricing-and-proof instrument that hasn't earned live capital, and won't until the ledger says it should.

I'd rather ship the discipline than a P&L screenshot. If the calibration doesn't hold up, the ledger will say so, and that's the point.

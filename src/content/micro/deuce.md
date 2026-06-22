---
title: "Deuce"
tagline: "A pricing instrument for tennis prediction markets. It prices fair value and signs the forecast before the market moves. The ledger is the product, not a profit claim."
status: "active"
stack: ["Python", "Markov model", "Polymarket", "MCP", "Poke"]
order: 5
---

Deuce is not a winner-predictor. It's a calibration-first pricing instrument: given the live state of a tennis match, it computes a fair value for the market and compares it to the price. Direction is an output of that gap, never a default - "no trade" is a position, and rejecting a badly-shaped market is half the job.

The mechanism: an exact Markov model of the match prices fair value with explicit uncertainty. A reject-first gate runs before pricing - if the market isn't cleanly scoreable, mean-reverting, and observable within its own latency, Deuce leaves it alone. What survives gets priced, sized with a tail-aware fractional Kelly fraction under a hard cap, and logged.

The part that matters: every forecast is signed to a tamper-evident ledger *before* the market resolves. That's the asset - a timestamped, falsifiable record of whether the model beat the line, not a screenshot of a good night. The trading is the marketing; the model is the product; the ledger is the proof.

Status is honest: paper-mode. No live-execution claim, no track record for sale. The only question that counts is whether it beats the closing line over enough resolved markets to mean anything - and that's what the ledger is being built to answer. Alerts route through Poke (iMessage/WhatsApp); the loop runs locally.

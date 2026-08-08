---
title: "DEUCE"
tagline: "A calibration-first pricing instrument for tennis prediction markets. It prices fair value, then signs each forecast to a tamper-evident ledger before the market resolves. The ledger is the product, not a profit claim."
status: "active"
stack: ["Python", "SQLite", "Polymarket", "Kalshi", "Ed25519", "Ollama"]
order: 4
metrics:
  - { label: "signed forecasts", value: "2,552", asof: "Aug 2026", source: "append-only ledger", plain: "a sample big enough to tell skill from luck - and it exists whether it flatters me or not" }
  - { label: "committed", value: "before resolution, ed25519", asof: "Aug 2026", plain: "signed before the outcome was known, so a good record cannot be faked - and a bad one cannot be hidden" }
  - { label: "deletion", value: "refused by SQL trigger", asof: "Aug 2026", plain: "even I cannot erase a bad call - the misses stay, which is what makes the hits mean something" }
  - { label: "capital at risk", value: "none - paper until calibrated", asof: "Aug 2026", plain: "no money until the record proves skill - the step most trading projects skip, and die by" }

---

**Cold read.** People bet real money on live tennis through prediction markets - exchanges for yes/no questions, where the price is the crowd's odds. DEUCE is a program that watches those markets, forms its own opinion of the odds, and seals that opinion in a signed, dated record *before the match ends*. Then reality grades it. No money rides on any of it yet - on purpose.

Most trading writeups show you the wins and quietly bury the log. This is the opposite: the record comes first, the outcome comes second, and there is no way for me to rewrite history to look sharper than I was. The machine above is the real shape - touch a station. Each one names the engineering feat, the architectural choice, and the thing it refuses to do. The refusals are the design: every hard decision in DEUCE is a "no" enforced by code rather than discipline.

## how to read it

**The price is mine before it is anyone's.** For each in-play match (mid-game, odds still moving), the pricer builds its own probability without looking at the market's price - a model read, whale tracking, a winner feed, and a favored-unders thesis on the WTA and ITF tours, stacked, none trusted alone. It has to be my own number, or holding it against the market's proves nothing.

**The signature is the product.** Probability, timestamp, market id - committed with Ed25519 while the outcome is still unknown, into a book whose SQL schema refuses deletion. A track record that cannot be backdated, including by me.

**The grade is the gap.** The scoreboard is closing-line value: the distance between my signed price and the line the market settled toward - the shaded band in the strip above. The market's final price is the best public guess there is, so beating it consistently means the edge is real. P&L is noisy and slow to teach; the gap says it first.

## risk, as refusals

- The gate rejects first. A market that isn't cleanly scoreable, observable within its own latency, gets left alone. "No trade" is a position.
- Capital is locked behind the ladder above, and each lock opens only from the left. Paper positions run against live markets and are marked every ten minutes; zero real dollars move until the gap holds positive on a signed sample.
- The whole financial mind is local. DEUCE runs as an organ of a sovereign system - its theses, positions, and grades live in memory on my machine and never leave it.

## what I haven't solved

I would rather name these than dress them up.

- **The gate is not cleared.** DEUCE has to prove calibration before a real dollar goes in. It hasn't yet, so it stays paper, and the ledger - not my optimism - decides when that changes.
- **The fleet is a vision, not a fact.** The long shape is many of these across many markets. Claiming it now would be exactly the backdating the ledger exists to prevent.
- **Some threads went nowhere, and I kept the record.** Copy-trading and cross-book market-making backtested negative. That is the ledger working - a system built to catch me being wrong should sometimes catch me being wrong.

## where it's going

One gate, in order: prove the gap positive in paper, with the signed ledger as evidence, then - and only then - live capital. If the calibration doesn't hold, the book will say so plainly. I would rather ship the discipline than a screenshot of a good week.

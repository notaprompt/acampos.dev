---
title: "DEUCE"
tagline: "A paper-only tennis forecasting system that records predictions before outcomes are known."
status: "active"
stack: ["Python", "SQLite", "Polymarket", "Kalshi", "Ed25519", "Ollama"]
order: 4
---

Prediction markets make a forecast testable: form a probability, record it before the outcome, and compare it with what happens. DEUCE applies that process to tennis markets. It runs on live market data with paper positions. No real capital is deployed.

The question is whether a model can produce a useful forecast after accounting for timing, data quality, and the market's own information. I built the recordkeeping before treating any apparent edge as something worth acting on.

## The implementation

The pricer combines model output, observed market activity, and match information to form a probability. It records the forecast, timestamp, and market identifier with an Ed25519 signature before resolution. SQLite triggers reject deletion through the normal application path.

That makes later changes easier to detect and keeps misses in the working record. It does not make the database impossible for its owner to alter or prove that every forecast was included. A credible evaluation still needs a defined sample and a reproducible grading process.

Market eligibility checks reject cases that cannot be observed or scored cleanly. Paper positions are marked periodically, and the analysis tracks calibration and movement toward the closing price. These are useful diagnostics; a favorable price comparison alone does not establish a tradable edge after costs and execution constraints.

## What the evidence says so far

The system produces signed forecasts and a paper record. It has not cleared its own gate for live trading. Earlier copy-trading and cross-book market-making approaches backtested negative; those results stay in the project record.

The remaining work is to define a convincing evaluation window, check the quality of the data and grading, and see whether performance persists outside the sample that shaped the model. Until that evidence exists, DEUCE stays paper-only.

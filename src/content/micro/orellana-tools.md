---
title: "Orellana Tools"
tagline: "QuickBooks tools for a landscaping business that ran on verbal quotes. Make an invoice from field notes; record a check without retyping it into the books."
status: "active"
stack: ["Python", "MCP", "QuickBooks API", "uv", "FastAPI"]
order: 3
---

Orellana Landscaping LLC, Woodbridge VA. Decades in business, all verbal quotes, the books kept by hand. The problem was never the work - it was the paper between the work and getting paid.

Two tools, both narrow on purpose:

- **create_invoice** - turn a line of field text ("mulch and cleanup, $450") into a QuickBooks invoice.
- **record_check_payment** - mark a check against the right open invoice, so nobody retypes it into QuickBooks by hand later.

QuickBooks stays the system of record. Every write is confirm-before-write: the tool previews exactly what it will post and returns a token, and nothing hits the books until that token comes back. There's an audit log, and it fails closed when it isn't connected to a real account.

Built delegation-safe from the first line - least-privilege, tenant-aware, every write reviewable - because the point is to hand it off, not to babysit it. Today it runs as a one-command demo against a seeded QuickBooks-lookalike; the real-account seam (Intuit OAuth) is one config step away. Alerts route through Poke.

Demo-stage. It counts as real when a stranger pays for it - that's the gate it has to clear next.

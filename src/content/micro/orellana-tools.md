---
title: "Orellana Tools"
tagline: "A prototype for proposals, invoice preparation, and payment recording for a landscaping business."
status: "active"
stack: ["Python", "MCP", "QuickBooks API", "uv", "FastAPI"]
order: 3
---

I built this prototype for Orellana Landscaping in Woodbridge, Virginia, around the work between a field job and getting paid: preparing a proposal, drafting an invoice, and matching a payment to the right balance.

## What is implemented

The invoice tool resolves customer and service names, prepares line items, and returns a preview before creating an invoice. The service catalog recognizes English and Spanish names. The payment tool looks for the right open invoice, asks for clarification when the match is ambiguous, and checks payment references for duplicates.

The MCP and web interfaces require a confirmation token before accounting writes. Recurring invoice runs separate ambiguous items for review and track created and sent invoices so a later send can resume.

The proposal generator produces a shareable page and a print layout. I placed payment options and a financing application link beside the total, so a customer can consider them while deciding on the proposal. That is an implemented layout decision; its effect on sales has not been measured.

## Current scope

The local build defaults to seeded demonstration books. A QuickBooks OAuth flow and API adapter are implemented, along with a sandbox smoke-test script. Production accounting integration and ongoing business use have not been independently verified.

The proposal store is currently seeded and held in memory. Durable storage and verified use with a connected account remain necessary before treating this as a delivered accounting service.

The [work page](/work#orellana) explains the decisions behind the prototype.

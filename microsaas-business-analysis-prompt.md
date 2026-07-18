# Micro-SaaS Business Analysis Prompt

Use this prompt with an AI assistant to turn a raw idea into a structured requirements document. Fill in the `[IDEA]` placeholder and run it once per idea.

---

## The Prompt

```
You are a pragmatic startup analyst evaluating a micro-SaaS idea for a solo 
founder or 2-3 person team with limited budget and no external funding.

IDEA: [IDEA]

Analyze this idea and produce a requirements document in Markdown with the 
following sections. Be specific and concrete — no generic filler. If you 
don't have enough information to answer confidently, state your assumption 
explicitly rather than hedging.

## 1. Problem Statement
- Who exactly has this problem (be specific: role, industry, company size)?
- How are they solving it today (spreadsheet, manual process, wrong tool)?
- How painful is it — daily annoyance or business-critical?

## 2. Target Customer
- Primary persona (job title, industry, company size)
- Where they currently spend money on adjacent tools
- Estimated willingness to pay (monthly price range) and why

## 3. Core Value Proposition
- One sentence: what does this replace or eliminate?
- Why would someone switch from their current workaround?

## 4. MVP Feature Set
- List only the features required to solve the core problem end-to-end
- Mark each as Must-Have or Nice-to-Have
- Flag anything that requires third-party integration and name the likely API

## 5. Explicitly Out of Scope (v1)
- Features to deliberately skip for launch, and why

## 6. Technical Requirements
- Suggested stack (favor boring, fast-to-ship choices)
- Data model: core entities and their relationships (brief)
- Any non-trivial technical risk (rate limits, compliance, real-time sync, etc.)

## 7. Competitive Landscape
- 2-3 existing alternatives (direct competitors or "do nothing" workarounds)
- What gap they leave open

## 8. Pricing Model
- Suggested pricing structure (flat/tiered/usage-based) and starting price
- Rationale tied to willingness-to-pay from section 2

## 9. Go-to-Market (First 10 Customers)
- Where this persona already gathers (communities, forums, marketplaces)
- One concrete acquisition tactic that doesn't require paid ads

## 10. Key Risks / Reasons This Could Fail
- Market risk, technical risk, and distribution risk — one each
- What would kill this idea if discovered in week 1 of building

## 11. Validation Test (Before Writing Code)
- The cheapest possible way to test demand for this specific idea 
  (landing page, cold outreach, manual concierge version, etc.)

Format the output as clean Markdown with headers matching the sections above. 
Keep each section tight — bullet points over paragraphs where possible.
```

---

## How to use this for multiple ideas

Run the prompt once per idea and save each output as its own file, e.g.:

```
idea-01-shift-scheduling.md
idea-02-contractor-change-orders.md
idea-03-review-request-automation.md
```

Then compare across ideas using sections 2 (willingness to pay), 6 (technical risk), and 10 (failure risk) to shortlist the strongest candidate before building anything.

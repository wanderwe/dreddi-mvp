# Dreddi — Monetization Roadmap

## Strategic Direction

Civic accountability platform — public promises made visible and trackable.
Not a B2B SaaS, not a social network. Public infrastructure for observable
commitments. Monetized through data access, white-label, and institutional
partnerships.

Primary market: Ukraine (seed) → Western civic tech (scale)

---

## Revenue Path: Three Phases

### Phase 1 — Grants (Runway, start now)

Target programs:
- USAID / Internews Ukraine — media tech, transparency, $30-150k
- EU4Democracy — civic accountability, $20-100k
- Ukrainian Media Development Fund — $10-50k, faster cycle
- NDI (National Democratic Institute) — accountability platforms, $25-100k
- Transparify — government transparency, $10-30k

What's needed: impact statement, 2-3 live civic use cases (deputy + animal
shelter agreement already exists), technical demo, basic metrics.

### Phase 2 — API Access for Media & Fact-checkers ($2-10k MRR)

Prerequisite: manually seed 50-100 real public promises from Ukrainian
officials before selling API access — no data = nothing to sell.

Pricing:
- Free — NGO researchers, individual journalists
- Media — $200-300/mo — editorial teams
- Enterprise — $500+/mo — large media, think tanks

Target: Slidstvo.info, Bihus.info, Texty.org.ua, DFRLab

### Phase 3 — White-label for NGOs ($10-30k MRR)

Organizations get branded version of Dreddi's public pledge tracker.
E.g. "Обіцянки Києва" powered by Dreddi.

Pricing:
- NGO — $500/mo
- Institutional — $1,500/mo
- Government — custom $2-5k/mo

Target: Transparency International Ukraine, AntAC, municipal councils,
OSCE / Council of Europe local programs.

---

## Supporting Streams (Later)

- Embed widgets for public figures / companies — $10-30/mo
  (already technically built, low effort to productize)
- Premium for civic activists — $3-5/mo
  (analytics, digests, export)
- Verified profile for public figures — only after platform has audience leverage

---

## What We Are NOT Doing

- No enterprise B2B SaaS
- No ad-supported model (destroys trust as neutral platform)
- No chasing Western market before Ukrainian market validated

---

## Design Decision: Two Visual Themes

Keep dark theme for the main dashboard / creator interface.

Switch public-facing agreement/promise pages to LIGHT theme:
- Reason: civic positioning requires "official document" feel
- Journalists, officials, and grant reviewers encounter the platform
  first via shared public links — light theme builds trust in this context
- This is NOT a rebrand — only public pages switch to light
- Internal user interface stays dark

Action for dev: audit which pages are public-facing (agreement detail,
public profile, public pledge page) and apply light theme variant there.
Dark theme remains default for all authenticated/dashboard views.

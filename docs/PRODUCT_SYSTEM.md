# Dreddi Product System

## Core Philosophy

Dreddi is not:
- a task manager
- a freelance marketplace
- a CRM
- a legal contract platform
- a social network with likes/ratings

Dreddi is:

> a reputation layer for real agreements between people.

Core idea:

> Promises tracked. Reputation earned.

The product exists between:
- verbal promises
- and formal contracts.

The system should always feel:
- lightweight
- social
- reputation-driven
- consequence-aware
- not bureaucratic.

---

## Agreement Model

### Agreement lifecycle

Canonical lifecycle:

1. Created
2. Accepted
3. Active
4. Completed
5. Fulfilled
OR
5. Disputed

Meaning:
- Created → invitation exists
- Accepted → both sides acknowledged
- Active → agreement is ongoing
- Completed → executor claims work is done
- Fulfilled → counterparty confirmed
- Disputed → counterparty rejected/challenged outcome

---

## Status Visualization Rules

### Timeline semantics

Green:
- reached/completed state only

Gold/Yellow:
- current attention state
- pending review
- next expected action

Gray/Muted:
- future/inactive states

Red:
- disputes/problems only

IMPORTANT:
Gold must NEVER visually look like “success”.

Example:
- When agreement is completed but awaiting review:
  - Completed = green
  - Fulfilled = gold/pending
  - NOT green

---

## Reputation Logic

### Reputation principles

- Only confirmed/disputed outcomes affect reputation
- Reputation is global per user
- No separate public/private reputation
- Private agreements still affect reputation
- Public visibility affects transparency only

### Reputation semantics

Reputation means:
- reliability
- accountability
- delivery consistency

NOT:
- popularity
- social score
- likes

---

## Public Agreements

### Why public agreements matter

Public agreements are one of Dreddi’s strongest differentiators.

They create:
- visible accountability
- social trust
- transparent execution history
- lightweight public monitoring

This is NOT social media.
This is NOT entertainment.
This is NOT “content”.

Public agreements create:

> observable reputation in action.

The important idea:
people can see how agreements evolve over time.

Not just:
- fulfilled
- failed

But:
- accepted
- delayed
- disputed
- reviewed
- publicly tracked

This creates a new layer between:
- anonymous reputation
- and formal references/contracts.

---

## Watchlist / Following

### Concept

Watchlist is:
- public agreements of OTHER users
- user is NOT a participant
- user subscribes to observe progress

This is NOT:
- bookmarks
- favorites
- saved drafts

This is:

> lightweight public monitoring of accountability.

Examples:
- following a startup founder’s public commitments
- following contractor agreements
- observing milestone execution
- monitoring public promises

The system should feel closer to:
- observing
- tracking
- transparency

NOT:
- collecting
- saving
- liking

---

## Watchlist UX Rules

- Watchlist must remain separated from personal deals
- Never mix watchlist agreements into regular agreements tabs
- Dedicated entry point required
- Users should immediately understand:
  “these are agreements I observe, not agreements I participate in”

### Naming

Preferred EN:
- Watchlist

Preferred UA:
- Стеження

Supporting UA description:
- Угоди інших користувачів, які ви відстежуєте

Supporting EN description:
- Public agreements you track

---

## Public vs Private

### Public agreements

Public agreements:
- visible on public profiles
- can be followed/watched
- visible in watchlists
- discoverable

### Private agreements

Private agreements:
- visible only to participants
- still affect reputation
- never appear publicly

---

## Notifications

### Notification principles

Notifications must:
- reflect actual state
- reflect actual timing
- avoid misleading urgency

Bad:
- “Deadline passed” BEFORE deadline

Good:
- “Deadline tomorrow”
- “Deadline in 24 hours”

### Tone

Notifications should feel:
- operational
- neutral
- consequence-aware

Avoid:
- emotional pressure
- moral judgement
- aggressive wording

---

## UI Philosophy

### General feel

Dreddi UI should feel:
- premium
- minimal
- calm
- structured
- consequence-aware

NOT:
- playful
- gamified
- noisy
- corporate-enterprise-heavy

---

## Cards

### Agreement cards

Rules:
- stable card heights
- avoid layout jumps
- status alignment consistent
- title readable first
- metadata secondary

### Icons

Icons must:
- read instantly
- avoid ambiguity
- avoid overlap of meanings

Examples:
- Eye = viewing/following context
- Bell = notifications only
- Bookmark = saving/bookmarking only

Never reuse one icon for unrelated concepts.

---

## Filters

### Filtering philosophy

Filters should:
- reduce noise
- preserve mental model
- not overload UI

Avoid:
- too many simultaneous toggles
- conflicting filter systems

### Sorting

Default sorting:
- newest or most relevant first
- closest deadlines higher priority
- stale agreements lower

---

## Invitations

### Invitation UX

Users must always be able to:
- reopen invite page
- copy invite link again
- resend agreement

Accepted or pending invites should never lose shareability.

---

## Groups

### Groups concept

Groups are:
- collections of agreements
- contextual organization
- not teams/chats/workspaces

Group UI should remain lightweight.

---

## Product Tone

### Language principles

Use:
- agreements
- accountability
- visibility
- reputation
- confirmation

Avoid:
- punishment
- guilt
- morality
- policing language

Dreddi should feel:
- neutral
- objective
- transparent

Not:
- authoritarian
- judgmental

---

## UX Consistency Rule

Whenever implementing new functionality:
- reuse existing lifecycle semantics
- reuse color semantics
- reuse mental models
- avoid introducing new interpretation rules

If a new feature breaks existing mental models:
- redesign the feature
- NOT the entire system

# Reputation evidence mapping

This document maps backend fields from `public_profile_stats` to the public profile UI copy.

| Backend field | UI section | UI text (EN) | Notes |
| --- | --- | --- | --- |
| `unique_counterparties_count` | Worked with | “Worked with {count} different people” | Uses localized number formatting. |
| `deals_with_due_date_count` | Commitments | “{count} deals had deadlines” | Shown only when value is available. |
| `on_time_completion_count` | Commitments | “{count} completed on time” | Shown only when value is available. |
| `disputed_count` + `total_confirmed_deals` | Disputes | “{count} disputes out of {total} deals” | Uses `total_confirmed_deals`, falls back to confirmed count if needed. |
| `reputation_age_days` | Deal pace | “active {count} days” | Shown as context for pace calculations. |
| `avg_deals_per_month` | Deal pace | “{count} deals per month” | Uses localized decimal formatting (1 decimal) and a 30-day minimum baseline in SQL. |

Empty/low-data behavior:
- If `total_confirmed_deals` resolves to 0, show “No completed deals yet” and hide all sections.
- If a section’s values are `null`, that section is hidden.
- Deal pace hides monthly rate when the user has fewer than 3 completed deals.

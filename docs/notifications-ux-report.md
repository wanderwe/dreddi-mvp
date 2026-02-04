# Notification UX report

## Audit (actionability)

| Notification type | Category | Rationale |
| --- | --- | --- |
| invite | Actionable | Requires the recipient to accept/decline the invite. |
| invite_followup | Actionable | Confirms acceptance and links back to the deal for next steps. |
| invite_declined | Informational | Outcome-only update; no follow-up action is required. |
| invite_ignored | Informational | Outcome-only update; no follow-up action is required. |
| due_soon | Actionable | Prompts the executor to review progress or update the deal before the deadline. |
| overdue | Actionable | Prompts the executor to update status or renegotiate due date. |
| completion_waiting | Actionable | Requires confirmation or dispute of completion. |
| completion_followup | Actionable | Confirms completion outcome and links back to details. |
| dispute | Actionable | Requires review of dispute details. |

## Copy updates

- Added explicit reason lines for: `due_soon`, `overdue`, `completion_followup`.
- Added explicit “no action needed” language for `invite_declined` and `invite_ignored`.
- Removed CTAs for informational notifications: `invite_declined`, `invite_ignored`.

## Removed notifications

- None in this iteration.

## Screenshots

- Not available in this environment (no running UI to capture before/after).

# Navigation pattern

## Single navigation standard

### Top app header (always)
- **Left:** Dreddi logo + product name.
- **Center:** primary navigation (1–2 links max) appropriate for the current scope.
- **Right:** actions cluster in this order:
  1. Language toggle
  2. Notifications
  3. User menu (avatar icon)

### User menu
- Profile / Settings
- Privacy Policy
- Terms
- Log out

> Privacy/Terms are not shown as standalone header links. They live in the user menu (and may also appear in the footer).

### Page header (inside content)
- Optional but consistent. If used, include:
  - Title (H1)
  - Secondary actions if needed
  - **Back button** when the page can be opened from multiple entry points

### Back button rule
Use the shared `<BackButton />` component everywhere.
- Label is localized: “Back” / “Назад”.
- Icon uses lucide-react.
- Behavior: `router.back()` if history exists; otherwise fall back to `fallbackHref`.

## Route inventory (normalized behavior)

### Public pages
| Route | Header | Back button |
| --- | --- | --- |
| `/` (Landing) | Minimal app header (sign in + language) | None |
| `/u` (Public profiles list) | App header + public profiles primary nav | Required (fallback: `/`) |
| `/u/[handle]` (Public profile) | App header + public profiles primary nav | Required (fallback: `/u`) |
| `/privacy` | App header (minimal) | Recommended (fallback: `/`) |
| `/terms` | App header (minimal) | Recommended (fallback: `/`) |

### Auth
| Route | Header | Back button |
| --- | --- | --- |
| `/login` | Minimal app header | Optional (fallback: `/`) |
| `/auth/callback` | No UI changes | None |

### App (logged in)
| Route | Header | Back button |
| --- | --- | --- |
| `/promises` (Deals list) | App header + primary nav | None |
| `/promises/new` (New deal) | App header + primary nav | Required (fallback: `/promises`) |
| `/promises/[id]` (Deal details) | App header + primary nav | Required (fallback: `/promises`) |
| `/notifications` | App header + primary nav | Required (fallback: `/`) |

## QA checklist
- Desktop + mobile layouts
- Header never overflows on narrow widths
- Back button uses history when available and falls back on direct opens
- No duplicate headers (global header only; page headers live in content)

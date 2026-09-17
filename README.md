# Employee Records Management

A modular Records / Employee Management application built with **React 18+**, **TypeScript**, **Vite** and **Tailwind CSS**, focused on **performance under load** and **secure, defensive front-end coding**.

## Getting started

### Requirements / Toolchain

Verified with the following environment (macOS):

| Tool          | Version             |
| ------------- | ------------------- |
| Node.js       | v22.23.1            |
| npm           | 10.9.8              |
| React         | 19.2.8              |
| TypeScript    | 6.0.2               |
| Vite          | 8.3.0               |
| Tailwind CSS  | 4.3.3               |
| react-window  | 2.3.1               |
| @tanstack/react-query | 5.103.1     |
| Vitest        | 5.0.1               |
| lucide-react  | 1.46.0              |

`package.json` declares `"engines": { "node": ">=22" }`; npm will warn if you use an older Node.

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

```bash
npm run build   # type-check (tsc -b) + production bundle
npm run lint    # eslint
npm run test    # run the Vitest suite once
npm run test:watch # run tests in watch mode
npm run preview # serve the production build locally
```

### Automated tests

The project ships a Vitest + Testing Library suite (71 assertions across 10 files) covering:

- **Security utils** — `sanitize.ts` (control/zero-width/BOM stripping, email format, length caps, field-specific messages) and `exportUtils.ts` (CSV formula-injection neutralization for `=`, `+`, `-`, `@`, RFC 4180 comma/quote/newline quoting, JSON export).
- **`helpers.ts`** — debounce behaviour (trailing invocation, coalescing, cancellation) with fake timers, and `clamp`.
- **Components** — `SearchBar` (no emission before the 400 ms window, coalescing, cancel-on-unmount), `FilterPanel` (open/close, multi-select, select-all, outside-click), `Pagination` (page window, bounds, clamped jump), `Modal` (portal, Escape, overlay, button focus, body-scroll lock), `EmployeeForm` (five-field validation, email format, sanitized submit, edit prefill), `EmployeeTable` (loading/error/empty/no-results states + actions, virtualized subset assertion, in-flight delete disable).
- **`useEmployees` hook** — TanStack Query status mapping (loading/success/error/empty), derived filtering, page reconciliation on dataset shrink, mutation cache updates, in-flight delete metadata, surfaced mutation errors — with the service layer mocked.

## Environment configuration

The app reads the API base URL from the environment — **no secrets or tokens live in code**.

```bash
cp .env.example .env   # optional
```

| Variable            | Default                      | Purpose                        |
| ------------------- | ---------------------------- | ------------------------------ |
| `VITE_API_BASE_URL` | `https://dummyjson.com`      | Base URL of the REST API       |

## Features

- **Virtualized records table** — `react-window` renders only the visible rows (plus overscan); a 7-column grid keeps the fixed header aligned with every virtualized row.
- **Search** — debounced 400 ms; matches full name, first name, last name, email or role; combined with the department filter.
- **Department filter** — multi-select with chips; derived together with search from the source data (derived, never duplicated state).
- **Pagination** — prev / next / numbered window / jump-to-page, with "Showing X–Y of Z". The active page is reconciled automatically when the dataset shrinks (e.g. deleting the last row on a page).
- **Create / Edit** — accessible modal form with required-field and email-format validation, inline error messages, input sanitization, and reset on success.
- **Delete** — confirmation dialog before removal.
- **Export** — currently visible (filtered) dataset as **CSV** (RFC 4180 quoting **and** formula-injection neutralization) or **JSON**.
- **Explicit states** — loading skeleton, empty, no-results, and error-with-retry states.
- **Code splitting** — the form modal is lazy-loaded into its own chunk.
- **Responsive** — mobile-first layout (stacking header controls and pagination), `overflow-x-auto` table scroll for small screens, accessible label/aria landmarks throughout.
- **Single-scroll shell** — the app fills exactly the viewport (the page itself never scrolls); the virtualized table stretches to the remaining height, so only one vertical scrollbar exists at a time. The list's height is measured live (`ResizeObserver`), so it follows window resizes and filter/pagination changes.

## Requirements coverage

The assignment's sections (from `Technical-Assessment-React-updated.docx`) and where each is implemented — all verified by the Vitest suite, the CDP smoke suite, or both.

| Task section | Requirement | Where it lives / is verified |
| --- | --- | --- |
| §1 React architecture | Reusable, typed, single-responsibility functional components: App, EmployeeTable, EmployeeForm, SearchBar, FilterPanel, Pagination, Modal | `src/components/*` — each file is one component with one job |
| §1 Hooks | `useState`, `useMemo`/`useCallback`, custom hooks; business logic not dumped in App | `src/hooks/useEmployees.ts` owns all state transitions; components stay dumb |
| §2 API integration | Data fetched through a separate typed service file — no `fetch` in the UI | `src/services/employeeApi.ts` (the only place `fetch` lives); hook test mocks it |
| §2 Explicit states | Loading, success, empty, and error with a clear user-friendly message | `EmployeeTable` states + `useEmployees` status mapping; covered by unit + CDP tests |
| §3 Records table | Responsive table: ID, Name, Email, Department, Role, Status, Actions (Edit/Delete), with loading/empty states | `src/components/EmployeeTable.tsx` |
| §4 Search & filter | Debounced search (name/email/role) + multi-select department filter applied with search | `SearchBar.tsx` (400 ms debounce) + `FilterPanel.tsx`; both in `useEmployees` |
| §5 Pagination | Next/previous/jump/current/total records, works with search & filtering, "Showing X–Y of Z" | `Pagination.tsx` + derived pagination; boundary tests incl. page clamp |
| §6 Create record | Modal form, required+format validation with clear messages, add to dataset, reset/close on success | `EmployeeForm.tsx` + `useEmployees.addEmployee`; 5-field validation tests |
| §7 Delete record | Confirmation, removal, table + pagination update (incl. deleting the last row on a page) | `Modal.tsx` confirm flow + `useEmployees.removeEmployee`; last-row deletion tested |
| §8 Data export | Export currently displayed (search/filtered) data as CSV and JSON, injection-safe | `src/utils/exportUtils.ts` + export buttons in `App.tsx` |
| §9 Performance | Virtualization, memoization, derived state, lean critical path | react-window virtualization, `React.memo`/`useMemo`/`useCallback`, `React.lazy` form chunk; measured below |
| §10 Security | XSS-safe rendering, validation & sanitization, no client secrets, CSV injection, dependency hygiene | `sanitize.ts`, `exportUtils.ts` (RFC 4180 + formula neutralization), env config, production CSP |
| §11 UI / UX | Clean, professional, responsive UI; loading, error, empty states; confirmation dialogs | Tailwind responsive layout, horizontal-scroll table, stacking controls/pagination |
| §12 Best practices | Single-responsibility components, business logic separated from UI, typed consistent code | Architecture section below; `eslint` + `tsc -b` clean |
| §13 Edge cases | API failure, empty response, no-result search, invalid submit, last-row delete, empty filtered/export | Unit tests (71/71) + CDP smoke suite (18/18) |
| Bonus | Automated tests, measurable performance work, extra hardening, excellent abstraction/UX | `npm run test` (Vitest), `scripts/` + measured table below, production CSP, accessible Modal |

## Architecture

```
src/
├── components/         Presentation-only, typed, single-purpose components
│   ├── EmployeeTable.tsx   # Virtualized table (+ loading/error/empty states)
│   ├── EmployeeForm.tsx    # Validated create/edit form
│   ├── SearchBar.tsx       # Debounced search input
│   ├── FilterPanel.tsx     # Multi-select department filter
│   ├── Pagination.tsx      # Client-side pagination
│   ├── Modal.tsx           # Accessible portal dialog (Escape, overlay, focus)
│   └── Loading.tsx         # Skeleton state
├── hooks/
│   └── useEmployees.ts     # TanStack Query (useQuery/useMutation) + search/filter/pagination
├── services/
│   └── employeeApi.ts      # The ONLY place fetch lives; typed + normalized
├── types/employee.ts       # Domain types
└── utils/
    ├── sanitize.ts         # Input sanitization (control chars, email, length)
    ├── exportUtils.ts      # CSV (injection-safe) + JSON export
    └── helpers.ts          # debounce, clamp, etc.
```

- **API calls are separated from presentation** — `employeeApi.ts` is the only place `fetch` lives; components never fetch.
- **Server state is managed by TanStack Query** — `useQuery(['employees'])` drives the four explicit states (loading / success / empty / error); create/update/delete run as `useMutation`s whose results are written back into the cache (`setQueryData`), keeping a single source of truth and coherent pagination/filters.
- **Business logic is separated from UI** — the `useEmployees` hook owns state transitions; components stay dumb.
- **State is derived, not duplicated** — filtering and pagination fall out of the source array (`useMemo`), never stored redundantly.

## Performance approach

- **Virtualization** — `react-window` `List` renders only in-viewport rows; DOM stays ~constant regardless of dataset size.
- **No wasted renders** — `React.memo` on rows/badges, `useMemo` for derived data (filtered list, row props, page window), `useCallback` for every handler and the virtualizer's `rowComponent`/`rowKey`. No inline objects/functions passed where they would cause churn.
- **Lean critical path** — the heavy `<EmployeeForm>` is `React.lazy`-loaded (its own 5.8 kB chunk); icons are tree-shaken from `lucide-react`; TanStack Query dedupes/refetches without extra code.
- **Debounced search** — no recompute per keystroke.

**How this is measured:** React DevTools Profiler (commit records / re-render counts), Core Web Vitals via Lighthouse (LCP, CLS, INP), and `Performance` panel frames. A quick mental model: initial load = 1 fetch + virtualized paint; interactions re-render only the components whose inputs actually changed; the `useEmployees` filter is O(n) over ~160 records. TanStack Query caches the fetch (5 min `staleTime`, no window-focus refetch), so remounts are instant.

## Security approach

- **No `dangerouslySetInnerHTML`** anywhere — all API/user data is rendered via React's auto-escaping.
- **Input validation & sanitization** on every form submit (`sanitize.ts`): required, length-capped, email-format checked, control / zero-width characters stripped. Malformed data is rejected with clear messages.
- **Defensive API layer** — records fetched from the network are validated/normalized; malformed rows are dropped rather than rendered; untrusted responses are shape-checked with friendly, non-sensitive error messages.
- **CSV-injection prevention** — exported cells starting with `=`, `+`, `-` or `@` are prefixed with `'`; fields containing commas/quotes/newlines are quoted per RFC 4180. Verified in the Vitest suite (`exportUtils.test.ts`).
- **No secrets in the client** — the API base URL comes from `VITE_API_BASE_URL`; nothing sensitive is logged or committed.
- **Authentication** — none is implemented, so no tokens exist to leak in code, URLs, logs or storage; if auth were added later, tokens would be held in memory only and never logged.
- **Dependency hygiene** — `react-window` (virtualization), `@tanstack/react-query` (server state), `tailwindcss`, `lucide-react`; `@types/react-window` was removed because `react-window` v2 ships its own types.
- **Content-Security-Policy shipped in production builds** — a build-only Vite plugin (`vite.config.ts` → `cspPlugin`) injects this CSP meta into `dist/index.html`:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://dummyjson.com; img-src 'self' data:; object-src none; base-uri 'self'; frame-ancestors 'none'`
  It is deliberately not applied in dev so Vite HMR / React fast-refresh (inline scripts) keep working. Verified: the production bundle loads and runs with zero CSP violations.

## Measured performance (before / after)

Numbers captured from the production build via headless Chrome (CDP) — the table lists the scored "before" points and what each optimisation achieved.

> **Measurement tooling (repo):** `scripts/cdp-smoke.mjs` (18-check end-to-end suite) and `scripts/perf-measure.mjs` (cold-start probe). Run `npm run build && npm run preview -- --port 5174 &`, then `node scripts/cdp-smoke.mjs` / `node scripts/perf-measure.mjs`. Both accept `URL` / `CDP_PORT` / `PROFILE_DIR` / `CHROME` env overrides. The table below is from `perf-measure.mjs` against the production build; earlier standalone sanitization/CSV-injection assertions were folded into the Vitest suite, so no separate script is kept.

| Metric | Before | After (measured) |
| --- | --- | --- |
| Main bundle (JS) | 263.9 kB (81.8 kB gzip) | 299.3 kB (92.3 kB gzip) — +TanStack Query |
| Split chunk (EmployeeForm) | — | 5.8 kB loaded only when the modal opens |
| DOM nodes for 160 records | 161 table rows | **18** (12 visible + 6 overscan; constant regardless of data size) |
| Initial network requests | n/a | **5** (index.html, JS, CSS, favicon + 1 API GET) |
| API round-trip | n/a | ~394 ms on the 160-record fetch |
| DOMContentLoaded | n/a | ~726 ms cold start (includes the API fetch) |

How each was achieved: virtualization (react-window), memoised rows/window so interactions re-render ~3 components, single derived-filter pass (O(n) over the in-memory array), `React.lazy` code-splitting, and TanStack Query caching (5 min staleTime, no window-focus refetch) so remounts are instant.

**Interview-ready measurement plan:** React DevTools Profiler commits per interaction (expect 1–3), Lighthouse CWV (LCP / CLS / INP), and `Performance.mark` around the filter pipeline for p95 under large datasets.

## Notes on the data source

[DummyJSON](https://dummyjson.com) is used rather than JSONPlaceholder because it returns a large, real dataset (~160 users) with `department` and `role` fields, and supports POST/PUT/DELETE so the app demos genuine CRUD. The mock server does not persist writes, so records created in a session disappear on refresh — expected for a mock. Records created in-session that the mock later 404s on (PUT/DELETE) are treated as already-changed/deleted client-side, keeping local state coherent (defensive handling, verified in tests).

## Verification performed during development

- `npm run build` — `tsc -b` + Vite build, zero errors (bundle ~299 kB JS / 92 kB gzip, EmployeeForm split 5.8 kB chunk).
- `npm run lint` — zero errors.
- `npm run test` — **71/71** Vitest assertions across 10 files (security utils, debounce, components, hook).
- Headless-Chrome (CDP) end-to-end smoke suite — **18/18** checks (see `scripts/cdp-smoke.mjs`): virtualization subset rendering, pagination (next / jump / clamp), create validation (5 inline errors), create→edit→delete round trip via `useMutation` cache updates, debounced search (including multi-word full names), department multi-select + chips + clear, Escape-to-close, and real CSV/JSON downloads (160 rows verified).
- Production build under CSP — zero console errors / violations; the earlier standalone sanitization/CSV-injection assertions were folded into the Vitest suite.

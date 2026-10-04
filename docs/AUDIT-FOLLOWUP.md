# PDF audit follow-up — enlisted

Source: GitHub Portfolio Technical Audit, 2026-10-03, pages 11–12.
Duplicate dependency entries are consolidated below.

| Finding | Resolution and evidence |
| --- | --- |
| P1 Windows official build failure | Fixed resolved local Vite CLI invocation; official build/preview work on Windows; CI requires Ubuntu and Windows. |
| P2 typecheck/lint failures | Fixed pathfinding const errors and shared catch block; typecheck/lint pass against the current main. |
| P2 vulnerable dependencies (duplicate) | Repaired inconsistent lock and applied compatible security updates; audit gates include development dependencies. |
| P2 no repository E2E suite | 4 production Chromium cases cover desktop/mobile career creation, mission deployment, renderer readiness, keyboard movement/pause, reload persistence, export and invalid import. CI installs the browser explicitly. |
| P2 combat/mission/save coverage | 15 domain/storage/input tests cover objective gating/capture, win/fail reports/civilian penalties, promotion thresholds/unlocks, blocked pathfinding, legacy migration, backup recovery, reset, quota/private storage, newer versions and input edges. |
| P3 warning/real-device/long-session verification | Real device touch/audio and deployed integration warnings remain external; local application page errors are asserted. |

Fixed saves that wrote a backup but never loaded it, prevented reset from resurrecting
old progress, validated existing partial saves, and added portable export/import.
Fast key taps are buffered until the simulation samples them. Combat now displays
loading and retryable errors while assets load; three asset groups start concurrently.
Browser checks wait for actual movement/rendering, rather than accepting a black
canvas element as a working game.

The standalone repository omitted authoring-tool files required by platform tests.
Their brand/atomic-write contract is maintained in `docs/BRAND-CHECK.md`; all those
checks remain active. The optional auth schema source is restored under the excluded
`migrations/auth` directory and does not enable a database or sign-in.

Local result: 197 script scaffold + 32 app-data/auth tests; 15 domain tests; 4 E2E
cases; typecheck, lint and official production build pass. Full mission balance,
all promotion paths through manual play, physical touch and long sessions remain unverified.

## Validation and reproduction

Node 22 / npm 10. `npm ci --ignore-scripts`, `npm audit --audit-level=high`,
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
`npx playwright install chromium`, `npm run test:e2e`.
The repository's official Vite wrapper is used for the production build and browser preview.
`test:scaffold` reports platform helper tests separately from `test:domain` game tests.
GitHub Actions runs the same gates and Chromium E2E on Ubuntu and Windows. Browser
traces/screenshots are uploaded on failures. Browser tests use fresh storage for each case.

The dependency lock was repaired because a fresh `npm ci` failed on the newer main
branch. `npm audit fix` updated compatible transitive versions (brace-expansion and
js-yaml); the complete and production-only audits now report zero vulnerabilities.
The old PDF snapshot is not the current dependency graph. This is a dated scan,
not a guarantee against future advisories. fast-uri resolves to 3.1.8 in the current graph.

The wrapper executes the resolved local Vite JS CLI through `process.execPath`,
preserving arguments, environment precedence, signals and failure exit status.
`app-env.json` keeps this public game auth-off on a clean clone; optional `.grok`
settings override it and process environment overrides both. Existing platform
branding, helpers and deployment configuration are preserved. Rebuildable deployment
output is ignored instead of committing machine-specific generated bundles.

Platform regression tests now use an isolated blank OG workspace when testing
fallback metadata; they no longer inherit the real game's title/card. Windows
directory-link tests use junctions without needing administrator symlink privileges.
No test cases, lint rules, vulnerability gate or bundle threshold were disabled.

## Limits that remain explicit

Browser saves are local, user-controlled and not an anti-cheat or server durability
boundary. Manual JSON export/import provides a portable backup, not automatic cloud
sync. An authenticated shared service requires a separate product and deployment
choice; this change adds no unauthenticated shared database. Newer save versions
are preserved instead of silently overwritten. Exports are local JSON files, imports
are size-limited, validated and confirmed before replacement.

Desktop Chromium and emulated mobile viewport checks do not prove real iOS/Android
touch/audio behavior, long-session memory stability, production provider behavior,
or low-end device frame rates. No deployment or merge was performed. The provider's
external Grok extension can be blocked by its cross-origin response; it is retained
and is recorded as an external integration warning. Application uncaught errors are
asserted by the browser suite. Physical audio listening and long play sessions remain
external verification tasks.

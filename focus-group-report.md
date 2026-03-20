# Practice Forge — Focus Group Report

**Date:** 2026-03-20
**Method:** 18 independent agent evaluations across 4 categories
**Scope:** Full codebase review (client + server) — feature-complete through Phase 17

---

## Executive Summary

### Overall Scores

| #   | Persona   | Role                             | Score |
| --- | --------- | -------------------------------- | ----- |
| 1   | Maya      | Conservatory flute student       | 7.0   |
| 2   | Kenji     | Professional orchestral flautist | 6.0   |
| 3   | Priya     | Adult amateur returner           | 6.5   |
| 4   | Diego     | Jazz/contemporary saxophonist    | 5.0   |
| 5   | Zoe       | Pre-conservatory student, 16     | 6.5   |
| 6   | Sarah     | Private flute teacher            | 5.0   |
| 7   | Marcus    | Music ed-tech PM                 | 7.0   |
| 8   | Lin       | Music school director            | 5.0   |
| 9   | Alexei    | VC analyst                       | 7.0   |
| 10  | Rachel    | Competitor analyst               | 7.0   |
| 11  | Tomoko    | UX designer                      | 7.0   |
| 12  | James     | Accessibility auditor            | 6.0   |
| 13  | Fatima    | Full-stack code reviewer         | 5.0   |
| 14  | Raj       | Mobile/PWA specialist            | 5.0   |
| 15  | Dr. Elena | Music psychologist               | 6.5   |
| 16  | Takeshi   | Audition panel member            | 5.5   |
| 17  | Nadia     | Professional accompanist         | 5.0   |
| 18  | Chris     | Music content creator            | 6.5   |

**Mean Score: 6.0 / 10**
**Median Score: 6.0 / 10**
**Range: 5.0 – 7.0**

### Would Use/Recommend Summary

| Response                  | Count | Personas                                                  |
| ------------------------- | ----- | --------------------------------------------------------- |
| Yes                       | 3     | Maya, Marcus, Alexei                                      |
| Maybe (leaning yes)       | 4     | Kenji, Zoe, Rachel, Chris                                 |
| Maybe (with reservations) | 8     | Priya, Diego, Lin, Tomoko, James, Raj, Dr. Elena, Takeshi |
| Not yet                   | 3     | Sarah, Fatima, Nadia                                      |

### Top Consensus Themes

These themes emerged independently from multiple personas without coordination:

1. **The audition prep workflow is fragmented** (Maya, Kenji, Takeshi, Rachel, Marcus) — excerpts, auditions, and recordings exist as disconnected pages. The `repertoire` field on auditions is in the DB but not exposed in the UI.

2. **The Teacher Studio tier is vaporware** (Sarah, Lin, Fatima, Alexei, Marcus) — the pricing page advertises student roster management, assignments, lesson notes, and a student insights dashboard. None of these exist in the codebase. Zero teacher-specific tables in the schema.

3. **No multi-tenancy / user data isolation** (Fatima, Lin) — core tables (`pieces`, `exercises`, `excerpts`, `practice_sessions`, `settings`) have no `user_id` column. All data is globally shared. This is a launch-blocking bug.

4. **The instrument field is stored but never used** (Diego, Rachel, Alexei, Nadia) — `instrument` exists in the user profile but doesn't affect the AI system prompt, rule generator range constants, or pitch analysis. The app is hard-coded for flute.

5. **Community features are paywalled behind Pro, creating a cold-start problem** (Zoe, Marcus, Alexei, Chris) — the entire social layer (feed, follow, challenges) requires a $16/month Pro subscription, ensuring the community remains empty for most users.

6. **No PWA / offline support** (Raj, Alexei) — zero PWA infrastructure (no manifest, no service worker). Musicians practice in rooms with spotty WiFi.

7. **Retention hooks drop off after 7 days** (Marcus, Priya, Dr. Elena) — milestone toasts cover first piece, first session, 3-day streak, 7-day streak. Then nothing until 100 hours. Enormous motivation gap for months 2-10.

8. **No shareable progress moments** (Chris, Zoe) — no share buttons, no exportable progress cards, no public profile URLs. The app's best moments are invisible outside the app.

---

## Findings by Category

### UX & Design

**Strengths identified:**

- Token/theme system with three themes, semantic naming, and `--pf-` namespace (Tomoko: "genuinely professional")
- Experience-level progressive disclosure via `useExperienceLevel` (Tomoko, Marcus, Priya)
- Consistent empty states with educational, actionable copy (Tomoko)
- Session page as a coherent state machine: idle → generate → plan → active → rate → complete (Tomoko)
- QuickLogFab bottom-sheet modal pattern (Raj, Priya)

**Weaknesses identified:**

- Silent redirect for level-gated routes — no explanation shown (Tomoko)
- Hardcoded hex colours in PostPlayReport break theme consistency (Tomoko, James)
- Duplicate quick-log affordances on Dashboard (FAB + inline card) (Tomoko)
- Hover-only UI patterns break on touch: delete template button, excerpt info tooltip (Raj)
- No "locked feature" explanation when level-gated routes redirect (Tomoko)
- Dashboard feels professional-centric even in beginner mode — excerpt widget shown with intimidating language (Priya)
- No 15-minute session option for time-constrained users (Priya)

### Features & Functionality

**Strengths identified:**

- Excerpt rotation algorithm: staleness + status weight + audition urgency + difficulty diversity (Maya, Kenji, Sarah, Takeshi, Nadia — universally praised)
- Session planner with auto-generated blocks, per-block timer, inline metronome and recorder (Maya, Kenji, Marcus, Rachel, Tomoko)
- Score analysis pipeline: OMR → MusicXML → pattern detection → optional Claude enhancement (Maya, Kenji, Rachel, Takeshi)
- Flute-specific AI analysis with breathing points, alternate fingerings, technique warnings (Maya, Kenji)
- Challenge system with 6 types, invite-by-search, auto-ranking, feed events (Zoe, Chris)
- Theme gallery with community sharing, favouriting, download counts (Zoe, Chris)
- Drift analytics detecting neglected categories over trailing 14 days (Sarah, Dr. Elena)

**Weaknesses identified:**

- Auditions page is a date + notes field — no repertoire list, no readiness dashboard, no round tracking (Maya, Kenji, Takeshi)
- No recording comparison / trend view across sessions (Kenji, Takeshi)
- No pre-loaded excerpt library — all manual entry (Kenji, Rachel)
- Rhythm accuracy unimplemented (`rhythm_accuracy: 0` with "not yet implemented" comment) (Rachel)
- No simulated audition mode (random excerpt order, timed, recorded) (Takeshi)
- Session planner cannot be manually edited before starting (Maya)
- No in-block note-taking during active practice (Tomoko, Dr. Elena)
- No improvisation practice primitives for jazz users (Diego)
- No collaborative/ensemble features (Nadia)
- No score annotation capability (Nadia)
- Onboarding has no "returner" profile type (Priya)

### Technical & Architecture

**Strengths identified:**

- N+1 query prevention throughout — bulk fetches with `ANY($1)` mapping (Fatima)
- Path traversal protection on file downloads via `pathSafe.js` (Fatima)
- CORS allowlist, Stripe webhook signature verification, UUID filenames (Fatima)
- Comprehensive test infrastructure with 18 route test files, mock pool, SQL pattern matching (Fatima)
- 44px minimum touch targets enforced in Button and Input components (Raj)
- Solid mobile navigation with off-canvas drawer, body scroll lock, route-change auto-close (Raj)

**Weaknesses identified:**

- **CRITICAL: No `user_id` on core tables** — pieces, exercises, excerpts, sessions, settings are globally shared (Fatima, Lin)
- **CRITICAL: Auth bypass defaults to ON** — if `AUTH_REQUIRED` env var is missing, entire API is open (Fatima)
- Settings table is a global key-value store with no user scoping (Fatima, Lin)
- `tierLimits.js` count queries have no user filter — limits are shared across all users (Fatima)
- No database transactions for multi-step writes (Fatima)
- No PWA manifest, service worker, or offline capability (Raj)
- AI system prompt hardcoded to "professional flautists" (Diego, Rachel)
- Rule generator range constants hardcoded to flute (MIDI 60-96) (Diego, Rachel)

### Business & Growth

**Strengths identified:**

- Tier system correctly designed: free limits tight enough to frustrate, generous enough to validate (Marcus)
- Per-student pricing on Teacher tier ($49 + $3/student) aligns with studio growth (Alexei)
- Experience-level gating reduces day-one overwhelm (Marcus)
- Score analysis + AI exercise generation is a genuine differentiator vs SmartMusic/Modacity/Tonara (Rachel, Alexei)

**Weaknesses identified:**

- Teacher Studio tier is unbuilt — $49/month buys the same features as Pro (Sarah, Lin, Marcus, Alexei, Fatima)
- Single-instrument TAM constraint — app is de facto flute-only despite accepting other instruments (Alexei, Diego, Rachel)
- Community cold-start: social features behind Pro paywall means empty feed for 95%+ of users (Marcus, Zoe, Alexei, Chris)
- Onboarding funnel is 2 steps (instrument + level) with no "aha moment" (Marcus)
- No push notifications / email digest for retention (Marcus, Zoe)
- No demo/sandbox mode for pre-signup experience (Marcus)
- No public profile URLs for virality (Chris)
- App positioned as general practice tool but built as flute audition prep — identity tension (Rachel)

### Accessibility (WCAG 2.2)

**Strengths identified:**

- OS preference detection: `prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme` (James)
- Focus trap and scroll lock on modals with proper restore (James)
- Semantic landmarks, skip-to-content link, `aria-hidden` on decorative icons (James)
- CVD simulation modes (deuteranopia, protanopia, tritanopia) in settings (James, Lin)

**Weaknesses identified:**

- Focus rings suppressed on inputs via `focus-visible:ring-0` and `focus:outline-none` — violates WCAG 2.4.11 (James)
- Colour-only status in bar grids, pitch traces, and heatmaps — no text/pattern fallback (James)
- Missing `aria-pressed` on toggle button groups (duration selector, time signature) (James)
- `useFocusTrap` not applied to QuickLogFab modal or session rating overlay (James)
- No live region announcements for metronome start/stop or recording state (James)
- Recording/analysis features are entirely visual — screen reader users get silence (James)

### Practice Science & Methodology

**Strengths identified:**

- Excerpt rotation approximates spaced repetition (staleness + status weighting) (Dr. Elena)
- Session blocks enforce time-bounded deliberate practice with accountability (Dr. Elena)
- Drift analytics surface self-regulation failures (Dr. Elena)

**Weaknesses identified:**

- No actual forgetting curve / SRS algorithm (no ease factor, no retention model) (Dr. Elena)
- Streak mechanics have no rest-day grace period — anxiety-producing for motivated populations (Dr. Elena)
- No progressive overload / difficulty sequencing in exercise generation (Dr. Elena)
- No in-block data capture about what happened — sessions log time, not learning (Dr. Elena)
- No interleaving toggle for technique blocks (Dr. Elena)

---

## Prioritised Action Items

### Must-Fix (Launch Blockers)

1. **Add `user_id` to all core tables and scope all queries** — Without this, every user sees every other user's data. The entire app is single-tenant. (Fatima, Lin)

2. **Invert the auth bypass default** — Change from `AUTH_REQUIRED !== "true"` to require explicit `AUTH_BYPASS === "true"`. Current default exposes the entire API if the env var is missing. (Fatima)

3. **Remove or honestly label Teacher Studio tier** — Either build the roster/assignment/lesson-notes features or remove the tier from the pricing page. Selling unbuilt features is a trust-destroying liability. (Sarah, Lin, Marcus, Alexei, Fatima)

### Should-Fix (High Impact)

4. **Wire the `instrument` field through to AI prompts and rule generator** — The user profile stores instrument but it changes nothing. Propagating it to `aiGenerator.js` system prompt and `ruleGenerator.js` range constants transforms flute-only into instrument-agnostic. (Diego, Rachel, Alexei, Nadia)

5. **Build the audition repertoire dashboard** — Expose the existing `repertoire` field in the Auditions UI. Show per-excerpt readiness status against a specific audition date. Connect auditions → excerpts → recordings into one view. (Maya, Kenji, Takeshi)

6. **Add PWA manifest + service worker** — `vite-plugin-pwa` with cache-first app shell. Add `manifest.json`, `theme-color` meta, app icons. Half a day of work for a transformative mobile experience. (Raj, Alexei)

7. **Open community feed to Solo/free tier (read-only)** — Move the `requireTier` gate so free/Solo users can see the feed and view challenge leaderboards. Gate creation/participation at Pro. Solves the cold-start problem. (Marcus, Zoe, Alexei, Chris)

8. **Fix focus ring suppression on inputs** — Remove `focus-visible:ring-0` from `Input.tsx`, use `--pf-focus-ring` token. One-line fix with major accessibility impact. (James)

9. **Add text/pattern fallback to colour-coded visualisations** — Status letters or icons inside bar-result grid cells. Summary text for pitch accuracy. Replace hardcoded hex with theme tokens. (James, Tomoko)

10. **Add more milestone/achievement thresholds** — Fill the gap between 7-day streak and 100 hours: 10 hours, 25 hours, 14-day streak, first piece marked Solid, etc. (Priya, Marcus, Dr. Elena)

### Nice-to-Have (Growth & Polish)

11. **Shareable progress cards** — Canvas-rendered image card with streak, hours, achievements. Share to clipboard/social. (Chris, Zoe)

12. **In-session block editing** — Allow reordering, duration changes, and ad-hoc blocks before pressing Start. (Maya)

13. **Simulated audition mode** — Random excerpt order from an audition's repertoire list, timed, recorded, sequential. (Takeshi)

14. **Recording comparison / trend view** — Side-by-side playback of two recordings. Sparkline of pitch accuracy over time per excerpt. (Kenji, Takeshi)

15. **Pre-seeded excerpt library** — Standard orchestral flute excerpts (expandable to other instruments). Reduces onboarding friction. (Kenji, Rachel)

16. **Push notifications / email digest** — Weekly summary: hours, streak, stale pieces, audition countdown. Cron job + mailer. (Marcus)

17. **"Returner" profile type in onboarding** — "I played before — picking it back up" option with appropriate language and defaults. (Priya)

18. **Streak recovery / rest day grace period** — Configurable grace days that don't break streak. Or replace streak with consistency score. (Dr. Elena)

19. **Demo/sandbox mode** — Pre-signup experience of one full session with example data. (Marcus)

20. **Public profile pages** — `/u/username` visible without login, showing achievements and stats. (Chris)

21. **Score annotation layer** — Write mode in ScoreViewer for pencil marks, breath marks, cues. (Nadia)

22. **Locked-feature explanation screen** — Replace silent redirect with "This unlocks at [level]" banner. (Tomoko)

23. **15-minute quick session option** — Single warm-up + one repertoire block for time-constrained days. (Priya)

24. **Replace hover-only patterns with touch-accessible alternatives** — Delete button, info tooltips. (Raj)

25. **`aria-pressed` on toggle button groups** — Duration selector, time signature selector, onboarding grid. (James)

---

## Feature Requests — Ranked by Frequency

| Feature                                        | Requested By                         | Count |
| ---------------------------------------------- | ------------------------------------ | ----- |
| Audition repertoire dashboard / readiness view | Maya, Kenji, Takeshi, Marcus, Rachel | 5     |
| Wire instrument field to AI/generators         | Diego, Rachel, Alexei, Nadia         | 4     |
| Open community to free/Solo tier               | Marcus, Zoe, Alexei, Chris           | 4     |
| Teacher dashboard / roster / assignments       | Sarah, Lin, Marcus, Alexei           | 4     |
| Shareable progress cards / moments             | Chris, Zoe, Marcus                   | 3     |
| Recording comparison / trend view              | Kenji, Takeshi, Rachel               | 3     |
| Push notifications / email retention           | Marcus, Zoe, Dr. Elena               | 3     |
| PWA / offline support                          | Raj, Alexei, Nadia                   | 3     |
| Pre-seeded excerpt library                     | Kenji, Rachel, Takeshi               | 3     |
| More milestone/achievement thresholds          | Priya, Marcus, Dr. Elena             | 3     |
| Simulated audition mode                        | Takeshi, Kenji                       | 2     |
| In-session block editing                       | Maya, Tomoko                         | 2     |
| Session block note-taking                      | Tomoko, Dr. Elena                    | 2     |
| Public profile pages                           | Chris, Zoe                           | 2     |
| Streak grace period / rest days                | Dr. Elena, Priya                     | 2     |
| Score annotation                               | Nadia, Kenji                         | 2     |
| Demo/sandbox mode                              | Marcus, Rachel                       | 2     |
| Returner profile type                          | Priya                                | 1     |
| Improvisation practice primitives              | Diego                                | 1     |
| Breathing mark visualisation on score          | Maya, Kenji                          | 2     |
| Rhythm accuracy implementation                 | Rachel                               | 1     |
| Locked-feature explanation screen              | Tomoko                               | 1     |
| Weekly platform-wide challenge                 | Chris                                | 1     |
| Difficulty-aware exercise sequencing           | Dr. Elena                            | 1     |
| Interleaving toggle for technique blocks       | Dr. Elena                            | 1     |

---

## Verbatim Killer Insights

> **Maya (Conservatory Student):** "The app has all the right data — excerpt statuses, audition dates, rotation scores, session history, AI breathing point analysis — but it does not synthesise them into a single 'you have an audition in 23 days, here is exactly what still needs work' answer."

> **Kenji (Professional Flautist):** "The tool is built as a general music practice app that happens to have excerpt features, but it needs to be an audition preparation system that also handles general practice."

> **Priya (Adult Returner):** "The app conflates 'beginner' with 'new student' when its most underserved user is the adult returner — someone who has musical context and intelligence but zero current consistency."

> **Diego (Jazz Saxophonist):** "The app has an `instrument` field in the user profile that goes absolutely nowhere. That one field, if wired into the AI system prompt and the range constants, would transform this from a 'flute app that happens to accept other instrument names' into a genuinely instrument-agnostic practice tool."

> **Zoe (16yo Student):** "The best feature is invisible to 90% of users. The community/challenges system is the most original part of the whole app — and it's gated behind a paywall, buried under 'More' in the sidebar, and has zero notification system."

> **Sarah (Private Teacher):** "The pricing page is the product's biggest liability right now. Either build the teacher side properly or remove the Teacher Studio tier entirely. A half-built solo app can grow; a broken promise to an institution kills the relationship on day one."

> **Marcus (Ed-Tech PM):** "The session planner is the product, but no one lands in it. Build a single, visceral demo of the session planner that a prospective user can experience without creating an account, in under 90 seconds."

> **Lin (School Director):** "The Teacher Studio tier reads as complete, but schema.sql contains zero teacher-specific tables. If a school director signs up and discovers the features are missing, that is a chargeback and a bad review."

> **Alexei (VC Analyst):** "The team should invert the acquisition motion: go to conservatories, sign one teacher, and let that teacher onboard their whole studio. That is a B2B2C motion with a CAC that can actually justify the LTV."

> **Rachel (Competitor Analyst):** "The app is secretly two products wearing one coat. If it commits to flute-specific, lean in aggressively. If it wants to be general classical musician, abstract the instrument layer immediately. Right now it is neither fully."

> **Tomoko (UX Designer):** "The app is designed around sessions as the unit of practice, but musicians think in terms of problems. A musician sits down and thinks: 'I can't nail bar 47.' Build a path from a specific technical demand directly into a focused session block."

> **James (Accessibility Auditor):** "The app has two accessibility tiers and only knows about one of them. Visual accessibility is thoughtful. But the recording and analysis core is entirely visual — a screen reader user can start a session but cannot interpret any of the audio feedback."

> **Fatima (Code Reviewer):** "The auth middleware and schema were built in parallel tracks that never merged. Auth treats 'authenticated' as equivalent to 'authorised to see everything.' Run `SELECT COUNT(*) FROM pieces WHERE user_id IS NOT NULL` — it will return an error."

> **Raj (PWA Specialist):** "The app is designed for mobile but not built for mobile. Adding `vite-plugin-pwa` with a cache-first strategy would cost an afternoon and turn this from 'a website that works on phones' into 'a mobile app.'"

> **Dr. Elena (Music Psychologist):** "The tool is built around scheduling practice but collects almost no data about what happened inside each block. Until it can capture what changed within a block and feed that back, it will remain a scheduling tool rather than a genuine deliberate practice system."

> **Takeshi (Audition Panel):** "The gap is that the app is organised around practice sessions when audition prep is fundamentally organised around a specific list of excerpts that must all be performance-ready by a fixed date."

> **Nadia (Accompanist):** "The single most valuable thing an accompanist's calendar could do is show when the next rehearsal with a specific soloist is scheduled and automatically adjust the session planner to prioritise that piece."

> **Chris (Content Creator):** "The app has genuinely sophisticated technology but it's packaged as a private productivity tool when it should be packaged as a performance sport. Strava didn't win by being the best GPS tracker. It won by making every run feel like a public achievement."

---

## Cross-Reference with Existing Roadmap

The existing roadmap (from the previous focus group) included:

- Smart rotation → **Built and universally praised**
- Teacher dashboard → **Not built, but being charged for** (critical gap)
- Calendar view → **Built as heatmap** (Nadia wants it to be collaborative)
- Pricing → **Built with 4 tiers** (Teacher tier is the problem)

New priorities emerging from this focus group that were NOT on the previous roadmap:

1. Multi-tenancy / user_id migration (infrastructure blocker)
2. Auth bypass default inversion (security blocker)
3. Instrument-agnostic AI/generators
4. Audition repertoire dashboard
5. PWA support
6. Community tier restructuring
7. Shareable progress moments
8. Simulated audition mode
9. Practice science improvements (SRS, streak grace, in-block capture)

# Practice Forge — Focus Group Report (Round 2)

**Date:** 2026-03-20
**Method:** 18 independent agent evaluations across 6 categories
**Scope:** Full codebase review (client + server) — post-fix re-evaluation
**Context:** 11 fixes implemented since Round 1 (same date). Same 18 personas re-evaluated.

---

## Executive Summary

### Overall Scores

| #   | Persona   | Role                             | R1 Score | R2 Score | Delta |
| --- | --------- | -------------------------------- | -------- | -------- | ----- |
| 1   | Maya      | Conservatory flute student       | 7.0      | 8.0      | +1.0  |
| 2   | Kenji     | Professional orchestral flautist | 6.0      | 7.0      | +1.0  |
| 3   | Priya     | Adult amateur returner           | 6.5      | 7.5      | +1.0  |
| 4   | Diego     | Jazz/contemporary saxophonist    | 5.0      | 6.5      | +1.5  |
| 5   | Zoe       | Pre-conservatory student, 16     | 6.5      | 7.0      | +0.5  |
| 6   | Sarah     | Private flute teacher            | 5.0      | 5.5      | +0.5  |
| 7   | Marcus    | Music ed-tech PM                 | 7.0      | 7.8      | +0.8  |
| 8   | Lin       | Music school director            | 5.0      | 5.5      | +0.5  |
| 9   | Alexei    | VC analyst                       | 7.0      | 7.5      | +0.5  |
| 10  | Rachel    | Competitor analyst               | 7.0      | 7.3      | +0.3  |
| 11  | Tomoko    | UX designer                      | 7.0      | 7.8      | +0.8  |
| 12  | James     | Accessibility auditor            | 6.0      | 7.0      | +1.0  |
| 13  | Fatima    | Full-stack code reviewer         | 5.0      | 5.5      | +0.5  |
| 14  | Raj       | Mobile/PWA specialist            | 5.0      | 5.5      | +0.5  |
| 15  | Dr. Elena | Music psychologist               | 6.5      | 7.0      | +0.5  |
| 16  | Takeshi   | Audition panel member            | 5.5      | 6.5      | +1.0  |
| 17  | Nadia     | Professional accompanist         | 5.0      | 5.5      | +0.5  |
| 18  | Chris     | Music content creator            | 6.5      | 6.5      | 0.0   |

**Round 1 Mean: 6.0 / 10 → Round 2 Mean: 6.7 / 10 (+0.7)**
**Round 1 Median: 6.0 → Round 2 Median: 7.0 (+1.0)**
**Range: 5.5 – 8.0** (narrowed from 5.0 – 7.0)

### Would Use/Recommend Summary

| Response                  | R1 Count | R2 Count | Personas (R2)                                          |
| ------------------------- | -------- | -------- | ------------------------------------------------------ |
| Yes                       | 3        | 0        | —                                                      |
| Maybe (leaning yes)       | 4        | 7        | Maya, Priya, Zoe, Marcus, Alexei, Tomoko, Dr. Elena    |
| Maybe (with reservations) | 8        | 8        | Kenji, Diego, Sarah, Rachel, James, Raj, Takeshi, Chris |
| Not yet                   | 3        | 3        | Lin, Fatima, Nadia                                     |

**Key shift:** Three "Yes" votes from R1 (Maya, Marcus, Alexei) moved to "Maybe leaning yes" — the fixes addressed their stated issues but surfaced new awareness of remaining structural problems (user_id, PWA). The "leaning yes" pool grew from 4 to 7 as mid-tier personas moved up.

---

## Top Consensus Themes

These themes emerged independently from multiple personas:

1. **`user_id` on core tables remains the #1 blocker** (Fatima, Lin, Marcus, Alexei, Maya) — `pieces`, `excerpts`, `exercises`, `practice_sessions`, `session_blocks`, `auditions`, `settings` still have no `user_id` column. Tier limit queries count globally. This was the top issue in Round 1 and is unchanged.

2. **Instrument-aware generation (Fix #11) was the highest-impact fix** (Diego, Rachel, Alexei, Nadia, Kenji, Dr. Elena) — `INSTRUMENT_RANGES` with 18 instruments + dynamic AI system prompt transforms the app from flute-only to genuinely multi-instrument. However, `buildCustomStudyPrompt` on line 197 of `aiGenerator.js` still hardcodes "for flute" — a residual bug.

3. **Audition repertoire field (Fix #10) addressed a critical workflow gap** (Maya, Kenji, Takeshi, Rachel) — excerpt/piece chips with readiness summary and countdown timer give real audition-prep utility. Round tracking and simulated audition mode remain absent.

4. **No PWA support continues to limit mobile viability** (Raj, Alexei, Nadia) — zero manifest.json, zero service worker, zero offline capability. Musicians practice in rooms with poor connectivity.

5. **Community feed is open but functionally empty for free users** (Marcus, Zoe, Chris) — Fix #7 opened read access, but the feed query filters to followed users only. Free users can't follow anyone (requires Pro). Result: empty feed with a "Find People" button that leads to profiles you can't follow.

6. **More milestones help but streak anxiety worsened** (Dr. Elena, Priya) — streak-14 and streak-30 milestones (Fix #9) fill the motivation gap, but losing a 29-day streak to one rest day is now more psychologically damaging. No rest-day grace period exists.

7. **Zero shareability limits growth** (Chris, Zoe, Marcus) — no share buttons, no exportable progress cards, no public profile URLs anywhere in the codebase. More celebratable moments exist (Fix #9) but they remain private toasts.

8. **Teacher Studio is honestly labelled but has no underlying implementation** (Sarah, Lin, Fatima) — Fix #8 added "Coming Soon" badge and disabled checkout. Trust is restored, but zero teacher-specific tables exist in the schema. No timeline or waitlist capture.

---

## Findings by Category

### UX & Design

**Strengths (improved or confirmed):**
- Theme token discipline now excellent — PostPlayReport uses only CSS custom properties, zero hardcoded hex (Tomoko)
- Touch-friendly template delete: `opacity-100` on mobile, hover-revealed on desktop (Tomoko, Raj)
- Audition repertoire chips with colour-coded excerpt (gold) vs piece (teal) selection (Tomoko, Maya)
- Returner onboarding option maps to beginner-level UX without stigma (Priya, Marcus)
- Session page remains the best-designed component — state machine with block timers, metronome, inline recorder (Tomoko, Maya, Kenji)

**Weaknesses (remaining or new):**
- Level-gating still silently redirects with no explanation (Tomoko — unchanged from R1)
- Duplicate quick-log affordances on Dashboard — "Start Session" vs "Log Practice" unclear (Tomoko — unchanged from R1)
- Raw `<input>` tags with hand-rolled focus styles bypass the `<Input>` component in PostPlayReport, SessionPage template name, Dashboard quick-log (Tomoko — new finding)
- Dashboard vocabulary still professional-centric for beginners: "excerpt rotation", "drift alerts", "audition prep" (Priya)
- Community page requires "advanced" experience level in frontend route guard, even though backend is open to all tiers (Zoe — new finding)

### Features & Functionality

**Strengths (improved or confirmed):**
- Audition repertoire with readiness summary: status counts (ready/solid/needs work) + countdown with urgency colouring (Maya, Kenji, Takeshi)
- Excerpt rotation algorithm remains universally praised — staleness + status + difficulty + audition urgency (Maya, Kenji, Dr. Elena)
- Audition-aware session generation: auto-boosts excerpt allocation when audition within 14 days (Takeshi, Dr. Elena)
- Scale variety in rule generator includes dorian, mixolydian, pentatonic — useful jazz building blocks (Diego)
- Audition result tracking with 5 outcome types (won/callback/unsuccessful/pending/cancelled) (Kenji)

**Weaknesses (remaining or new):**
- No recording comparison / trend view — data exists in `audio_analyses` but no UI surfaces it (Kenji, Takeshi)
- No simulated audition mode — session planner builds by category, not by audition repertoire list (Takeshi)
- No pre-seeded excerpt library — all manual entry, empty-state for new users (Kenji, Rachel)
- Rhythm accuracy still unimplemented — `rhythm_accuracy_pct` field exists but never populated (Rachel)
- No improvisation practice primitives — no improv block type, no chord changes, no backing tracks (Diego)
- No round tracking on auditions — flat model with one date, no prelim/semi-final/final (Takeshi — new)
- `buildCustomStudyPrompt` hardcodes "for flute" on line 197 of `aiGenerator.js` despite instrument-aware system prompt (Diego, Rachel — residual bug)
- No collaborative/ensemble features for accompanists (Nadia)
- No score annotation capability (Nadia, Maya)

### Technical & Architecture

**Strengths (improved or confirmed):**
- Auth bypass correctly inverted: `AUTH_BYPASS === "true"` explicit check with production warning (Fatima)
- Tier/subscription infrastructure properly user-scoped — Stripe integration, webhook lifecycle, AI cost tracking (Fatima, Alexei)
- Instrument parameter threaded through all four rule generators + AI system prompt (Fatima)
- N+1 prevention, path traversal protection, CORS allowlist still solid (Fatima)

**Weaknesses (remaining or new):**
- **CRITICAL:** No `user_id` on `pieces`, `excerpts`, `exercises`, `sections`, `practice_sessions`, `session_blocks`, `auditions`, `settings`, `uploaded_files`, `resources`, `assessments`, `audio_recordings` (Fatima, Lin)
- **CRITICAL:** `enforceSessionLimit` counts ALL sessions globally — `SELECT COUNT(*) FROM practice_sessions WHERE created_at >= date_trunc('week', NOW())` with empty params array (Fatima, Lin, Marcus)
- **CRITICAL:** `enforceCountLimit` receives SQL with no `WHERE user_id = $1` — pieces.js and excerpts.js count globally (Fatima)
- Settings table still globally shared key-value store with no user association (Lin)
- No database transactions for multi-step writes — partial block inserts possible on failure (Fatima)
- No PWA manifest, service worker, or offline capability (Raj)
- No offline data persistence — no IndexedDB, no localStorage cache strategy (Raj)

### Business & Growth

**Strengths (improved or confirmed):**
- TAM expanded from flute niche (~$50M) to 18-instrument practice tool (~$2B+) via Fix #11 (Alexei)
- Mature monetization scaffold with 4 tiers, Stripe integration, AI usage tracking (Alexei)
- Teacher Studio honestly labelled "Coming Soon" — trust restored (Sarah, Lin, Marcus, Alexei)
- Per-student pricing ($49 + $3/student) shows institutional pricing thought (Alexei)
- Audition lifecycle tracking is a differentiated feature vs SmartMusic/Modacity/Tonara (Rachel)

**Weaknesses (remaining or new):**
- Community cold-start only half-solved — feed is readable but empty for free users who can't follow anyone (Marcus, Zoe)
- No push notifications / email digest for re-engagement (Marcus, Zoe)
- No demo/sandbox mode for pre-signup experience (Marcus)
- No public profile URLs for virality (Chris)
- No share functionality anywhere in the codebase (Chris)
- Teacher tier has no timeline, no waitlist capture, no email collection (Sarah, Lin)
- Onboarding still ends at "Let's go!" with no immediate value delivery (Marcus)

### Accessibility (WCAG 2.2)

**Strengths (improved or confirmed):**
- Global `*:focus-visible` rule with `box-shadow: var(--pf-focus-ring)` — system-level fix (James)
- High-contrast mode increases ring to 4px at 0.8 opacity (James)
- `aria-pressed` on duration toggle buttons correctly implemented (James)
- Milestone toast uses `role="status"` and `aria-live="polite"` (James)
- Session completion view uses `role="status"` aria-live (James)
- Bar results have `aria-label` with bar number, status, and accuracy percentage (James)

**Weaknesses (remaining or new):**
- Colour-only status indicators in section progress bars, pitch trace, dynamics envelope — no text/pattern fallback (James)
- Rating buttons (Good/Okay/Tough) lack `aria-pressed` despite being toggles — inconsistent with duration buttons (James — new)
- Repertoire chip toggles and audition result buttons also missing `aria-pressed` (James — new)
- Recording state changes not announced via live regions — pulsing dot is visual-only (James)
- Pitch trace and dynamics envelope have no `role="img"` or summary description (James)
- Raw `<input>` tags with `focus:outline-none` suppress system focus ring in favour of gold border — fragmented focus treatment (Tomoko/James — new)

### Practice Science & Methodology

**Strengths (improved or confirmed):**
- Expanded milestone thresholds bridge the day-7 to day-30 gap (Dr. Elena)
- Instrument-aware range clamping prevents pedagogically harmful out-of-range exercises (Dr. Elena)
- Audition-aware session allocation reflects real practice psychology (Dr. Elena)
- Excerpt rotation approximates spaced repetition via staleness + status weighting (Dr. Elena)

**Weaknesses (remaining or new):**
- No actual SRS / forgetting curve — staleness is linear, no difficulty feedback loop (Dr. Elena)
- No in-block data capture — only `actual_duration_min` and `notes` recorded per block (Dr. Elena)
- Streak mechanics have no rest-day grace — expanded milestones amplify the anxiety (Dr. Elena)
- No progressive overload — exercises don't escalate based on past performance (Dr. Elena)
- No interleaving toggle for technique blocks (Dr. Elena)

---

## Prioritised Action Items

### Must-Fix (Launch Blockers)

1. **Add `user_id` to all core tables and scope every query** — pieces, excerpts, exercises, sections, practice_sessions, session_blocks, auditions, settings, uploaded_files, resources, assessments, audio_recordings all need `user_id`. Every SELECT, UPDATE, DELETE must include `WHERE user_id = $1`. `enforceSessionLimit` and `enforceCountLimit` must filter by user. (Fatima, Lin, Marcus, Alexei, Maya — 5 personas, unchanged from R1 #1)

2. **Fix the hardcoded "for flute" in `buildCustomStudyPrompt`** — `aiGenerator.js` line 197 still says "Generate a custom technical study for flute" regardless of instrument. Quick fix, high embarrassment risk for non-flute users. (Diego, Rachel — new finding)

### Should-Fix (High Impact)

3. **Add PWA manifest + service worker** — No manifest.json, no service worker, no offline capability. `vite-plugin-pwa` with cache-first app shell. Half a day of work for installability + offline session viewing. (Raj, Alexei, Nadia — unchanged from R1 #6)

4. **Fix community cold-start: add discover/explore feed** — Current feed query only shows followed users' events. Free users can't follow anyone (requires Pro). Add a "Discover" tab with recent public activity from all users, or curated content. (Marcus, Zoe, Chris — new finding)

5. **Remove experience-level gate on community page** — Frontend route guard in `App.tsx` restricts `/community` to "advanced" level, even though backend is open to all authenticated users. Beginners and intermediates can't access it at all. (Zoe — new finding)

6. **Add `aria-pressed` to all toggle buttons** — Duration buttons have it, but rating buttons (3 locations), audition result buttons, and repertoire chip toggles all lack it. Systematic audit needed. (James)

7. **Add rest-day grace period to streaks** — Configurable grace days (1-2) or switch to consistency score (e.g., 5 of 7 days). Expanded milestones make streak loss more punishing. (Dr. Elena, Priya)

8. **Build recording comparison / trend view** — Data exists in `audio_analyses` and `audio_recordings`. Need UI for side-by-side playback and pitch accuracy sparklines per excerpt over time. (Kenji, Takeshi — unchanged from R1 #14)

9. **Add text/pattern fallback to colour-only status indicators** — Section progress bars, pitch trace, dynamics envelope need text labels, patterns, or `aria-label` alongside colour. WCAG 1.4.1 non-compliance. (James — unchanged from R1 #9)

10. **Add 15-minute session option** — Duration selector starts at 30 min. Returners rebuilding stamina and time-constrained users need a shorter option. (Priya — unchanged from R1 #23)

### Nice-to-Have (Growth & Polish)

11. **Shareable progress cards + share buttons** — Canvas-rendered milestone cards, calendar heatmap export, "Share to Stories" on milestones. Zero share functionality currently exists. (Chris, Zoe, Marcus)

12. **Simulated audition mode** — Play through audition repertoire in order, timed, recorded, with per-excerpt rating. (Takeshi, Kenji)

13. **Pre-seeded excerpt library** — Standard orchestral excerpts by instrument. Reduces onboarding friction. (Kenji, Rachel)

14. **Push notifications / email digest** — Weekly summary, streak reminders, audition countdown alerts. (Marcus, Zoe, Dr. Elena)

15. **Public profile URLs** — `/u/username` visible without login. Achievement showcase, stats, heatmap. (Chris, Zoe)

16. **Teacher Studio waitlist with email capture** — "Coming Soon" button should collect email + instrument + studio size. Validates demand and builds a launch list. (Sarah, Lin)

17. **Audition round tracking** — Prelim/semi-final/final rounds with distinct repertoire per round. (Takeshi)

18. **Score annotation layer** — Write mode in ScoreViewer for breath marks, bowings, rehearsal notes. (Nadia, Maya)

19. **Demo/sandbox mode** — One guided session with example data, no signup required. (Marcus, Rachel)

20. **Level-gate explanation screen** — Replace silent redirect with "This unlocks at [level]" message. (Tomoko)

21. **Improvisation practice block** — New session block type for chord changes, backing tracks, scale practice over harmony. (Diego)

22. **Fix raw `<input>` tags** — PostPlayReport, SessionPage template name, Dashboard quick-log all bypass the `<Input>` component with inconsistent focus styles. (Tomoko)

23. **Add live region announcements for recording state** — Screen reader users cannot tell if recording is active. (James)

24. **Streak recovery / rest day configuration** — Configurable grace days or weekly target mode. (Dr. Elena, Priya)

25. **Database transactions for multi-step writes** — Session generation inserts session then loops blocks without rollback on failure. (Fatima)

---

## Feature Requests — Ranked by Frequency

| Feature                                        | Requested By                              | Count |
| ---------------------------------------------- | ----------------------------------------- | ----- |
| Recording comparison / trend view              | Kenji, Takeshi, Rachel                    | 3     |
| PWA / offline support                          | Raj, Alexei, Nadia                        | 3     |
| Shareable progress cards / moments             | Chris, Zoe, Marcus                        | 3     |
| Push notifications / email retention           | Marcus, Zoe, Dr. Elena                    | 3     |
| Community discover feed (not just followed)    | Marcus, Zoe, Chris                        | 3     |
| Pre-seeded excerpt library                     | Kenji, Rachel, Takeshi                    | 3     |
| Public profile URLs                            | Chris, Zoe, Marcus                        | 3     |
| Simulated audition mode                        | Takeshi, Kenji                            | 2     |
| Score annotation                               | Nadia, Maya                               | 2     |
| Streak grace period / rest days                | Dr. Elena, Priya                          | 2     |
| Teacher Studio waitlist capture                | Sarah, Lin                                | 2     |
| 15-minute session option                       | Priya                                     | 1     |
| Audition round tracking                        | Takeshi                                   | 1     |
| Improvisation practice block                   | Diego                                     | 1     |
| Demo/sandbox mode                              | Marcus                                    | 1     |
| Level-gate explanation screen                  | Tomoko                                    | 1     |
| Collaborative rehearsal calendar               | Nadia                                     | 1     |
| In-block data capture (difficulty, tempo)      | Dr. Elena                                 | 1     |
| Spaced repetition with forgetting curve        | Dr. Elena                                 | 1     |
| Jazz scale types (bebop, altered, diminished)  | Diego                                     | 1     |
| Weekly platform-wide challenge                 | Chris                                     | 1     |

---

## Verbatim Killer Insights

> **Maya (Conservatory Student):** "The readiness summary under each upcoming audition -- showing me how many excerpts are ready vs. needs work -- is the single most useful thing this app does for me right now. I used to keep a spreadsheet for that. But I still need to be able to open a recording from last Tuesday and compare it with one from today, side by side, to actually know if I'm improving on a passage."

> **Kenji (Professional Flautist):** "I can finally tell the app what I'm playing for an audition and it shows me whether my excerpts are ready or not -- that's a real step forward. But as a professional, my workflow is: practise, record, listen back, compare with last week, decide what to focus on next. This app handles the 'practise' part brilliantly with the session planner, but the feedback loop after that -- the compare-and-improve cycle -- is still completely missing."

> **Priya (Adult Returner):** "The 'Returning after a break' option was the first time an app didn't make me choose between 'beginner' and 'advanced' -- it understood that I'm neither. I know what a C major scale is, I just can't play it cleanly yet. That single option changed how welcome I felt."

> **Diego (Jazz Saxophonist):** "Finally I can generate a Bb dorian scale and it comes out in my sax range instead of some flute fairy register. That is real progress. But the app still thinks practice means 'work through classical repertoire sections' -- there is no space for the 20 minutes I spend every day just blowing over ii-V-I changes. Until there is an improvisation block in the session planner, this is a classical practice app that happens to know my instrument exists."

> **Zoe (16yo Student):** "I can finally see the community feed, which is cool, but I still can't follow anyone or accept challenges without paying $16 a month. It's like being invited to a party but told you can only stand outside the window and watch. My friends and I would totally use this together if challenges were free."

> **Sarah (Private Teacher):** "Thank you for being honest that Teacher Studio isn't ready -- that's a huge improvement over last time. But I looked at the database and there isn't a single table for students, assignments, or lesson notes. This isn't a feature that's almost done; it hasn't been started. I need a timeline before I invest my time learning this platform."

> **Marcus (Ed-Tech PM):** "Opening community read access to free users is the right call, but the feed query filters to followed users only. Free users can't follow anyone because follow requires Pro tier. So their feed will always be empty. You've unlocked the door but left the lights off."

> **Lin (School Director):** "The `practice_sessions` table has no `user_id`. So when `enforceSessionLimit` counts sessions globally, one student's third session could lock out another student on the free tier. This isn't a feature gap -- it's a data model that was designed for single-user and hasn't been migrated."

> **Alexei (VC Analyst):** "The instrument-awareness fix moves this from a $50M flute niche to a $2B+ practice tool TAM, but the database still treats every user's data as shared global state. You can't charge $15/month for a multi-user app that has no concept of 'my data' at the storage layer. Fix the schema before you raise."

> **Rachel (Competitor Analyst):** "I found a smoking gun at `aiGenerator.js` line 197: the custom study prompt still says 'for flute' regardless of instrument. The system prompt says trumpet, the user prompt says flute -- Claude is getting contradictory instructions. Search the codebase for every remaining 'flute' string and kill them, or a violin student will notice on day one."

> **Tomoko (UX Designer):** "I keep finding raw `<input>` tags with hand-rolled focus styles sitting right next to pages that use the `<Input>` component -- it's like having two design systems competing in the same app. That's the kind of drift that compounds fast."

> **James (Accessibility Auditor):** "You fixed the focus rings and added `aria-pressed` to the duration buttons, and that's real progress -- but then the rating buttons on the same page do the exact same toggle pattern without `aria-pressed`. It tells me the fix was targeted rather than systematic."

> **Fatima (Code Reviewer):** "The auth fix is a real improvement -- defaulting to secure is exactly right. But the missing user_id problem makes tier enforcement paradoxical: you built a subscription system that counts other people's data against you. A free user gets locked out at 3 pieces even if they created zero, because someone else's pieces count toward their limit."

> **Raj (PWA Specialist):** "The hover-to-touch fix on the delete button shows you understand dual-input design now. But the elephant in the room is still PWA: musicians practice in basements, rehearsal rooms, and on planes. Until this app can show me my session plan offline, it is a website pretending to be a practice tool."

> **Dr. Elena (Music Psychologist):** "The rotation algorithm treats 'not practiced recently' and 'needs deliberate review' as the same thing, which is a category error. A staleness score is not a spacing algorithm. An excerpt I nailed two weeks ago should be spaced further out; one I struggled with should have come back in three days."

> **Takeshi (Audition Panel):** "The readiness summary on the audition card is exactly the kind of thing I would glance at the week before. But when I sit down to actually simulate the audition experience, there is nothing here. The tracking layer is good now; the preparation workflow is still missing."

> **Nadia (Accompanist):** "The instrument-aware AI is genuinely useful -- I could generate viola warmups now. But my entire professional life is about coordinating with other musicians. The community features are social, not collaborative -- there's a difference."

> **Chris (Content Creator):** "You've actually built a bunch of shareable moments now -- the 30-day streak toast, the practice heatmap, the audition countdown. My audience would love seeing that stuff. But it's all locked inside the app like a diary with no photocopier."

---

## Comparison with Round 1

### Score Movement

| Metric         | Round 1 | Round 2 | Change |
| -------------- | ------- | ------- | ------ |
| Mean           | 6.0     | 6.7     | +0.7   |
| Median         | 6.0     | 7.0     | +1.0   |
| Min            | 5.0     | 5.5     | +0.5   |
| Max            | 7.0     | 8.0     | +1.0   |
| Std Dev        | 0.82    | 0.82    | 0.0    |

### Biggest Movers

| Persona | Delta | Primary Driver |
| ------- | ----- | -------------- |
| Diego   | +1.5  | Fix #11 — instrument-aware generators resolved his #1 blocker |
| Maya    | +1.0  | Fix #10 — audition repertoire field was transformative |
| Kenji   | +1.0  | Fix #10 — audition tracking now professional-grade |
| Priya   | +1.0  | Fix #6 — returner option + Fix #9 milestones |
| James   | +1.0  | Fix #2 focus rings + Fix #3 aria-pressed |
| Takeshi | +1.0  | Fix #10 — repertoire chips + readiness summary |
| Chris   | 0.0   | No shareability features added — his core need unaddressed |

### Round 1 Action Items — Resolution Status

| R1 # | Item | Status |
| ---- | ---- | ------ |
| 1 | Add `user_id` to all core tables | **Still outstanding** — unchanged |
| 2 | Invert auth bypass default | **Resolved** (Fix #1) |
| 3 | Remove or honestly label Teacher Studio | **Resolved** (Fix #8) — "Coming Soon" badge |
| 4 | Wire instrument field to AI/generators | **Resolved** (Fix #11) — 18 instruments, dynamic prompt |
| 5 | Build audition repertoire dashboard | **Resolved** (Fix #10) — chips + readiness summary |
| 6 | Add PWA manifest + service worker | **Still outstanding** |
| 7 | Open community to free/Solo tier | **Partially resolved** (Fix #7) — read-only, but feed empty for free users |
| 8 | Fix focus ring suppression | **Resolved** (Fix #2) — global `*:focus-visible` rule |
| 9 | Add text/pattern fallback to colour indicators | **Still outstanding** |
| 10 | Add more milestone thresholds | **Resolved** (Fix #9) — 10 milestones now |
| 11-25 | Nice-to-have items | Most still outstanding |

### New Issues Identified in Round 2

These were not flagged in Round 1:

1. **`buildCustomStudyPrompt` hardcodes "for flute"** — residual bug from Fix #11 (Diego, Rachel)
2. **Community page blocked by experience-level gate in frontend** — `/community` in `ADVANCED_PATHS` blocks beginners/intermediates despite open backend (Zoe)
3. **Feed query only shows followed users** — free users who can't follow see empty feed (Marcus)
4. **Raw `<input>` tags bypass `<Input>` component** — fragmented focus treatment (Tomoko)
5. **Rating buttons lack `aria-pressed`** — inconsistent with duration buttons (James)
6. **Expanded milestones amplify streak anxiety** — losing a 29-day streak to one rest day is worse than losing a 7-day streak (Dr. Elena)
7. **No audition round tracking** — flat model doesn't support prelim/semi-final/final (Takeshi)

---

## Summary

The 11 fixes raised the mean score from 6.0 to 6.7, with every persona except Chris improving. The fixes were well-targeted: instrument awareness (Fix #11), audition repertoire (Fix #10), and milestones (Fix #9) were the highest-impact changes, each moving multiple personas by +1.0.

However, the structural issues that scored lowest in Round 1 — `user_id` on core tables, PWA support, and Teacher Studio implementation — remain unchanged. These are the primary reasons the "Not yet" group (Lin, Fatima, Nadia) didn't move significantly.

**The app has improved from "promising prototype with trust issues" to "well-designed practice tool with an architecture problem."** The next sprint should focus on the `user_id` migration, the hardcoded "flute" bug, and the community feed cold-start — these three items would likely push the mean above 7.0.

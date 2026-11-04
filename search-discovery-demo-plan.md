# Search & Discovery — Demo Plan (10 minutes)

| | |
|---|---|
| **For** | The presenter and the person driving the screen |
| **Based on** | [search-discovery-requirements-spec.md](search-discovery-requirements-spec.md) (requirement IDs below refer to it) |
| **Demo state** | Browser demo: mock API, generated sample data (~100 people), **simulated AI (rules, no LLM)**, permissions checked in the browser only |
| **Expected values** | Calculated on **4 Nov 2026** with the demo engine. Sample data is relative to "today", so **re-check on the morning of the demo** (§4.3) |

---

## 1. Recommended user flows

Four core flows plus one optional flow. Together they show search, AI, statistics, matching and permissions without showing every feature.

### Flow 1 — Structured search: "Who can I staff?"

| | |
|---|---|
| Persona | PMO / demand manager |
| Scenario | A Java backend role starts soon; PMO wants available, experienced people in Software Factory |
| Start | Logged in as PMO → sidebar **Search & Discovery** → tab **Structured search** |
| Actions | 1. Add skill **Java**, min. competency **3 — Experienced**, Years **More than** **3**.<br>2. Business unit **Software Factory**.<br>3. Availability **At least 50% free**.<br>4. **Search**.<br>5. Set **Sort by: Relevance** (the page keeps the previous sort, Name).<br>6. Click the first row (Aleksa Ristić) to open the details. |
| Expected | **7 people**; top three Aleksa Ristić, Matteo Ferrari, Miloš Đukić (relevance 100). Each row shows Java level, years, current project and free %. The drawer shows reasons and the relevance formula |
| Notice | Exact filters are strict and visible as chips; ranking is explainable, not a black box |
| Requirements | SD-FR-010, 012, 013, 017, 040, 045, 110, 111 |
| Time | 0:40 |
| Status | Demonstrable (demo data) |

### Flow 2 — AI Quick Search with refinement

| | |
|---|---|
| Persona | PMO |
| Scenario | "I need Vue developers next month" asked in plain words, then narrowed |
| Start | **Search & Discovery** → tab **AI Quick Search** (opens by default) |
| Actions | 1. Click the suggested question **"Find Vue developers available next month."**<br>2. Point at "What I understood": intent, criteria chips, "Needed from 2026-12-01", "At least 50% free".<br>3. Click **Show structured query (JSON)**.<br>4. In **Refine this question** type **only in Serbia** → **Refine**. |
| Expected | Step 1: **4 people** (Martina Romano, Kiril Angelova, Rade Tasić, Simona Petrovska). Step 4: **1 person** (Rade Tasić), with "Location: Serbia" added |
| Notice | The AI only turns words into criteria; the user sees and can edit them. The "Simulated AI" label is on screen |
| Requirements | SD-FR-030, 031, 032, 033, 035, SD-AI-001 (principle) |
| Time | 1:10 |
| Status | Demonstrable; **AI is simulated** |

### Flow 3 — Workforce numbers with a clear denominator (incl. Serbian)

| | |
|---|---|
| Persona | PMO, HR or a manager preparing a workshop answer |
| Scenario | The stakeholder questions "How many Java developers, percentage-wise?" and "Koliko ljudi je preko 2 godine na istom projektu?" |
| Start | AI Quick Search → **Clear** |
| Actions | 1. Click **"What percentage of our employees are Java developers?"**<br>2. Open **How this was calculated**.<br>3. Point at the **"It depends on the definition"** table.<br>4. **Clear**, then click **"Koliko ljudi je preko 2 godine na istom projektu?"** |
| Expected | Step 1: **20%** = **18 of 90** eligible internal employees. Excluded groups listed (contractors, inactive/new hires, applicants). Definitions: knows Java 24 · professional (used) 18 · advanced 11 · main skill today 17 · used in last 12 months 21.<br>Step 4: "Serbian question" chip; **31** people = **34.4% of 90**; breakdown by project (Self-care Portal 6, …) and the list with project start dates |
| Notice | Every number has a stated population; the definition of "Java developer" is a **decision**, not a hidden assumption. Serbian works |
| Requirements | SD-FR-050, 051, 053, 060, 030, SD-DEF-005/006, SD-DEC-001/002 |
| Time | 1:10 |
| Status | Demonstrable (demo data; definitions not yet agreed) |

### Flow 4 — Demand matching: must-have vs optional

| | |
|---|---|
| Persona | PMO / demand manager |
| Scenario | Demand **DEM-M05 Senior Java Developer**: must-have Java ≥ 4 for more than 5 years and Spring Boot ≥ 3; must be free on the start date; AWS, Kafka, Docker optional |
| Start | Sidebar **Workforce Intelligence → Demand matching** → select **DEM-M05** |
| Actions | 1. Show the must-have / optional lists and weights.<br>2. Point at the eligible list.<br>3. Scroll to **Not eligible — near misses**.<br>4. Tick Aleksa Ristić and Matteo Ferrari → **Compare (2)**.<br>5. Expand Aleksa → **Propose for this demand** → show the dialog → **Propose (demo)**. |
| Expected | **2 eligible of 102**: Aleksa Ristić **65**, Jelena Petrović **57**. Near misses include Matteo Ferrari (Java level 3/5 despite ~10 years) and people who are not free on the start date (e.g. Bojan Ilić, Đorđe Milić). The comparison shows criterion-by-criterion results. The propose dialog shows `POST /api/demands/{id}/candidates`; the chip "Proposed to Demand Management (demo)" appears |
| Notice | Must-haves decide eligibility; optional criteria and weights decide order. Scores are calculated and explained, never invented by AI. Search hands over to Demand Management; it does not run the pipeline |
| Requirements | SD-FR-070–077, 079, §G, SD-CON-001 |
| Time | 1:30 |
| Status | Demonstrable on **sample demands**; proposal is **simulated** (the backend API exists, but sample demands are not real Module 3 demands) |

### Flow 5 (optional) — Same question, different role

| | |
|---|---|
| Persona | Line Manager (demo identity: Bojan Ilić) |
| Scenario | Show that visibility depends on the role |
| Start | **Second browser window** (private window), already logged in as `manager`, on AI Quick Search |
| Actions | 1. Click **"What percentage of our employees are Java developers?"**<br>2. Click the must-have/optional suggested question. |
| Expected | Step 1: **16 of 26** (61.5%): the denominator is the manager's direct reports only. Step 2: no match ranking; note "Must-have / optional ranking is only available to roles with demand matching access", and Spring Boot shown as "Optional (not used)" |
| Notice | The same question respects the user's scope. **Say clearly:** in the demo this is enforced in the browser; production enforces it in the backend |
| Requirements | SD-FR-130 (production), 132, 133, 134, H.2 |
| Time | 0:30 |
| Status | Demonstrable; **browser-side only, not security** |

---

## 2. Step-by-step walkthrough (driver's script)

1. Before the audience joins, open window A (PMO) on **Search & Discovery** and window B (private, `manager`) on the same page. In window A, Structured search is ready with empty criteria.
2. **Flow 1.** Structured tab → Java, level 3, Years "More than" 3 → Business unit Software Factory → Availability 50% → Search → Sort by Relevance → open Aleksa Ristić → close.
3. **Flow 2.** AI Quick Search tab → click the Vue suggestion → wait for "Interpreting your request…" → show criteria → Show structured query → type "only in Serbia" → Refine.
4. **Flow 3.** Clear → Java percentage suggestion → "How this was calculated" → definitions table → Clear → Serbian tenure suggestion.
5. **Flow 4.** Sidebar → Workforce Intelligence → Demand matching → choose DEM-M05 → near misses → tick Aleksa + Matteo → Compare → close → expand Aleksa → Propose → Propose (demo).
6. **Flow 5 (if on time).** Switch to window B → Java percentage suggestion → must-have/optional suggestion.
7. Return to the slide or spec for next steps.

---

## 3. 10-minute agenda

| Time | Section | What to say | On screen | Message to remember |
|---|---|---|---|---|
| 0:00–1:00 | **Problem** | "Staffing knowledge sits in Excel files and people's heads. PMO can't quickly answer 'who is free with Java?' or 'how many of us are Java developers?' Module 3 already expects Search to find candidates." | Title slide or the spec's executive summary | Search is the missing link between skills, availability and demands |
| 1:00–2:30 | **Requirements & solution** | "One search for people, three ways to ask: filters, quick searches, natural language in English or Serbian. Numbers always come with their population. Demand matching uses must-have gates and weighted optional criteria. AI only translates the question; the backend calculates and enforces permissions." | In-app page **AI architecture & cost** → "From question to answer" | AI interprets; the system decides |
| 2:30–3:30 | **Important decisions** | "Three decisions we need from you: (1) what counts as a 'Java developer' and which population percentages use; (2) whether a failed must-have excludes someone or only lowers the score (Module 02 calls the 80% fit a recommendation, not a rule); (3) whether we need real semantic search — that's a separate technology choice." | Spec §L.1 (SD-DEC-001, 002, 006, 010) | Definitions are business decisions, not code |
| 3:30–8:30 | **Walkthrough** | Flows 1–4 (Flow 5 if time allows). Say "demo data" and "simulated AI" once at the start | Application | It works end to end and every result is explained |
| 8:30–9:30 | **Next steps** | "Next: agree definitions and permissions; build the backend search on the existing PostgreSQL database; connect real Module 1–3 data; connect an Azure OpenAI model; read real demands and use the existing propose API. Not needed now: Azure AI Search or a vector database." | Spec §N and §D.4 | Simple architecture first; decisions unblock the build |
| 9:30–10:00 | **Close** | Closing message (§6) | — | — |

Total: 10:00. If the walkthrough runs long, drop Flow 5 first, then step 4 of Flow 2.

---

## 4. Demo data and preparation

### 4.1 Environment
- Start the frontend (`cd frontend; npm run dev`, or the Podman setup from `docs/workforce-intelligence/00-implementation-report.md` §9). The Search & Discovery mock API is on by default.
- Accounts: `pmo.user` (or `admin`) for window A, `manager` for window B. Passwords are listed in `00-implementation-report.md` §9; **verify both logins the day before**.
- Browser zoom 90–100%. Close other tabs. Turn off notifications.

### 4.2 Data and state
- The sample data is built into the demo (deterministic, no setup).
- Clear old saved and recent searches for a clean screen: browser DevTools → Application → Local Storage → remove keys starting with `wfm-intelligence`. Optional: pre-save "Java share" (Flow 3 question) to show saved searches if asked.
- Do **not** switch AI off in *Usage & costs* (it changes the engine label).

### 4.3 Queries and expected results (re-check on the day)

| Query / action | Expected (4 Nov 2026) |
|---|---|
| Structured: Java ≥ 3, more than 3 y, Software Factory, ≥ 50% free | 7 people; Aleksa Ristić, Matteo Ferrari, Miloš Đukić first |
| "Find Vue developers available next month." | 4 people |
| + refine "only in Serbia" | 1 person (Rade Tasić) |
| "What percentage of our employees are Java developers?" | 20% = 18 of 90 |
| "Koliko ljudi je preko 2 godine na istom projektu?" | 31 of 90 (34.4%) |
| Demand matching DEM-M05 | 2 eligible: Aleksa Ristić 65, Jelena Petrović 57 |
| Manager: Java percentage | 16 of 26 |
| Backup query: "Backend developers experienced in JVM technologies" | Related terms → any of Java, Kotlin / Android, Spring Boot; 20 people; note that "backend" was read as the role |

Why re-check: sample dates are relative to today. Results shift slowly from day to day, and **"next month" changes on 1 December**.

### 4.4 Disclose these limitations (say them once, plainly)
1. "This is a demo on generated sample data; the numbers do not describe our company."
2. "The AI is simulated by rules. No language model is called and no data leaves the browser."
3. "Permissions are checked in the browser for the demo. Production enforces them in the backend."
4. "Demands here are samples. The propose button shows the real Module 3 call but does not send it."
5. "Semantic search is not built. Related terms like 'JVM' come from a short fixed list."

---

## 5. Risks and fallbacks

| Risk | Sign | Fallback |
|---|---|---|
| Numbers differ from this plan | Different counts on screen | Say "sample data moves with today's date". Trust the screen; the logic is the point |
| Mock API not active (blank or errors) | "Search & Discovery is not available" or a spinner | Hard refresh (Ctrl+F5). If still failing, use the exported PDF/PowerPoint results prepared the day before (§5.1) |
| Login fails | Error on login | Use `admin` for everything; skip Flow 5 |
| Typing mistakes in live queries | Odd interpretation | Use the suggested-question chips (Flows 2–4 use them) |
| An audience question the rules don't understand | "Not understood" chips | Show it honestly: unknown words are reported, never silently filtered. Use Edit criteria to finish the search |
| Time overrun | Past 8:30 in walkthrough | Skip Flow 5, then the JSON view |
| Someone asks "Is this real AI?" | — | "No. Today it's a rule-based simulation that produces the same structured output a model would. Production uses an Azure OpenAI model for interpretation only." |

### 5.1 Day-before preparation
- Export Flow 1 results and the Flow 4 matching result to PDF (Export menu) as offline backups.
- Take three screenshots: the Flow 3 answer card, the Flow 4 comparison, the AI architecture flow.
- Do one full timed rehearsal.

---

## 6. Closing message (≈ 30 seconds)

> "Search & Discovery gives PMO and managers one place to find people, answer workforce questions with clear numbers, and rank candidates for demands, in plain English or Serbian. What you saw is a demo on sample data with simulated AI. The rules, the explanations and the screens are ready to be connected to our real data. To build it, we need your decisions on four things: what counts as a 'Java developer', which population percentages use, how strict must-have criteria are, and who may see which data. With those answers, the next phase is a backend on our existing database and a small Azure AI model for understanding questions. No new search infrastructure is needed to start."

---

## 7. Flow-to-requirement mapping

| Flow | Requirement IDs | Decisions it surfaces |
|---|---|---|
| 1 Structured search | SD-FR-001, 010, 011, 012, 013, 017, 040, 045, 046, 110, 111; SD-RNK-001–010 | SD-DEC-020, 024 |
| 2 AI Quick Search + refine | SD-FR-030, 031, 032, 033, 034, 035, 041; SD-AI-001–003 | SD-DEC-025, 027 |
| 3 Numbers with denominator (EN + SR) | SD-FR-050, 051, 052, 053, 060, 061; SD-DEF-005, 006 | SD-DEC-001, 002, 003, 005 |
| 4 Demand matching + propose | SD-FR-070, 071, 072, 073, 074, 075, 076, 077, 079; §G | SD-DEC-006, 007; SD-CON-001, 002 |
| 5 Role-based visibility (optional) | SD-FR-130, 132, 133, 134; SD-SEC-001; §H.2 | SD-DEC-009, 014, 021 |
| Backup: JVM query | SD-FR-020, 022, 034; §E | SD-DEC-010, 013 |

Not demonstrated (mention only if asked): saved searches (SD-FR-100), external applicants (SD-FR-090–093), exports (SD-FR-120), cost page details (§K.2).

# 01 — Executive Summary: Workforce Intelligence & Discovery

> Status: **demo implemented** in the existing frontend (Module 4 "Workforce Intelligence"), backed by a documented in-browser mock API. Production backend work is specified in [04](04-technical-architecture.md) and [11](11-implementation-roadmap.md).

## Business problem

Workforce data already exists in three modules: skills and certifications (Module 1), projects and allocations (Module 2), and staffing demands (Module 3). Finding the right person is still manual. A staffing manager opens the bench page, then each employee profile, then the allocation history, and compares people in a spreadsheet. Nobody can quickly answer questions like *"how many people have been on the same project for more than two years?"* or *"who has used Java for more than three years?"*.

## Product vision

One place to discover, compare and report on internal workforce capability:

- **Search first.** Structured search, one-click Quick searches, and a natural-language **AI Quick Search** that turns plain sentences into editable filters.
- **Explainable matching.** Staffing demands have *must-have* criteria (eligibility gates) and *optional* criteria (weighted ranking). Every score is explained.
- **Experience analytics.** Project tenure and skill-experience durations with configurable thresholds, distinguishing recorded from estimated data.
- **Recruiting kept separate.** External applicants are counted and listed by name only, and never mixed into employee search or matching.
- **Reuse and reporting.** Saved searches, recent-search history, dashboards with drill-down, and exports to Excel, CSV, PDF, PowerPoint and PNG.
- **Cost transparency.** Conventional search vs AI search usage, token estimates and budget controls.

## Business objectives (from the stakeholder workshop)

| # | Objective | Delivered in demo |
|---|---|---|
| 1 | Find suitable employees for demands quickly | Discovery + Demand matching |
| 2 | Understand capabilities and experience | Discovery, Dashboard, Experience analytics |
| 3 | Identify long-term project assignments | Project tenure analytics, "Same project > 2 years" quick search |
| 4 | Understand skill experience and competency distribution | Skill experience analytics, Dashboard |
| 5 | Match employees against project requirements | Demand matching (must-have / optional) |
| 6 | Track external applicants without exposing personal data | External applicants page (names only) |
| 7 | Reuse frequent searches | Saved searches + Recent searches |
| 8 | AI natural-language discovery | AI Quick Search (simulated, labelled) |
| 9 | Visualize workforce information | Dashboard and analytics charts |
| 10 | Export reports | Export menu on every report screen (5 formats) |
| 11 | Understand search costs | Usage & costs page |

## Main user groups

| Group | Role in app | Main use |
|---|---|---|
| Staffing / PMO managers | `PMO` | Discovery, demand matching, exports |
| HR managers | `HR` | Workforce analytics, competency distribution, cost codes |
| HR Business Partners / recruiters | `HR_BUSINESS_PARTNER` | Their unit's staff, matching, applicant counts |
| Line / project managers | `LINE_MANAGER` | Their direct reports' skills and availability |
| Business executives | `MANAGEMENT` | Dashboard and analytics totals only, platform costs |
| Administrators | `ADMIN` | Everything, plus AI pricing and limits |

## Expected business value

- **Shorter time to shortlist.** Must-have gates and ranked, explained candidates replace manual cross-checking.
- **Better rotation and retention decisions.** People on the same project for years are visible.
- **Trustworthy experience figures.** Durations come from experience start dates, and estimates are marked as estimates.
- **Lower AI risk and cost.** AI only translates queries into filters, smart routing skips AI for simple queries, budgets and limits exist, and no employee data is sent to a model.
- **Compliance by design.** Role and unit scoping is applied before search. Applicant privacy rules hold on screen and in exports.

## What is real and what is simulated in the demo

| Real (works end-to-end in the browser) | Simulated / illustrative |
|---|---|
| Filtering, sorting, ranking, matching, analytics, exports, saved searches, history, permissions | The "AI" interpreter is a deterministic rule engine. No LLM is called. |
| Usage counting per request | Token counts (~4 chars/token) and prices are illustrative |
| | Demo data set (26 employees, 75 applicants, 4 demands), not the Module 1–3 database |

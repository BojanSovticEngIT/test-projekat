# 12 — Stakeholder Decisions and Open Questions

## 12.1 Confirmed requirements (from the workshop brief)

- Search by name, technology, skill, competency level, years of experience, project history, current project, business unit, team, allocation status, availability and location.
- Three search modes: structured, quick and AI (natural language translated to criteria, reviewable).
- Project-tenure and skill-experience analytics with configurable thresholds. Skill experience must use experience start dates.
- Demand matching with must-have gates and weighted optional criteria, with explanations.
- External applicants kept separate, names only, monthly count by submission date.
- Saved searches, search history, dashboard, exports (xlsx, csv, pdf, pptx, png), cost transparency.

## 12.2 Assumptions made in the demo (please confirm)

| #   | Assumption                                                                                |
| --- | ----------------------------------------------------------------------------------------- |
| A1  | Visibility follows today's rules: line managers see direct reports, HR BPs see their unit |
| A2  | Unverified (self-assessed) skills are included but count 75% and are marked               |
| A3  | "Available" without a % means at least 50% free on the needed-from date                   |
| A4  | Current project = active allocation with the highest %                                    |
| A5  | Allocations on the same project with ≤ 7 days gap are one continuous assignment           |
| A6  | Thresholds are strict ("more than 2 years" = > 2.0)                                       |
| A7  | Default matching weights: optional 40, competency 25, experience 15, availability 20      |
| A8  | Cost transparency = platform cost (A), not workforce cost (B)                             |
| A9  | Management sees aggregates and costs but no individuals                                   |

## 12.3 Open questions

| #   | Question                                                                              | Options                                                | Recommendation                                          |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Q1  | Does "cost" mean platform cost, workforce cost, or both?                              | A / B / both                                           | Start with A (done). Decide on B with Finance           |
| Q2  | Should line managers and HR BPs find people outside their team or unit when staffing? | Keep scope / company-wide with hidden sensitive fields | Company-wide read for staffing, sensitive fields hidden |
| Q3  | Who may see rates or cost codes if workforce cost is added?                           | HR + Admin / plus PMO                                  | HR + Admin only, PMO sees cost bands                    |
| Q4  | Must years of experience be employee-entered, manager-validated or HR-imported?       |                                                        | Employee-entered, manager-validated with the skill      |
| Q5  | Is AI allowed to process queries that may contain names? Which provider and region?   |                                                        | EU region, PII masking, DPA signed                      |
| Q6  | Monthly AI budget and per-user limits?                                                |                                                        | Start at $25/month, 50 per user per day                 |
| Q7  | Should new hires (`NEW_HIRE`) be searchable and matchable?                            |                                                        | Yes, marked "new hire"                                  |
| Q8  | Which languages and levels must be recorded (CEFR)?                                   |                                                        | English + client languages, CEFR                        |
| Q9  | Should match results be stored (audit / decision record)?                             |                                                        | Store a snapshot when a candidate is added to a demand  |
| Q10 | Applicant analytics beyond counts (source, position, outcome)?                        |                                                        | Phase 2, still without personal details                 |
| Q11 | Retention for search history and usage?                                               |                                                        | 90 days / 13 months                                     |
| Q12 | Should exports carry a confidentiality footer and company template?                   |                                                        | Yes                                                     |

## 12.4 Recommendations

1. Approve the MVP scope in [11](11-implementation-roadmap.md) with AI as Phase 2.
2. Start collecting skill experience start dates now. This is the main data gap for the stakeholder's questions.
3. Decide Q1, Q2 and Q5 before backend work on visibility and AI starts.

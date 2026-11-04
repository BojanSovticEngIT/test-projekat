# Search & Discovery — Questions for Stakeholders

## Why we are asking

There is **no agreed Search & Discovery specification yet**. To build a demo, we pieced the requirements together from two places:

1. **What you told us.** Workshop brief, Module 2 and Module 3 interviews and specs (`optimal-spec.md`, `m3-demand-staffing-spec.md`).
2. **What the existing application already does.** Skills, allocations, demands, roles, and an earlier search prototype.

Where neither source gave an answer, **the demo makes an assumption**. These assumptions are visible in the demo, and they change the results. Example: "How many Java developers do we have?" gives anywhere from **11 to 24 people** in the demo data, depending on the definition used.

Each question below shows **what we heard**, **what the demo currently assumes**, and **what we need from you**. Full detail: [search-discovery-requirements-spec.md](search-discovery-requirements-spec.md) (decision IDs in brackets).

Legend: ⭐ = ask in the first meeting (changes what we build or what the demo shows).

---

## 1. Purpose and users

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| ⭐ Q1 | Module 2: PMO needs "a searchable view of availability and candidate fit". Workshop: workforce questions such as "how many Java developers, percentage-wise?" | Both: staffing search **and** workforce questions | **What is the main job of Search?** Finding people for demands, answering workforce questions, or both? Which comes first? |
| ⭐ Q2 | Module 2 permissions let HR, HR BPs and Line Managers view assignments; Module 3 gives Line Managers access only to their own meetings | PMO, HR, HR BP, Line Manager and Admin can all search, each within their scope | **Who should use Search?** Should HR and Line Managers search at all? (SD-DEC-021) |
| Q3 | The application has a "Management" role; the Module 2 spec doesn't | Management sees totals only, no people | **Does a Management (totals-only) user exist?** What should they see? (SD-DEC-014) |
| Q4 | — | — | **Can you give us 5 real questions you asked colleagues or Excel last month?** We'll use them as acceptance tests |

## 2. Definitions that change the numbers

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| ⭐ Q5 | "How many Java developers do we have, percentage-wise?" | Java level 3 (Experienced) or higher; other definitions shown next to the answer | **What makes someone a "Java developer"?** Knows Java at any level / level 3+ / level 4+ / Java is their main skill on the current project / used Java in the last 12 months / job title? (SD-DEC-001) |
| ⭐ Q6 | Module 2: Employee, B2B and Supplier follow the same allocation rules | Percentages count active **employees** only; contractors listed separately | **Which people make up "100%"?** Include B2B and supplier staff? New hires? Count heads or FTE? (SD-DEC-002/003) |
| Q7 | The application stores "years of experience" as a number typed once, plus a "last used" date | Uses a "since" date if known, otherwise time on projects using the skill | **How do we measure "3 years with a skill"?** What people declare, project history, or both? Does time count if the skill hasn't been used for years? (SD-DEC-004) |
| Q8 | "Koliko ljudi je preko 2 godine na istom projektu?" | Continuous time on any current project; breaks up to 7 days ignored | **What does "on the same project" mean?** How long a break still counts as continuous? Does a role change on the same project restart the clock? (SD-DEC-005) |
| Q9 | Module 2: bench = 0% allocated; people on leave are not bench | "Available" without a % = at least 50% free; "next month" = the 1st | **What does "available" mean if no % is given?** And "available next month": the 1st, any day, or the whole month? (SD-DEC-025) |

## 3. Matching people to demands

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| ⭐ Q10 | Workshop: must-have and optional criteria with scores. **But** Module 3 interview: automatic match scores are "not the main need, because the bench is small" | Ranked list with a 0–100 fit score | **Do you want a ranked score at all,** or is "meets 2 of 3 must-haves" enough? |
| ⭐ Q11 | Module 2: 80% skill match is a "recommended fit, not a hard rule"; PMO may still propose people below it | A failed must-have = not eligible, no score (listed separately as a near miss) | **Is a must-have a hard stop or a strong preference?** (SD-DEC-006) |
| Q12 | Module 2 staffing requests had per-skill weights; Module 3 demands store only "must-have yes/no" | Weights 1–5 per optional criterion; default mix 40/25/15/20 | **Who sets the weights:** per demand, or one company standard? Is the default mix sensible? (SD-DEC-007) |
| Q13 | Demo supports skill, certification, industry, similar project, language | Only skills are stored on real demands | **Which kinds of criteria do demands really need?** (languages, certifications, industry, similar projects) |
| Q14 | Module 3: candidates above budget are flagged, not blocked | Not shown in search | **Should search show cost range or daily rate?** If so, to whom? (SD-DEC-008) |

## 4. How search should behave

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| Q15 | Workshop: AI Quick Search; Serbian example questions | English and Serbian questions; AI simulated | **Is natural-language search a must or a nice-to-have?** Which languages: also Italian? |
| ⭐ Q16 | Workshop: "backend developers experienced in JVM technologies", "e-commerce experience" | A short fixed list of related terms; no semantic search | **Do you need "meaning-based" search now?** Do we have the text it needs (CVs, project descriptions)? Or are related-term lists enough to start? (SD-DEC-010) |
| Q17 | — | Order: skill fit 60%, availability 25%, used on projects 15% | **What should come first in results:** best skill match, most available, most experienced, most recent use? (SD-DEC-020) |
| Q18 | Workshop: saved searches | Saved per user, not shared | **Should saved searches be shareable?** Do you want alerts ("tell me when a Kafka developer becomes free")? (SD-DEC-017) |

## 5. Data we depend on

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| ⭐ Q19 | Workshop: monthly count of external applicants, first and last name only. Your system stores **one full-name field and no application date** | Sample data with application dates | **Can the source system provide an application date and separate first/last names?** If not, which date should we use, or do we drop this? (SD-DEC-011) |
| Q20 | Many skills are self-assessed or not yet validated; some have no years | Unvalidated skills count at 75% in ranking; unknown years shown separately | **How complete and trusted is skills data today?** Should unvalidated skills count? (SD-DEC-024) |
| Q21 | Module 2: industry belongs to the client; demo puts it on the project | Industry per project | **Is industry per client enough,** or do projects need their own? |
| Q22 | Module 3: languages are recorded as skills | Languages as a separate list | **Are languages recorded today, and at which levels (e.g. CEFR)?** |

## 6. Privacy and permissions

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| Q23 | Module 2: Line Managers see direct reports, HR BPs their unit | Same scope for search and for numbers | **For staffing, may Line Managers and HR BPs search outside their team or unit** (with sensitive fields hidden)? (SD-DEC-021) |
| Q24 | — | Seniority and cost code visible to HR and Admin only | **Which fields are sensitive and for whom?** Seniority, cost range, allocation %, client names, skill comments, unvalidated skills (SD-DEC-008) |
| Q25 | — | Totals of fewer than 5 people hidden from Management (one place only) | **Should small groups be hidden in statistics?** Below what size? (SD-DEC-009) |
| Q26 | Module 2: no personal data to AI providers without masking | No AI is called | **Which AI provider and region are allowed?** May names typed into a question be sent? (SD-DEC-023/027) |
| Q27 | Module 2: exports never exceed the user's scope | Anyone who can see a page can export | **Who may export search results?** Should exports be logged? (SD-DEC-022) |

## 7. What belongs to Search vs other modules

| # | What we heard / found | Demo assumes | Question |
|---|---|---|---|
| Q28 | Module 3: statistics are for Module 6 (Reports) | Search answers questions on demand; dashboards marked "Reports preview" | **Is it right that Search answers one-off questions, while dashboards and trends live in Reports?** |
| Q29 | Module 3 tracks "CV sent"; CV generation is Module 5 | No CV link | **Should search link to CV generation?** Is there a plan or contract for Module 5? (SD-DEC-018) |
| Q30 | Module 3 records candidates found by "Bench search (Module 4)" | Proposing from search is simulated | **Is "propose from search, then continue in Demand Management" the right hand-off?** |

---

## Suggested use of the two 15-minute meetings

**Meeting 1 (stakeholders): the ⭐ questions, about 2 minutes each.**
Order: Q1 → Q2 → Q5 → Q6 → Q10 → Q11 → Q16 → Q19.

**Meeting 2: remaining questions by priority.**
Q7–Q9 (definitions), then Q23–Q24 (permissions), then Q12, Q17, Q20. Send the rest in writing with a one-week deadline.

Record every answer in the decision register (spec §L.1). Any question left unanswered stays a **documented assumption**, and the demo keeps showing it as one.

---
id: m3-demand-staffing-tracking
title: "Module 03: Demand Management and Staffing Tracking"
status: draft
approved: false
related: []
tags: [module-03, demand, staffing, candidate-flow, poc]
created: 2026-10-13
project: workforce-platform
---

# Module 03: Demand Management and Staffing Tracking

> **Status:** draft for team review. Not approved.
>
> **Source labels:** each rule has a label that shows where it comes from.
>
> | Label | Source |
> |---|---|
> | **[S1]** | Stakeholder meeting 1 (demand manager, 13 Oct 2026, transcript) |
> | **[S2]** | Stakeholder meeting 2 (notes) |
> | **[T]** | Team decision. Confirm it with a stakeholder before we approve the spec. |
> | **[A]** | Assumption. Not yet discussed with a stakeholder. |
>
> **Priority:** **M** = must have, **S** = should have, **C** = could have. **PoC** = the HTML prototype shows it.

---

## 1. Problem

Project managers, most of them in Italy, send staffing demand to the nearshore team (Serbia and Albania). The demand arrives by email, Teams, calls, and meetings. [S1]

The demand manager (PMO) records each demand and each candidate in an Excel file with two sheets. [S1] This causes the following problems:

1. **No history.** A demand asks for 5 people. The team fills 2, and the client cancels 3. The demand manager changes "5" to "2" in Excel, and the history is lost. [S1]
2. **No shared view.** Managers, recruiters, and HR business partners cannot see what the team works on now. [S1]
3. **No structured process record.** Each candidate goes through CV feedback, meetings, and offers. The dates and reasons stay in one person's Excel file. [S1]
4. **Feedback is lost.** Line managers attend interviews, but their feedback is not recorded in one place. [S2]
5. **No data for statistics.** Nobody can answer "Which technologies are hard to find?" or "Why do we cancel demands?" [S1]

The Italian demand application cannot connect to our system, and it never will. [S1] The automatic email from that application is the only structured input.

---

## 2. Goals

1. One place for all nearshore demands. The demand manager creates a demand quickly from the automatic email.
2. A record of every candidate for every demand, internal and external, with each step, date, status, and reason.
3. A flexible candidate process. The start is fixed (search, then "CV sent"). The steps after that change from case to case. [S1, S2]
4. A full history of each demand: requested, filled, and cancelled positions, with reasons. [S1]
5. Feedback from each meeting participant, recorded by that participant. [S2]
6. Clear rights for three roles: the demand manager edits everything, recruiters and HR business partners add candidates and notes, and line managers give feedback on their meetings. [S1, S2]
7. Data that lets Module 6 (Reports) make statistics later. [S1]

---

## 3. Non-goals

| Not in scope | Reason |
|---|---|
| A connection to the Italian demand application or Power BI | No access is possible. [S1] |
| A mailbox connection (reading emails automatically) | The demand manager pastes or drops the email. Mailbox integration is a later phase. [T] |
| Real candidate search | Module 4. The PoC uses mock data. [S1] |
| CV generation and CV files | Module 5. Module 3 only tracks that the CV was sent to the client, for internal and external candidates. [Team] |
| Reports and statistics screens | Module 6. Module 3 stores the data that Module 6 needs. [S1] |
| Records of possible projects that never started | The stakeholder does not want these records. [S1] |
| Project creation | Module 2 owns projects. [S1] |
| Roles other than PMO, HR BP / Recruiter, and line manager | Module 3 defines only these three roles. [Team] |
| Offer contents (salary, contract terms) | Recruitment owns this. Module 3 records only the offer status. [T] |
| Automatic skill-match scores | Not the main need, because the bench is small. Module 4 or a later phase. [S1] |

---

## 4. Requirements

### 4.1 Terms

| Term | Meaning |
|---|---|
| **Demand** | A request for one or more people with the same profile. A demand can be for an existing project or a future project. [S1] |
| **Position** | One requested person in a demand. A demand for 5 people has 5 positions. Each position ends as **Filled** or **Cancelled**. [T] |
| **Candidate** | One person proposed for one demand. The person is **internal** (an employee, often from the bench) or **external** (a person from the market, found by a recruiter). [S1] |
| **Flow** | The ordered list of steps for one candidate. |
| **Step** | One action in a flow, for example "CV sent" or "Client interview". Each step has a type, a status, dates, and notes. |
| **Placement** | The final result: the candidate has a confirmed start date. A placement fills one position. [S1] |
| **Demand manager** | The PMO person who owns demands. The existing `PMO` role. [S1] |

### 4.2 Roles and permissions

Module 3 has three roles. [Team]

| Action | Demand manager (`PMO`) | HR BP / Recruiter (`HR_BUSINESS_PARTNER`) | Line manager (as meeting participant) |
|---|---|---|---|
| See the demand list and details | Yes | Yes [S1] | No. Only the meetings where they are a participant, with the candidate summary. |
| Create, edit, delete, restore a demand | Yes | No [Team] | No |
| Change headcount, cancel positions, put on hold | Yes | No | No |
| Add a candidate (internal or external) | Yes | Yes [Team] | No |
| Close a candidate (reject, withdraw) | Yes | No | No |
| Add steps, change step status | Yes | No [A] (OQ-05) | No |
| Add notes | Yes | Yes [S1] | Only on meetings where they are a participant [S2] |
| Give meeting feedback | If a participant | If a participant | If a participant [S2] |
| Confirm a placement | Yes | No | No |

- **R-01 (M):** The demand manager (`PMO`) must have all the Module 3 permissions. [Team]
- **R-02 (M):** Recruiters and HR business partners use one role. [S1] They must be able to see all demands, add candidates, and add notes. They must not be able to create, edit, or delete a demand, or change its positions. [Team]
- **R-03 (M):** A line manager must see only the meetings where they are a participant, and the summary of that candidate. They must be able to add their own feedback and notes there. They must not see other demands or candidates. [S2]
- **R-04 (M):** Module 3 must give permissions only to these three roles. [Team]

### 4.3 Demand list

- **D-01 (M, PoC):** The demand list must show one row for each demand with these columns: ID, external ID, title, requested by, positions (filled / cancelled / requested), wanted start date, status, owner.
- **D-02 (M, PoC):** The user must be able to filter the list by status and search by ID, title, or technology.
- **D-03 (M, PoC):** A click on a row must open the demand details page.
- **D-05 (M, PoC):** Each row must have an actions menu (⋯) with "Open candidates", "Demand details and history", "Edit demand", and "Delete demand". Only the demand manager sees the menu. [Team]
- **D-08 (M, PoC):** Each demand has two pages, with tabs at the top. The **Candidates** page shows the positions summary and the candidate list. A click on a list row opens this page. The **Demand details and history** page shows the demand fields, the demand notes, the history, and the original request. [Team]
- **D-06 (M, PoC):** "Edit demand" must open the demand details page in edit mode. The edit form replaces the details card on that page. The system records each changed field in the history, with the old value and the new value. The number of people does not change in this window: the user uses "Add positions" or "Cancel positions", which record a reason. [Team]
- **D-07 (M, PoC):** "Delete demand" needs a reason. Delete removes the demand from the list but keeps the record, the candidates, and the history (see X-02). The demand manager can restore a deleted demand from the "Deleted" tab. [Team]
- **D-04 (S):** The list must show demands with a wanted start date in the next 14 days and no placement in a highlight colour. [A]

### 4.4 Demand creation and autofill

**Demand fields:**

| Field | Required | Source |
|---|---|---|
| External ID (from the Italian application) | No | [S1] "ID" |
| Title / role (for example "Senior Java developer") | Yes | [S1] "which skill" |
| Required skills | Yes, minimum 1 | [S1] Only skills from the Module 1 skill catalog. Each skill has a required knowledge level (1 to 5, or any level) and "must have" or "nice to have". Skills that are not in the catalog stay as "requested skills" until Module 1 adds them to the catalog. [T] |
| Seniority | No | [A] |
| Requested by (name, free text, usually an Italian PM) | Yes | [S1] |
| Interviewer (name, free text) | No | [S1] |
| Date received | Yes, default today | [S1] |
| Wanted start date | Yes | [S1] |
| Wanted end date | No | [S1] |
| Horizontal (Module 2 tree: business unit, practice, team) | Yes | [S1] |
| Vertical (Module 2 taxonomy: sector, sub-industry) | Yes | [S1] |
| Client name | No | [A] |
| Project: free-text name, or an optional link to a Module 2 project | No | [S1] Most demands are for new projects. |
| Number of people | Yes, minimum 1 | [S1] |
| Allocation % for each person (default 100) | Yes | [S2] Parallel allocation such as 50/50 is possible. |
| Required languages | No | [Team] Languages are skills in the "Languages" category of the Module 1 catalog, with the same 1 to 5 levels. Autofill maps CEFR levels from the email: B1 = Intermediate, B2 = Experienced, C1 = Advanced, C2 = Master. |
| Max cost range code | No | [Team] The Module 2 workforce cost code. The final code names are an open question (M2 OQ-06). |
| Max daily rate (EUR) | No | [Team] The budget for external candidates. |
| Owner (demand manager) | Yes, default current user | [T] |
| Original request (email or file text) | No | [S1] Kept as evidence. |
| Notes | No | |

**Creation rules:**

- **D-10 (M, PoC):** The demand page must have a "New demand" form.
- **D-11 (M, PoC):** The form must accept input in two ways: pasted text in a text box, or a dropped `.txt` or `.eml` file.
- **D-12 (M, PoC):** After the input, the system must fill the demand fields from the text. The automatic email from the Italian application has a fixed structure, so the system reads labelled lines such as `Start date: 01/03/2027`. [S1]
- **D-13 (M, PoC):** The system must highlight each required field that it could not fill. The user must fill these fields before the save.
- **D-14 (M, PoC):** The system must not save a demand without a user confirmation. Autofill only prepares the form. [T]
- **D-15 (M):** The system must store the original text with the demand. The details page must show it as "Original request". [S1] The demand manager uses the email to explain why the team looks for people.
- **D-16 (S):** If a demand with the same external ID exists, the system must show a warning before the save. [T]
- **D-17 (C):** The system reads free-form emails (not the fixed structure) with AI extraction. This is a later phase. [A]
- **D-18 (M, PoC):** The user must be able to create a demand by hand, with no pasted text.

### 4.5 Demand details and headcount

- **H-01 (M, PoC):** The details page must show the demand fields, the original request, and a headcount summary: requested, filled, cancelled, open.
- **H-02 (M, PoC):** The user must be able to cancel one or more open positions. A cancel reason is mandatory. [S1]
- **H-03 (M):** The cancel reasons are a fixed list plus "Other" with free text: wrong planning, budget, search takes too long, no such people on the market, client changed scope, other. [S1 gives the reasons; T makes the list]
- **H-04 (M):** The user must be able to increase the number of people. A reason is mandatory. [T]
- **H-05 (M, PoC):** The system must calculate the demand status from the positions:

| Status | Rule |
|---|---|
| **In progress** | At least one position is open. [S1] |
| **Completed** | No open positions, and at least one position is filled. [S1] "The demand closes when we know the start date." |
| **Cancelled** | All positions are cancelled. [T] |
| **On hold** | Set by hand by the demand manager, with a reason. [A] See OQ-04. |

- **H-06 (M, PoC):** The details page must show a history of the demand: each change of headcount, dates, fields, and status, with the user, the time, and the reason. Example: "5 requested, 2 filled, 3 cancelled (budget)". [S1]

### 4.6 Candidates

- **C-01 (M, PoC):** The details page must show a list of candidates. Each row shows the name, internal or external, the current step, the candidate status, and the date of the last change.
- **C-02 (M, PoC):** A click on a candidate must open the flow of that candidate below the row, like an accordion. [Team idea; the design can change]
- **C-03 (M, PoC):** The user must be able to add an internal candidate with the "Find candidates" action. In the PoC, this action opens a mock of Module 4 search. The mock shows bench people and people whose allocation ends in the next 3 months. [S1]
- **C-04 (M, PoC):** The user must be able to add an external candidate with a name, an email (optional), the recruiter, and an expected daily rate (optional). [S1]
- **C-05 (M, PoC):** The system must calculate the candidate status:

| Status | Rule |
|---|---|
| **In process** | The flow is active. |
| **Placed** | The "Start date confirmed" step is done. |
| **Rejected** | The user closed the flow after a negative result. A reason is mandatory. [S1] |
| **Withdrawn** | The candidate or the team stopped the process (for example, the person accepted another demand). A reason is mandatory. [T] |

- **C-06 (M):** The system must keep rejected candidates and their reasons. It must never delete them. [S1]

### 4.7 Candidate flow and steps (the "builder")

The stakeholder said: "The process is not always the same. The CV is always sent. After that, it changes." [S2]

**Before the flow (data on the candidate, not steps):**

| Item | Data | Notes |
|---|---|---|
| **Source** | Bench search (Module 4), recruiter, or by hand | The system records it when the user adds the candidate. |

**First step (always the same, added by the user):** [Team]

| Step | Statuses | Notes |
|---|---|---|
| **CV sent** | Waiting for feedback / Approved / Rejected | The user adds this step by hand. Records the date sent and the date of the feedback. [S1] A candidate has only one "CV sent" step. |

**Custom steps (added by the user after "CV sent", in any order, as many as necessary):**

| Step type | Statuses | Extra data | Rule |
|---|---|---|---|
| **Meeting / interview** | Scheduled / Done: positive / Done: negative / Cancelled | Date and time, kind (internal, technical, client), participants | Participants can add their own feedback. [S2] |
| **Offer sent** | Sent / Accepted / Declined / Withdrawn | Date sent, date of answer | **External candidates only.** [S1] |
| **Custom** | To do / Done / Failed | Free title | For any step not in this list. [T] |

**Final step:**

| Step | Data | Rule |
|---|---|---|
| **Start date confirmed** | Start date, allocation % | For an internal candidate: available after a positive meeting. For an external candidate: available only after an accepted offer. [S1] |

**Flow rules:**

- **F-01 (M, PoC):** Each step must have a type, a status, a date, a responsible user, and notes.
- **F-02 (M, PoC):** A new candidate has an empty flow. The first step that the "Add step" button offers must be "CV sent". The other step types must be available only after the "CV sent" step exists.
- **F-03 (M, PoC):** A negative status (Rejected, Done: negative, Declined, Failed) needs a note with the reason. [S1]
- **F-04 (M, PoC):** After a negative status, the system must ask the user to choose one action: add another step, or close the candidate as Rejected. [T]
- **F-05 (M, PoC):** The system must not show the "Offer sent" step type for internal candidates. [S1]
- **F-06 (M, PoC):** When the "Start date confirmed" step is done, the system must fill one open position. If no position is open, the system must block the step and show a message. [T]
- **F-07 (S):** For an internal candidate, the "Start date confirmed" step must open the Module 2 "Create allocation" form, with the employee, dates, and allocation % already filled in. [T]
- **F-08 (S):** The user must be able to change the order of custom steps that are not started. [A]
- **F-09 (C):** The demand manager can save a flow as a template and use it for the next candidate. [A] See OQ-01.

### 4.8 Meetings, participants, and notes

- **N-01 (M, PoC):** A meeting step must have a list of participants. A participant is a system user (for example a line manager), or an external person (a name, for example a client contact). [S2]
- **N-02 (M, PoC):** Each participant who is a system user must be able to add feedback to that meeting. Feedback is a note plus an optional verdict: positive, neutral, or negative. [S2]
- **N-03 (M):** A participant who has no other Module 3 access (a line manager) must see only that meeting and the candidate summary. See R-03. [S2]
- **N-04 (S):** The system must send a notification to each user participant when the user is added to a meeting, and when the meeting status changes to "Done". [T] Module 2 already has notifications.
- **N-05 (M, PoC):** Notes are possible on each step. Each note shows the author and the time.
- **N-06 (M):** The system must keep each note permanently. A user cannot delete a note. [T] This is the same rule as for allocation comments in Module 2.
- **N-07 (M):** HR business partners and recruiters must be able to add notes on each demand and each candidate. [S1]

### 4.9 One person on several demands and parallel allocation

- **M-01 (M, PoC):** One person can be a candidate on several demands at the same time. [S2]
- **M-02 (M, PoC):** The candidate row must show a badge when the person is also active on other demands. The badge shows the number of other demands. A click shows each demand with its current step. [S2] "That must be shown."
- **M-02a (M, PoC):** When the user picks a candidate, the system must show every other demand of that person, with the current step there. This applies to the internal search (Module 4) and to external candidates. The list also shows placements and past rejections. [Team]
- **M-02b (M, PoC):** When the user adds an external candidate, the system must offer the external people who already exist on other demands. If the name or email matches an existing person, the system must show the other demands. If the person is already on this demand, the system must block the add. [Team]
- **M-02c (M, PoC):** The system must compare the cost of each candidate with the budget of the demand. Internal: the Module 2 range code against the max range code. External: the expected daily rate against the max daily rate. A candidate above the budget gets the label "Above budget". The system does not block the candidate. The user adds a note that explains the exception. [Team; the old Module 2 spec allowed candidates above the budget with an exception note]
- **M-03 (M):** One person can be placed on two demands with partial allocation, for example 50% and 50%. [S2]
- **M-04 (M):** On placement, the system must show a warning if the total allocation of the person is more than 100%. The total is the person's Module 2 allocations plus this placement. The system shows the warning but does not block the placement. This is the same rule as in Module 2. [T]
- **M-05 (S):** When a person is placed on a demand at 100%, the system must show a message on the other active demands of that person. [T]

### 4.10 History and audit

- **X-01 (M):** The system must write each create, change, and status change of a demand, position, candidate, step, and note to the audit log. [S1] The Module 1 audit log already exists.
- **X-02 (M):** The system must never physically delete a demand, candidate, step, or note. Cancelled and rejected items stay visible. A deleted demand is hidden from the main list but kept, and it can be restored (D-07). [T] This is the same rule as in Module 2.
- **X-03 (M):** Each step must record the date of each status change, so the team can calculate time between steps later. [S1] "I record all these dates."

### 4.11 Integration with other modules

The full list of connecting points, with the code references, is in [m3-connecting-points.md](m3-connecting-points.md).

| Module | What Module 3 uses | Direction |
|---|---|---|
| Module 1, Skill Matrix | Employees, skill catalog | Reads |
| Module 2, Allocation | Bench and availability, allocations that end soon, horizontal tree, vertical taxonomy, projects (optional link), the "Create allocation" form | Reads. On placement, opens the form (F-07). |
| Module 4, Search | Candidate search | Mocked in the PoC |
| Module 5, CV generation | Not used. The CV is made and sent outside the system. Module 3 tracks only the "CV sent" step. | Not in the PoC |
| Module 6, Reports | Statistics (see Appendix B) | Module 3 supplies the data |
| Italian demand application, Power BI | No connection [S1] | The automatic email is the only input |

### 4.12 Data overview

| Entity | Main fields |
|---|---|
| `Demand` | id, external_id, title, technologies, seniority, requested_by, interviewer, date_received, wanted_start, wanted_end, horizontal_node, vertical, client_name, project_name, project_id (optional), headcount, allocation_pct, owner, status, source_text, notes |
| `DemandPosition` | demand, status (Open / Filled / Cancelled), filled_by_candidate, cancel_reason |
| `Candidate` | demand, type (Internal / External), source (Bench search / Recruiter / Manual), employee (internal), external_name, external_email, recruiter, cv_file, status, close_reason |
| `FlowStep` | candidate, order, type, title, status, date, responsible_user, data (type-specific fields) |
| `StepStatusChange` | step, old_status, new_status, changed_by, changed_at |
| `MeetingParticipant` | step, user (optional), external_name (optional), verdict |
| `Note` | target (demand, candidate, or step), author, text, created_at |
| `DemandHistory` | demand, field, old_value, new_value, reason, changed_by, changed_at |

### 4.13 PoC scope (HTML prototype)

The PoC is one HTML file with mock data and no backend. It shows the idea, so the team can discuss it before the spec is final.

**In the PoC:**

1. Demand list with filter and search.
2. "New demand" form with paste and drop autofill, plus a sample email to try.
3. Demand details: fields, original request, headcount summary, cancel positions, history.
4. Candidate list with the accordion flow.
5. "Find candidates" (Module 4 mock) and "Add external candidate".
6. "Add step" (first "CV sent", then custom steps), step statuses, notes, the negative-result choice.
7. Meeting participants and their feedback.
8. Badge for a person on several demands.

**Not in the PoC:** permissions, notifications, real saving (data resets on reload), Module 2 allocation creation, statistics.

---

## 5. Acceptance

**Demand:**

- [ ] A demand manager pastes the sample automatic email, and the form fills all labelled fields.
- [ ] A demand manager drops a `.txt` file with the same content, and the result is the same.
- [ ] The form highlights each required field that autofill could not fill, and the save is blocked until the user fills it.
- [ ] The saved demand shows the original email text on its details page.
- [ ] A demand for 5 people with 2 placements and 3 cancelled positions (reason "Budget") shows "2 filled, 3 cancelled" and the status "Completed".
- [ ] The demand history shows the cancel action with the user, the time, and the reason.

**Candidates and flow:**

- [ ] A new candidate has an empty flow, and "CV sent" is the only step type that the user can add first.
- [ ] After "CV sent" exists, the user can add meetings, offers (external only), and custom steps, but not a second "CV sent".
- [ ] The user adds a meeting after "CV sent", adds a line manager as a participant, and the line manager adds feedback.
- [ ] A "Rejected" status without a note is blocked.
- [ ] An internal candidate has no "Offer sent" step type. An external candidate has it.
- [ ] An external candidate cannot reach "Start date confirmed" without an accepted offer.
- [ ] "Start date confirmed" fills one position. When no position is open, the step is blocked.
- [ ] A person who is a candidate on two demands shows a badge on both demands.
- [ ] A placement that takes a person over 100% total allocation shows a warning and does not block.

**Access:**

- [ ] The demand manager (PMO) can do every action in the table in 4.2.
- [ ] An HR business partner or recruiter can add an internal and an external candidate, and can add a note.
- [ ] An HR business partner or recruiter cannot create, edit, or delete a demand, change positions, or change a step status.
- [ ] A line manager sees only the meetings where they are a participant, and can add feedback and notes there.
- [ ] A line manager cannot open a demand or a candidate where they are not a meeting participant.
- [ ] Users with other roles have no Module 3 permissions.
- [ ] No action in the system deletes a demand, candidate, step, or note.

---

## 6. Open questions

| ID | Question | Impact | Ask |
|---|---|---|---|
| OQ-01 | Is the flow built step by step during the process, or does the user select a template at the start? | Builder design (F-02, F-09) | Demand manager |
| OQ-02 | Can we get one example of the automatic email, with names removed? | Autofill rules (D-12) | Demand manager |
| OQ-03 | Is the demand ID the same ID that the Italian application uses? | External ID field, duplicate check | Demand manager |
| OQ-04 | Does a demand need the status "On hold"? Are there other statuses? | Status rules (H-05) | Demand manager |
| OQ-05 | Can a recruiter change step statuses, for example "CV sent: Approved"? (Adding candidates is decided: yes.) | Permissions (4.2) | Demand manager |
| OQ-06 | Can two steps run at the same time? For example, two client interviews on the same day. | Flow model | Demand manager |
| OQ-07 | Can the client see or receive anything from the system, or does all client communication stay in email? | Scope of "CV sent" | Demand manager |
| OQ-10 | Are participant notes visible to all users with access, or only to the demand manager? | Note visibility | Demand manager |
| OQ-11 | Is the allocation % set on the demand, or on each candidate placement? | 50/50 rule (M-03) | Demand manager |
| OQ-12 | When an internal candidate is placed, must the system create the Module 2 allocation automatically? | F-07 | Demand manager, PMO |
| OQ-13 | Do we store the CV files of external candidates? How long? Are there data-protection rules? | Legal, storage | HR / Legal |
| OQ-14 | Do we need seniority, client name, location, or priority on a demand? | Demand fields | Demand manager |
| OQ-15 | Can a rejected candidate be added again to the same demand later? | Candidate rules | Demand manager |

---

## Appendix A: Decision log

| # | Decision | Source |
|---|---|---|
| 1 | The demand manager enters all demands. Italian PMs do not use the system. | S1 |
| 2 | No connection to the Italian application or Power BI. | S1 |
| 3 | A demand does not need a Module 2 project. Most demands are for new projects. | S1 |
| 4 | Do not record possible projects that never started. | S1 |
| 5 | A demand closes when the start dates of the people are known, not when they start. | S1 |
| 6 | Track filled and cancelled positions separately, with history and reasons. | S1 |
| 7 | Candidates can be internal or external. Only external candidates get an offer. | S1 |
| 8 | The process after "CV sent" is different each time, so the flow needs a builder. | S2 |
| 9 | Meeting participants (for example line managers) add their own feedback. | S2 |
| 10 | A person can be a candidate on several demands. The system must show it. | S2 |
| 11 | Parallel allocation (for example 50/50) is possible. | S2 |
| 12 | Recruiters and HR BPs are one role. They see all demands, add candidates, and add notes. They do not create demands. | S1, Team |
| 13 | Module 3 has three roles only: PMO (all permissions), HR BP / Recruiter, and line manager (own meetings: feedback and notes). The other roles in the earlier draft are removed. | Team |
| 14 | Candidate search is mocked (Module 4). There is no CV generation: "CV sent" is a tracker step for internal and external candidates. | Team |
| 15 | Statistics go into the spec as a later phase, not in the PoC. | S1 |
| 16 | The user adds "CV sent" by hand as the first step of each flow. No second "CV sent" step. | Team |
| 17 | Languages are a separate requirement with the same levels as skills. | Team |
| 18 | A demand has a cost limit (range code and daily rate). Candidates above it are flagged, not blocked. | Team |

## Appendix B: Later phases

**Statistics (Module 6, with data from Module 3):**

- Technologies that are hard to find, and technologies that are easy to find. [S1]
- Cancel reasons by count and by period. [S1]
- Time to fill: from "date received" to "start date confirmed".
- Time at each step: for example, how long the client takes to send CV feedback.
- Internal against external placements.

**Other later items:**

- Mailbox integration: the system reads the automatic emails directly. [T]
- AI extraction for free-form emails (D-17).
- Flow templates (F-09).
- Automatic skill match for candidates (Module 4).

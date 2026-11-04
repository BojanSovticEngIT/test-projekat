# Module 02 — Demo Script

End-to-end walkthrough for Week 2 sign-off. Run on Podman deploy with seed data.

**Duration:** ~25 minutes  
**Roles needed:** PMO, Line Manager, HR Business Partner, Employee

> **Out of scope:** Staffing & matching, leave management — not part of this demo.

---

## Setup

1. Start app: `cd podman && podman compose up`
2. Open frontend: `http://localhost:5173`
3. Seed users (passwords from M1 seed — typically documented in `002-seed-data.sql`):
   - `pmo.user` — PMO
   - `manager.user` — Line Manager
   - `hrbp.user` — HR Business Partner
   - `employee.one` — Employee

---

## Part 1 — PMO: Projects & allocation (10 min)

### 1.1 Login as PMO
- [ ] Login succeeds; Workforce nav section visible
- [ ] Dashboard shows bench summary cards

### 1.2 Create client and project
- [ ] Go to **Workforce → Projects/Services → New Client** (opens the Create Client page)
- [ ] Create client with vertical from Structure.xlsx: **Enterprise** / **Telco&Media**
- [ ] On the Create Project page (opens after saving the client, or via **New Project**), create project "Digital Transformation":
  - Client: (above)
  - Project Manager: search and select an employee (a project manager profile is created automatically if needed)
  - Horizontal node: **ENG DIGITAL** → **APPLICATION MODERNIZATION AND MANAGEMENT** → **AM SOL CENTER NORD** (seeded from Structure.xlsx)
  - Status: ACTIVE
- [ ] Project appears in list

### 1.3 Create allocation
- [ ] Go to **Workforce → Allocations** → **New Allocation** (opens the Create Allocation page; pick the project)
- [ ] Assign **Employee One** at **80%**, role "Developer"
- [ ] Start: today; End: +6 months
- [ ] Save → lifecycle ACTIVE (if start date is today)
- [ ] Employee no longer at 100% available

### 1.4 Test conflict / override
- [ ] Create second allocation for same employee on another project at **30%**
- [ ] System flags overallocation (110% > 100%)
- [ ] Enter mandatory override note → allocation confirmed

---

## Part 2 — Bench & availability (5 min)

### 2.1 Login as PMO
- [ ] Go to **Workforce → Bench/Availability**
- [ ] Tab "Currently on bench" — employees with 0% allocation listed
- [ ] Assigned employees NOT on bench list

### 2.2 Availability search
- [ ] Open the **Availability search** tab on the same page
- [ ] Filter: min available 20%
- [ ] Employee One shows ~20% available (after 80% allocation)
- [ ] Columns show capacity, allocated, available %

---

## Part 3 — Line Manager: engagement skills (5 min)

### 3.1 Login as Line Manager
- [ ] Go to employee **Employee One** → allocation detail
- [ ] **Add engagement skill**: Java, Practitioner, Primary
- [ ] **Add engagement skill**: Spring Boot, Practitioner, Supporting
- [ ] Skills saved

### 3.2 Verify M05 event
- [ ] Check `integration_event_outbox` table (or API log) — `engagement_skills_updated` event present

---

## Part 4 — Governance (3 min)

### 4.1 LM submits change
- [ ] Login as Line Manager
- [ ] Submit **Allocation Change** workflow (e.g. reduce % to 60%)
- [ ] Status: SUBMITTED

### 4.2 HR BP approves
- [ ] Login as HR BP
- [ ] Workflow inbox → approve with comment
- [ ] Notification appears for PMO

### 4.3 PMO final approval
- [ ] Login as PMO
- [ ] Approve workflow → allocation updated
- [ ] Audit log entry created

---

## Part 5 — Import (2 min)

### 5.1 Workforce Excel import
- [ ] Login as PMO → **Workforce → Import**
- [ ] Upload sample Excel → validation report shown
- [ ] Confirm import → counts displayed
- [ ] Re-upload same file → no duplicates created

---

## Part 6 — Employee view (2 min)

### 6.1 Own history only
- [ ] Login as Employee One
- [ ] **My Assignments** shows own allocation history
- [ ] Cannot access other employees' assignments (403 or hidden)

---

## Part 7 — M1 regression (3 min)

- [ ] Login as Employee → **My Skills** → add skill works
- [ ] Login as Manager → **Validation Requests** → list loads
- [ ] Login as Admin → **Skill Catalog** → list loads
- [ ] Login as HR → **Employees** → search works

---

## Sign-off

| Area | Pass? | Notes |
|------|-------|-------|
| Projects & allocations | | |
| Bench & availability | | |
| Engagement skills | | |
| Governance workflow | | |
| Import | | |
| RBAC / Employee scope | | |
| M1 regression | | |
| Podman deploy | | |

**Demo lead:** _______________ **Date:** _______________

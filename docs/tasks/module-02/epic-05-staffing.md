# Epic 05 — Staffing Requests & Candidate Matching

> **OUT OF SCOPE** — Deferred to a later module. This file is kept as reference design only. Do not implement for Module 02 MVP.

**Priority:** ~~P0~~ Out of scope · **Days:** ~~6–8~~ — · **Branch:** ~~`feat/m2-epic-05-staffing`~~  
**Spec refs:** §5.1 (PMO workflow), §7 (StaffingRequest, StaffingRequestSkill), §8.1 (M1 skills), §9

---

## Goal

PMO can record staffing demand, search available people using M1 skill data, and build a shortlist with match explanations.

---

## Dependencies

- Epic 02 (projects)
- Epic 03 (accept candidate → create allocation)
- Epic 04 (availability in match scoring)
- M1: `employee_skill`, `skill` catalog (read-only)

---

## Module 01 changes

None — reads M1 skill data at query time only (spec §8.1 ownership rule).

---

## Acceptance criteria

- [ ] PMO creates staffing request with role, skills, seniority, dates
- [ ] Candidate list shows: matched skills, missing skills, availability %, seniority status
- [ ] 80% match shown as "Recommended" badge — not a hard filter
- [ ] PMO can add below-threshold candidates with exception note
- [ ] PMO records candidate result: accepted / rejected / pending / needs follow-up
- [ ] Accept candidate → navigates to allocation create with pre-filled data
- [ ] Accepting creates allocation and updates staffing request status when filled

---

## Backend tasks

### Database
- [ ] Create `014-m2-staffing.sql` — see [m2-data-model.md](./m2-data-model.md)

### Entities
- [ ] `StaffingRequest`, `StaffingRequestSkill`, `StaffingCandidate`

### `StaffingRequestService`
- [ ] CRUD for staffing requests (PMO/Admin)
- [ ] Attach skills with `mandatory`, `weight`, `required_level`
- [ ] Status transitions: OPEN → FILLED / CANCELLED

### `CandidateMatchingService`
For each active employee (scoped filters optional):
1. Load M1 `employee_skill` where `validation_status = VALIDATED` (prefer manager-validated level)
2. Compare against `staffing_request_skill` list
3. Compute `match_score` = weighted % of mandatory + preferred skills met
4. List missing skills
5. Attach `available_pct` from `AvailabilityService`
6. Compare `seniority_code` from `employee_workforce_profile` if present
7. Sort by match_score DESC, then available_pct DESC
8. Flag `recommended = match_score >= 80`

- [ ] `addCandidate(requestId, employeeId, exceptionNote)` — allow below threshold with note
- [ ] `updateCandidateResult(requestId, employeeId, result)` — ACCEPTED/REJECTED/PENDING/NEEDS_FOLLOW_UP

### Controllers
- [ ] `StaffingRequestController` per [m2-api-scope.md](./m2-api-scope.md)
- [ ] `GET /api/staffing-requests/{id}/candidates` — triggers match on demand (cache optional)

---

## Frontend tasks

- [ ] `/workforce/staffing` — request list (status, project, role, # resources)
- [ ] Staffing request create/edit form:
  - Project select
  - Role, # resources, seniority, range code, dates
  - Skills multi-add: pick from M1 catalog, mark mandatory/preferred, set level
- [ ] Candidate list page per request:
  - Card per candidate: photo/name, match %, recommended badge
  - Matched skills (green), missing skills (red)
  - Available %, seniority match indicator
  - Actions: Accept / Reject / Add to shortlist
  - Exception note dialog for below-threshold adds
- [ ] "Create allocation" flow on Accept — pre-fill employee, project, dates, `source_request_id`

---

## Technical notes

- M2 does NOT write back to M1 skill tables (spec §8.1)
- OQ-02: requests visible immediately on create (no pre-approval gate)
- PM workflow steps 5–6 (send CVs, interview) are out of system — we record result only
- `number_of_resources` > 1: track fill count; auto FILLED when count reached

---

## Detailed checklist

See [week-2.md](./week-2.md) Day 6.

# Epic 07 — Leave & Capacity Forecasting

> **OUT OF SCOPE** — Deferred to a later module. This file is kept as reference design only. Do not implement for Module 02 MVP.

**Priority:** ~~P1~~ Out of scope · **Days:** ~~8–9~~ — · **Branch:** ~~`feat/m2-epic-07-leave-capacity`~~  
**Spec refs:** §3.5 (leave), §6.3 (forecasting), §4.2 (HR BP approves leave)

---

## Goal

Leave records affect bench and capacity. PMO sees 3/6/12-month supply vs demand gaps.

---

## Dependencies

- Epic 01 (employee, roles)
- Epic 04 (bench must exclude on-leave employees)
- Epic 03 (demand from open allocations)

---

## Module 01 changes

- Bench integration: wire `LeaveService.isOnLeave(employeeId, date)` into `AvailabilityService` (Epic 04 stub → real)

---

## Acceptance criteria

- [ ] Approved leave reduces available supply in capacity calculations
- [ ] Cannot create new allocation for employee on active approved leave (400)
- [ ] Employee on leave excluded from bench list
- [ ] Leave records cannot be deleted; cancellation creates cancellation record
- [ ] HR BP can approve leave for their org unit
- [ ] Capacity API returns monthly supply, demand, gap for 3/6/12 month horizons

---

## Backend tasks

### Database
- [ ] Create `016-m2-leave.sql` — see [m2-data-model.md](./m2-data-model.md)

### `LeaveService`
- [ ] `submit(employeeId, type, start, end, submitter)` — LM for direct reports
- [ ] `approve(leaveId, hrBpUser)` — HR BP for org unit
- [ ] `cancel(leaveId, user, reason)` — creates new row with `cancellation_of_id`, status CANCELLED
- [ ] `isOnLeave(employeeId, date)` — any APPROVED leave covering date (excluding cancelled)
- [ ] No DELETE endpoint — ever

### Allocation integration
- [ ] `AllocationService.create()` — reject if `leaveService.isOnLeave(employeeId, startDate)`
- [ ] `AvailabilityService.isOnBench()` — return false if on leave

### `CapacityForecastService`
Per month in horizon (3, 6, or 12):
- **Supply** = count active employees in vertical L1 minus leave days
- **Demand** = sum open allocation % requirements + open staffing request headcount
- **Gap** = demand − supply (negative = shortage)

- [ ] `GET /api/workforce/capacity?horizon=3|6|12`
- [ ] Group by `client.vertical_n1`

### Controllers
- [ ] Leave endpoints per [m2-api-scope.md](./m2-api-scope.md)

---

## Frontend tasks

- [ ] Leave request form (employee select for LM, date range, leave type)
- [ ] Leave list page — filter by status; HR BP sees approval queue
- [ ] Approve / reject buttons for HR BP
- [ ] Capacity forecast section on `/workforce/dashboard`:
  - Horizon toggle: 3 / 6 / 12 months
  - Table: month, vertical, supply, demand, gap
  - Color: negative gap = red, positive = amber (idle risk)

---

## Technical notes

- Return from leave: no manual action — `isOnLeave` returns false after `end_date`
- Do not add `ON_LEAVE` to `EmploymentStatus` — derive from leave table (cleaner than M1 frontend-only enum)
- Capacity is computed on demand — may be slow for 12 months; add caching if needed

---

## Detailed checklist

See [week-2.md](./week-2.md) Day 8.

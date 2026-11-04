# Epic 04 — Availability, Bench & Alerts

**Priority:** P0 · **Days:** 5–6 · **Branch:** `feat/m2-epic-04-bench`  
**Spec refs:** §3.3, §3.4, §5.7, §6, §10 (AC 13–16)

---

## Goal

Computed availability and bench views for PMO, with proactive 30-day alerts delivered in-app (and email when configured).

---

## Dependencies

- Epic 01 (`contract_fte`)
- Epic 03 (allocations exist)

---

## Module 01 changes

None.

---

## Acceptance criteria

- [ ] `available_pct` computed per employee for any given date
- [ ] Employee with zero ACTIVE lifecycle allocations today appears on bench list
- [ ] Bench results show `allocated_pct` and `capacity_pct`
- [ ] Three horizons: now, 15 days, 30 days
- [ ] 30-day project end alert → LM + all PMO (in-app minimum)
- [ ] Partially-available employees (e.g. 30%) in availability view, NOT bench list

---

## Backend tasks

### `AvailabilityService` (no DB table — computed)

```
capacity_pct  = employee.contract_fte × 100
allocated_pct = SUM(allocation_pct) WHERE lifecycle ACTIVE on date
available_pct = capacity_pct - allocated_pct
```

- [ ] `computeForEmployee(employeeId, LocalDate date)` → DTO with all three pcts
- [ ] `computeForAllEmployees(date, filters)` → paginated list
- [ ] `isOnBench(employeeId, date)`:
  - `allocated_pct == 0`
  - `employment_status == ACTIVE`
  - `workforce_type` in EMPLOYEE/B2B/SUPPLIER (same rules)

### `BenchService`
- [ ] `getBenchNow()` — current bench list
- [ ] `getBenchWithinDays(15|30)` — assignment ending in N days with no follow-on
- [ ] Each entry: name, org unit, workforce type, days on bench / days until bench, last project, line manager

### `BenchAlertScheduler` (`@Scheduled` daily)
- [ ] Find allocations ending in 30 days where employee has no follow-on ACTIVE allocation
- [ ] Notify LM + all PMO users (in-app via NotificationService)
- [ ] Email if SMTP configured
- [ ] Idle alerts: 30d → HR BP; 60d → HR BP + PMO; 90d → PMO escalation (spec §5.7 table)

### Controllers
- [ ] `GET /api/workforce/availability` — query: `date`, `orgUnit`, `minAvailablePct`
- [ ] `GET /api/workforce/bench` — query: `horizon` (0, 15, 30)

---

## Frontend tasks

- [ ] `/workforce/bench` single page "Bench/Availability" (sidebar label **Bench/Availability** and the Workforce module card both open it directly on the first tab, **Currently on bench** — no intermediate landing page with Bench/Availability cards):
  - Every tab's table is paginated separately, same control as Projects/Services (rows per page 10/20/50, default 20; `page` and `size` in the URL, reset when switching tabs or changing availability filters). Paging is client-side because `GET /api/workforce/bench` and `/availability` return full lists
  - Tab 1: Currently on bench
  - Tab 2: Bench within 15 days
  - Tab 3: Bench within 30 days
  - Columns per spec §5.7
  - Tab 4: Availability search (`/workforce/bench?tab=availability`)
    - Date picker (default today)
    - Org unit filter
    - Min available % slider
    - Table: name, capacity, allocated, available %
    - Legend: Bench (0% allocated) = red, Partial availability = amber (no "Fully available" legend tag)
    - Filters apply to this tab only; bench tabs take only the horizon
- [ ] `/workforce/availability` redirects to `/workforce/bench?tab=availability` (no separate page or sidebar entry)
- [ ] Workforce dashboard cards: bench count, ending-soon count; each card's **View** opens `/workforce/bench` on its matching tab (On bench now → Currently on bench, Bench within 15 days → `?horizon=1`, Bench within 30 days → `?horizon=2`)
- [ ] Partially-available employees styled differently from bench (e.g. amber vs red)

---

## Technical notes

- Availability is **never stored** — always computed from allocations + FTE
- B2B and Supplier follow identical bench rules (spec §3.6)
- "No follow-on" = no ACTIVE allocation starting within 7 days of current end (configurable constant)
- Performance target: < 2s for ~1000 employees (spec §11)

---

## Detailed checklist

See [week-1.md](./week-1.md) Day 5.

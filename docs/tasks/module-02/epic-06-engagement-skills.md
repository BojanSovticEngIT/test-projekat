# Epic 06 — Engagement Skills & M05 Events

**Priority:** P1 · **Days:** 6–7 · **Branch:** `feat/m2-epic-06-engagement-skills`  
**Spec refs:** §5.5, §7 (EngagementSkill), §8.2 (M05 event), §10 (AC 17–19)

---

## Goal

Line Managers record skills used on each engagement. Module 05 receives `engagement_skills_updated` events via outbox.

---

## Dependencies

- Epic 03 (ACTIVE lifecycle allocations exist)
- M1: `skill` catalog (read-only FK)

---

## Module 01 changes

- New `EngagementSkillLevel` enum (separate from M1 5-level `KnowledgeLevel`) — see [m1-refactor-inventory.md](./m1-refactor-inventory.md)

---

## Acceptance criteria

- [ ] LM adds skill to ACTIVE allocation for direct report
- [ ] Free-text skill names rejected (400) — catalog `skill_id` only
- [ ] Levels: Beginner / Practitioner / Expert
- [ ] Primary vs Supporting flag per skill
- [ ] On allocation close, system prompts LM to confirm/update skills
- [ ] On save and on close, `integration_event_outbox` row written with spec §8.2 payload
- [ ] PMO and Admin can also record engagement skills

---

## Backend tasks

### Database
- [ ] Create `014-m2-engagement-skill.sql` + `integration_event_outbox`

### Entities
- [ ] `EngagementSkill.java`
- [ ] `IntegrationEventOutbox.java`

### `EngagementSkillService`
- [ ] `addSkill(allocationId, skillId, level, primary, user)` — RBAC: LM direct reports, PMO, Admin
- [ ] Validate allocation lifecycle is ACTIVE or TERMINATED (read-only if TERMINATED)
- [ ] Validate `skillId` exists in M1 catalog
- [ ] Reject duplicate skill_id on same allocation
- [ ] `updateSkill(...)` — level or primary flag
- [ ] On every save → call `EngagementSkillEventPublisher.publish(allocationId)`

### `EngagementSkillEventPublisher`
- [ ] Build JSON payload per spec §8.2:
  ```json
  {
    "event": "engagement_skills_updated",
    "employee_id", "allocation_id", "project_id", "project_name",
    "allocation_start", "allocation_end",
    "skills": [{ "skill_id", "skill_name", "level_used", "primary_skill" }]
  }
  ```
- [ ] Insert into `integration_event_outbox`
- [ ] Also called from `AllocationService.end()`

### Controllers
- [ ] `GET/POST /api/allocations/{id}/skills`
- [ ] `PUT /api/allocations/{id}/skills/{skillId}`

---

## Frontend tasks

- [ ] Engagement skills panel on allocation detail page
- [ ] Skill search dropdown (queries M1 `/api/skills`)
- [ ] Level select: Beginner / Practitioner / Expert
- [ ] Primary / Supporting toggle
- [ ] List recorded skills with level badges
- [ ] Step on the allocation end page (`/workforce/allocations/:id/end`): "Confirm skills used on this engagement" (the employee detail page shows the same step in a modal)
- [ ] Engagement Skills page for an allocation (`/workforce/allocations/:id/skills`, opened by **Skills** on the Allocations list)
- [ ] Read-only view for HR

---

## Technical notes

- M05 consumes outbox — we do not build M05
- No Kafka required — DB outbox is sufficient for MVP
- Skill levels are engagement-specific — do not update M1 `employee_skill` table
- LM prompted at allocation start (banner) and close (modal)

---

## Detailed checklist

See [week-2.md](./week-2.md) Day 6.

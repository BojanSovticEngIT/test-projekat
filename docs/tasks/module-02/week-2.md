# Week 2 — Days 6–10

**Goal:** Engagement skills, governance, import, deploy  
**Team:** Dev A + Dev B (full-stack, parallel lanes)

> **Out of scope:** Staffing & candidate matching (Epic 05), leave & capacity forecasting (Epic 07) — deferred.

---

## Day 6 — Engagement Skills (Epic 06)

### Dev A
- [ ] Create `014-m2-engagement-skill.sql` + `integration_event_outbox`
- [ ] Create `EngagementSkillService` — catalog skills only (reject unknown skill_id)
- [ ] Create `EngagementSkillEventPublisher` — write spec §8.2 JSON to outbox
- [ ] Trigger event on skill save AND on allocation end
- [ ] APIs: GET/POST/PUT allocation skills

### Dev B
- [ ] Create engagement skills section on allocation detail
- [ ] Skill picker from M1 catalog (searchable dropdown)
- [ ] Level select: Beginner / Practitioner / Expert
- [ ] Primary / Supporting toggle per skill
- [ ] Prompt LM to confirm skills on allocation close (modal)
- [ ] Show recorded skills read-only for HR view

**End of day:** LM records engagement skills; outbox event written on save/close.

---

## Day 7 — Governance & Notifications (Epic 08 part 1)

### Dev A
- [ ] Create `015-m2-workforce-profile.sql`, `016-m2-governance-notify.sql`
- [ ] Create `WorkflowService` — LM→HRBP→PMO chain per spec §5.4
- [ ] SLA job: highlight red after 3 days HRBP; escalate after 5 days PMO
- [ ] Create `NotificationService` — in-app + email (SMTP or log fallback)
- [ ] `@Scheduled` bench alert job (30-day project end, idle 30/60/90)

### Dev B
- [ ] Build workflow inbox pages (HR BP queue, PMO queue)
- [ ] Approve/reject dialogs with mandatory reason
- [ ] Notification bell in `AppLayout` header + unread count

**End of day:** Governance flow works; notifications appear for workflow and bench alerts.

---

## Day 8 — Import & HR Sync (Epic 08 part 2)

### Dev A
- [ ] Create `WorkforceImportService` — validate + confirm pattern
- [ ] `WorkdaySyncService` — CSV adapter + dry-run manual trigger
- [ ] Import and Workday endpoints per [m2-api-scope.md](./m2-api-scope.md)

### Dev B
- [ ] Build `/workforce/import` 4-step wizard (reuse M1 Import page patterns)
- [ ] Column mapping UI (manual; AI mapping if Azure creds available)
- [ ] Workday sync trigger button on import page (dry-run default)

**End of day:** Import wizard validates rows; Workday sync dry-run works.

---

## Day 9 — Integration & Docs (Epic 09 part 1)

### Dev A
- [ ] Update `podman-compose.yml`: add `SMTP_*`, `AZURE_OPENAI_*` env vars
- [ ] Nightly Workday sync `@Scheduled` job (or document manual-only if no creds)
- [ ] Backend integration tests for critical paths (allocation conflict, bench, RBAC 403)
- [ ] Update `docs/api/openapi.yaml` with M2 paths
- [ ] Update `docs/architecture/rbac-matrix.md`

### Dev B
- [ ] Polish workforce dashboard (bench summary + ending-soon count)
- [ ] Employee role: own assignment history view only
- [ ] Consistent page headers and breadcrumbs under `/workforce/*`
- [ ] Loading states and error toasts on all M2 API calls

**End of day:** Integration tests pass; docs updated; dashboard polished.

---

## Day 10 — Deploy & Acceptance (Epic 09 part 2)

### Dev A
- [ ] Verify fresh `podman compose up` on clean machine
- [ ] Document all env vars in `podman/README.md`
- [ ] Fix any blocking issues from integration tests

### Dev B
- [ ] Run full [demo-script.md](./demo-script.md)
- [ ] Walk through acceptance criteria (spec §10) — check off in epic-09
- [ ] M1 regression pass
- [ ] Fix UI polish issues found during demo rehearsal

**End of day:** Full demo ready; all in-scope acceptance criteria verified or documented as known gaps.

---

## Week 2 checkpoint

- [ ] [demo-script.md](./demo-script.md) runs end-to-end without errors
- [ ] Spec §10 in-scope acceptance criteria checked off in [epic-09-deploy.md](./epic-09-deploy.md)
- [ ] [m2-open-questions.md](./m2-open-questions.md) shared with stakeholders
- [ ] Podman single-unit deploy works on clean machine

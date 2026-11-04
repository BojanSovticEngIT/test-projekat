# Slice 06 — Certifications

> **Product direction (supersedes the rest of this slice).** The approved requirement is that every
> authenticated user manages **their own PDF-backed certificates**. This overrides the earlier
> statements below that certificate documents/PDFs are out of MVP scope and that certifications follow
> a catalog + DRAFT/SUBMITTED/VALIDATED approval workflow. The sections under
> "Legacy design" are **not implemented** and are kept only for history.

## Current feature — Own certificates

### Business rules
- A certificate belongs to exactly one employee (the authenticated user's employee record) and is
  visible/manageable only by that user. No manager/HR/admin cross-user visibility, no approval, no status.
- Fields: **PDF document** and/or **link** (at least one is required; both are allowed), **name** (required, max 255), **completion date** (required, not in
  the future), **expiration date** (optional, not before the completion date), **skills** (optional, zero or more existing skills).
- PDF validation (server-side, authoritative): `.pdf` extension, content type `application/pdf`,
  non-empty, `%PDF-` magic bytes, content detected as `application/pdf` by Apache Tika (`tika-core`, content only — the
  file name and declared type are ignored, which blocks spoofed uploads), max **30 MB**. The frontend repeats the extension/type check early.
- Link validation (server-side): absolute `http`/`https` URL with a host, max 2048 characters; blank means no link.
  The frontend renders it as an anchor opened in a new tab (`rel="noopener noreferrer"`).
- Update replaces name, completion date, skills and link (blank removes it; rejected if neither a PDF nor a link
  would remain); the PDF is kept unless a new `file` is sent, in which case it is replaced in the same DB transaction. Delete removes the certificate, its skill links and its PDF.
- A certificate id owned by another user returns `404` (same as an unknown id).
- Visibility: the owner manages it. Reviewers (ADMIN/HR/LINE_MANAGER direct reports) can only read the
  certificates **linked to the skill under review**, through the `employee-skills` routes below.
- A certificate is tied to a skill via its skills; an employee skill shows the employee's certificates
  linked to the same catalog skill.
- CREATE/UPDATE/DELETE are written to `audit_log` (entity `Certificate`) synchronously.

### DB tables (migration `020-m3-employee-certificates.sql`)
`certificate`, `certificate_skill`, `certificate_document` — see `docs/db/data-model.md`.
The legacy `certification`, `certification_skill`, `employee_certification` tables are untouched and unused.

### API (see `docs/api/openapi.yaml`)
```http
GET    /api/me/certifications?page=&size=   ← paginated, newest first
GET    /api/me/certifications/{id}
POST   /api/me/certifications               ← multipart: file and/or link, name, completionDate, skillIds[]
PUT    /api/me/certifications/{id}          ← multipart: name, completionDate, skillIds[], link, optional file
DELETE /api/me/certifications/{id}
GET    /api/me/certifications/{id}/document ← PDF download (attachment); "View" fetches it with the JWT and opens a blob URL in a new tab

# Certificates of a skill
GET    /api/me/skills/certificate-counts                        ← { employeeSkillId: count }
GET    /api/me/skills/{employeeSkillId}/certifications          ← own certificates linked to the skill
GET    /api/employee-skills/{employeeSkillId}/certifications    ← reviewer; only certificates linked to that skill
GET    /api/employee-skills/{employeeSkillId}/certifications/{id}/document
# GET /api/validation-requests/skills rows carry certificateCount

# Read-only, for the employee detail page; same visibility as GET /api/employees/{id}
GET    /api/employees/{employeeId}/certifications?page=&size=
GET    /api/employees/{employeeId}/certifications/{id}/document
```

### Frontend
- `/certifications` — own certificates table (name, link, completion date, skills, Download (PDF only) / Open link (link only) / Edit / Delete, Add).
- `/certifications/new` and `/certifications/:id/edit` — dedicated form pages.
- `/employees/{id}` — read-only "Certifications" card below Skill Profile (same columns, Download only, no write controls).
- `/my-skills/:id/edit` — "Certificates" card: linked certificates (View / Download), link an existing certificate, or
  Add certificate (opens `/certifications/new?skillId=&skillName=&returnTo=` with the skill preselected and returns here).
- `/my-skills` — "Certificates" count column; selecting skills without a certificate shows a non-blocking hint.
- `/my-skills/new` — shows whether certificates are already linked to the chosen skill.
- `/validation-requests/:id` — "Supporting certificates" per skill (View / Download); `/validation-requests` has a Certificates count column.

---

## Legacy design (not implemented — superseded)

## Business Rules

- The system maintains a **global certification catalog** managed by ADMIN.
- Certifications in the catalog can be linked to one or more related skills.
- Employees can claim (add) certifications from the catalog to their profile.
- Each certification claim includes an issue date, optional expiration date, and notes.
- A claimed certification follows a simple **DRAFT → SUBMITTED → VALIDATED / REJECTED** workflow,
  similar to the skill self-assessment flow.
- Manager or Admin can add a certification directly to an employee (status starts as VALIDATED).
- Employee adds their own certification claim (status starts as DRAFT).
- Employee submits a DRAFT certification for validation → status becomes SUBMITTED.
- Manager or Admin can approve (→ VALIDATED) or reject (→ REJECTED) a SUBMITTED certification.
- `isExpired` is a **computed flag** derived from `expiration_date < today` — it is **not stored in DB**.
- Certificate documents (PDFs, file uploads) are **out of scope for MVP** — a `certificate_document` table
  can be added in a future phase to store document references.

## Workflow

```
Employee adds claim → DRAFT
       ↓ submit
    SUBMITTED
     ↙      ↘
VALIDATED   REJECTED
```

> Manager/Admin can bypass the workflow and directly add a certification as VALIDATED.

## DB Tables

### `certification`
> Global catalog of available certifications. Managed by ADMIN.

| Column      | Type      | Notes                             |
|-------------|-----------|-----------------------------------|
| id          | UUID PK   |                                   |
| name        | VARCHAR   | unique, not null                  |
| description | VARCHAR   |                                   |
| provider    | VARCHAR   | e.g. Oracle, AWS, Confluent       |
| active      | BOOLEAN   | default true (soft delete)        |
| created_at  | TIMESTAMP |                                   |

### `certification_skill`
> Links a catalog certification to one or more skills. Physical delete on join.

| Column           | Type    | Notes                        |
|------------------|---------|------------------------------|
| certification_id | UUID FK | → certification              |
| skill_id         | UUID FK | → skill                      |
| PK               |         | (certification_id, skill_id) |

### `employee_certification`
> An employee's claimed certification with lifecycle status and expiry tracking.

| Column            | Type      | Notes                                          |
|-------------------|-----------|------------------------------------------------|
| id                | UUID PK   |                                                |
| employee_id       | UUID FK   | → employee                                     |
| certification_id  | UUID FK   | → certification                                |
| issue_date        | DATE      | not null; cannot be in the future              |
| expiration_date   | DATE      | nullable; must be after issue_date if provided |
| validation_status | VARCHAR   | DRAFT / SUBMITTED / VALIDATED / REJECTED       |
| approved_by       | UUID FK   | → user, nullable (set on validation)           |
| approved_at       | TIMESTAMP | nullable (set on validation)                   |
| notes             | TEXT      | nullable                                       |
| created_at        | TIMESTAMP |                                                |
| updated_at        | TIMESTAMP |                                                |

> **Computed:** `isExpired = (expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE)`
> Computed in service layer, **not stored in DB**.

> **Future table (out of MVP scope):** `certificate_document` — stores file reference
> (PDF path/URL, file name) linked to `employee_certification`.

## Enums

```
CertificationStatus: DRAFT | SUBMITTED | VALIDATED | REJECTED
```

## API Endpoints

### Certification Catalog (ADMIN manages; all roles read)
```http
GET    /api/certifications
GET    /api/certifications/{id}
POST   /api/certifications               ← ADMIN only
PUT    /api/certifications/{id}          ← ADMIN only
DELETE /api/certifications/{id}          ← ADMIN only (soft delete: active = false)
```

### Employee Self-Service (own certifications)
```http
GET    /api/me/certifications
POST   /api/me/certifications            ← creates as DRAFT
PUT    /api/me/certifications/{id}       ← DRAFT only
DELETE /api/me/certifications/{id}       ← DRAFT only
POST   /api/me/certifications/{id}/submit ← DRAFT → SUBMITTED
```

### Admin / Manager access by employee
```http
POST   /api/certifications/requests/{id}/approve    ← SUBMITTED → VALIDATED (ADMIN/Manager)
POST   /api/certifications/requests/{id}/reject     ← SUBMITTED → REJECTED  (ADMIN/Manager)
```

## Validation Rules

- `certificationId` — required; must reference an active certification in the catalog
- `issueDate` — required; cannot be in the future
- `expirationDate` — optional; if provided, must be after `issueDate`
- Employee can only edit or delete DRAFT certifications
- Only Manager (direct reports) or Admin can approve/reject

## Backend Implementation Notes

- `CertificationService`:
  - Catalog CRUD — ADMIN only for write operations; audit CREATE, UPDATE, DELETE
  - `getMyCertifications(currentUser)` — returns own certifications
  - `addMyCertification(dto, currentUser)` — creates with status DRAFT; audit CREATE
  - `updateMyCertification(id, dto, currentUser)` — DRAFT only; ownership check; audit UPDATE
  - `deleteMyCertification(id, currentUser)` — DRAFT only; ownership check; audit DELETE
  - `submitMyCertification(id, currentUser)` — DRAFT → SUBMITTED; audit SUBMIT
  - `addCertificationForEmployee(employeeId, dto, currentUser)` — ADMIN/Manager; creates as VALIDATED; audit CREATE
  - `approveCertification(id, currentUser)` — SUBMITTED → VALIDATED; sets `approved_by`, `approved_at`; audit APPROVE
  - `rejectCertification(id, currentUser)` — SUBMITTED → REJECTED; audit REJECT
  - `getEmployeeCertifications(employeeId, currentUser)` — role-scoped
  - Compute `isExpired` flag in mapper before returning response DTO
  - Call `AuditService.log(...)` **synchronously** inside each service method

## Frontend Pages

### `/certifications` — Certifications Page
- Visible to: all roles
- **Catalog tab** (ADMIN): list all certifications, add/edit/deactivate
- **My Certifications tab** (all authenticated users): list own certifications, add new, submit for validation
- Table columns: Certification name, Provider, Issue date, Expiration date, Status, Expired badge
- Add certification form: select from catalog, enter issue/expiration date, notes
- ADMIN and LINE_MANAGER can also view team member certifications via `/employees/:id`

package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.dto.request.ApproveItemRequestDto;
import it.eng.wsm.skillmatrix.dto.request.RejectItemRequestDto;
import it.eng.wsm.skillmatrix.dto.request.SubmitValidationRequestDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationRequestResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationSkillReviewResponseDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.EmployeeSkillHistory;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.entity.ValidationRequest;
import it.eng.wsm.skillmatrix.entity.ValidationRequestItem;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.enums.ValidationRequestType;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.EmployeeSkillMapper;
import it.eng.wsm.skillmatrix.mapper.ValidationRequestMapper;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillHistoryRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillRepository;
import it.eng.wsm.skillmatrix.repository.ValidationRequestItemRepository;
import it.eng.wsm.skillmatrix.repository.ValidationRequestRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.time.LocalDate;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationEvent;
import it.eng.wsm.skillmatrix.workforce.service.NotificationService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ValidationRequestService {

    private static final String ENTITY_NAME = "ValidationRequest";

    private final ValidationRequestRepository validationRequestRepository;
    private final ValidationRequestItemRepository validationRequestItemRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final EmployeeSkillHistoryRepository employeeSkillHistoryRepository;
    private final EmployeeRepository employeeRepository;
    private final ValidationRequestMapper validationRequestMapper;
    private final EmployeeSkillMapper employeeSkillMapper;
    private final EmployeeSkillService employeeSkillService;
    private final CertificateService certificateService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    // ── Submit (called from MeController) ───────────────────────────────────

    @Transactional
    public ValidationRequestResponseDto submitForValidation(SubmitValidationRequestDto dto) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        List<UUID> skillIds = dto.getEmployeeSkillIds();
        List<EmployeeSkill> skills = new ArrayList<>();

        for (UUID id : skillIds) {
            EmployeeSkill es = employeeSkillService.findEmployeeSkillForUpdateOrThrow(id);
            if (!es.getEmployee().getId().equals(employee.getId())) {
                throw new AccessDeniedException("You can only submit your own skills: " + id);
            }
            if (es.getValidationStatus() != ValidationStatus.DRAFT
                    && es.getValidationStatus() != ValidationStatus.REOPENED_FOR_EDIT) {
                throw new IllegalStateException(
                        "Skill " + id + " is not in DRAFT or REOPENED_FOR_EDIT status — cannot submit");
            }
            employeeSkillService.assertNotLocked(es);
            skills.add(es);
        }

        Instant now = Instant.now();

        ValidationRequest validationRequest = ValidationRequest.builder()
                .employee(employee)
                .submittedBy(currentUser)
                .status(ValidationRequestStatus.SUBMITTED)
                .submittedAt(now)
                .build();

        ValidationRequest savedRequest = validationRequestRepository.save(validationRequest);

        for (EmployeeSkill es : skills) {
            // Immutable pre-submission revision: the authoritative restore source if the request is revoked
            EmployeeSkillHistory preSubmission = employeeSkillService.ensureRevisionMatchesLiveState(es, currentUser);
            EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(es);

            ValidationRequestItem item = ValidationRequestItem.builder()
                    .validationRequest(savedRequest)
                    .employeeSkillId(es.getId())
                    .skillName(es.getSkill().getName())
                    .categoryName(es.getSkill().getCategory().getName())
                    .selfAssessedLevel(es.getSelfAssessedLevel())
                    .employeeComment(es.getEmployeeComment())
                    .status(ValidationRequestStatus.SUBMITTED)
                    .preSubmissionRevision(preSubmission)
                    .build();
            validationRequestItemRepository.save(item);

            es.setValidationStatus(ValidationStatus.SUBMITTED);
            es.setLastUpdatedDate(now);
            employeeSkillRepository.save(es);

            employeeSkillService.snapshotHistory(es, currentUser);
            auditService.log("EmployeeSkill", es.getId(), AuditAction.SUBMIT, currentUser, oldDto,
                    employeeSkillMapper.toResponseDto(es), "Submitted in request: " + savedRequest.getId());
        }

        auditService.log(ENTITY_NAME, savedRequest.getId(), AuditAction.SUBMIT, currentUser, null,
                savedRequest.getId().toString(), null);

        notifyManagerOfSubmission(savedRequest, employee,
                skills.stream().map(es -> es.getSkill().getName()).toList());

        // reload with items
        ValidationRequest reloaded = findValidationRequestOrThrow(savedRequest.getId());
        return validationRequestMapper.toResponseDto(reloaded);
    }

    // ── Request deletion (employee) ─────────────────────────────────────────

    /**
     * Creates a single-item DELETION request for the employee's own skill. The skill itself is not changed;
     * it stays locked (no edit/submit/restore/duplicate request) until the manager decides the item.
     */
    @Transactional
    public ValidationRequestResponseDto requestDeletion(UUID employeeSkillId, String reason) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        EmployeeSkill es = employeeSkillService.findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        if (!es.getEmployee().getId().equals(employee.getId())) {
            throw new AccessDeniedException("You can only request deletion of your own skills");
        }
        if (employee.getManager() == null) {
            throw new IllegalStateException("No manager is assigned to you, so the deletion cannot be routed");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A reason is required for a deletion request");
        }
        if (es.getValidationStatus() == ValidationStatus.DRAFT) {
            throw new IllegalStateException("DRAFT skills are deleted directly; no deletion request is needed");
        }
        employeeSkillService.assertNotLocked(es);

        Instant now = Instant.now();
        ValidationRequest savedRequest = validationRequestRepository.save(ValidationRequest.builder()
                .employee(employee)
                .submittedBy(currentUser)
                .requestType(ValidationRequestType.DELETION)
                .reason(reason)
                .status(ValidationRequestStatus.SUBMITTED)
                .submittedAt(now)
                .build());

        ValidationRequestItem item = validationRequestItemRepository.save(ValidationRequestItem.builder()
                .validationRequest(savedRequest)
                .employeeSkillId(es.getId())
                .skillName(es.getSkill().getName())
                .categoryName(es.getSkill().getCategory().getName())
                .selfAssessedLevel(es.getSelfAssessedLevel())
                .employeeComment(es.getEmployeeComment())
                .status(ValidationRequestStatus.SUBMITTED)
                .build());
        savedRequest.getItems().add(item);

        auditService.log("EmployeeSkill", es.getId(), AuditAction.SUBMIT, currentUser, null, null,
                "Deletion requested in request: " + savedRequest.getId());
        auditService.log(ENTITY_NAME, savedRequest.getId(), AuditAction.SUBMIT, currentUser, null,
                savedRequest.getId().toString(), "Skill deletion request");

        notifyManagerOfSubmission(savedRequest, employee, List.of(es.getSkill().getName()));

        return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(savedRequest.getId()));
    }

    // ── Query ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ValidationRequestResponseDto> getValidationRequests(
            String employeeSearch,
            UUID managerId,
            ValidationRequestStatus status,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {

        User currentUser = employeeSkillService.resolveCurrentUser();
        UserRole role = currentUser.getRole();

        UUID effectiveManagerId = managerId;

        if (role == UserRole.LINE_MANAGER) {
            Employee managerEmployee = findEmployeeForUser(currentUser);
            effectiveManagerId = managerEmployee.getId();
        } else if (role == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees cannot list all validation requests");
        }

        final UUID finalManagerId = effectiveManagerId;

        Specification<ValidationRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (employeeSearch != null && !employeeSearch.isBlank()) {
                String pattern = "%" + employeeSearch.trim().toLowerCase(java.util.Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("employee").get("firstName")), pattern),
                        cb.like(cb.lower(root.get("employee").get("lastName")), pattern),
                        cb.like(cb.lower(root.get("employee").get("email")), pattern)));
            }

            if (finalManagerId != null) {
                // Filter by employee's manager
                predicates.add(cb.equal(root.get("employee").get("manager").get("id"), finalManagerId));
            }

            // A revoked request must look like it was never submitted to reviewers
            predicates.add(cb.notEqual(root.get("status"), ValidationRequestStatus.CANCELLED));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("submittedAt"),
                        dateFrom.atStartOfDay().toInstant(java.time.ZoneOffset.UTC)));
            }

            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("submittedAt"),
                        dateTo.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC)));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        return validationRequestRepository.findAll(spec, pageable)
                .map(validationRequestMapper::toResponseDto);
    }

    /**
     * One row per employee skill: its latest non-revoked validation request item, plus the number of revisions
     * recorded for the skill. Scoped like {@link #getValidationRequests}: managers only see their direct reports.
     */
    @Transactional(readOnly = true)
    public Page<ValidationSkillReviewResponseDto> getLatestSkillReviews(
            String search,
            UUID managerId,
            String category,
            ValidationRequestStatus status,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {

        User currentUser = employeeSkillService.resolveCurrentUser();
        UserRole role = currentUser.getRole();
        UUID effectiveManagerId = managerId;
        if (role == UserRole.LINE_MANAGER) {
            effectiveManagerId = findEmployeeForUser(currentUser).getId();
        } else if (role == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees cannot list all validation requests");
        }
        final UUID finalManagerId = effectiveManagerId;

        Specification<ValidationRequestItem> spec = (root, query, cb) -> {
            Join<ValidationRequestItem, ValidationRequest> request = root.join("validationRequest");
            Join<ValidationRequest, Employee> employee = request.join("employee");
            List<Predicate> predicates = new ArrayList<>();

            // A revoked request must look like it was never submitted to reviewers
            predicates.add(cb.notEqual(request.get("status"), ValidationRequestStatus.CANCELLED));

            Subquery<UUID> newer = query.subquery(UUID.class);
            var newerItem = newer.from(ValidationRequestItem.class);
            Join<ValidationRequestItem, ValidationRequest> newerRequest = newerItem.join("validationRequest");
            newer.select(newerItem.get("id")).where(
                    cb.equal(newerItem.get("employeeSkillId"), root.get("employeeSkillId")),
                    cb.equal(newerRequest.get("employee"), employee),
                    cb.notEqual(newerRequest.get("status"), ValidationRequestStatus.CANCELLED),
                    cb.greaterThan(newerRequest.<Instant>get("submittedAt"), request.<Instant>get("submittedAt")));
            predicates.add(cb.not(cb.exists(newer)));

            if (finalManagerId != null) {
                predicates.add(cb.equal(employee.get("manager").get("id"), finalManagerId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%";
                var firstName = cb.lower(employee.<String>get("firstName"));
                var lastName = cb.lower(employee.<String>get("lastName"));
                predicates.add(cb.or(
                        cb.like(firstName, pattern),
                        cb.like(lastName, pattern),
                        cb.like(cb.concat(cb.concat(firstName, " "), lastName), pattern),
                        cb.like(cb.lower(root.<String>get("skillName")), pattern)));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.<String>get("categoryName")),
                        category.trim().toLowerCase(java.util.Locale.ROOT)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(request.<Instant>get("submittedAt"),
                        dateFrom.atStartOfDay().toInstant(java.time.ZoneOffset.UTC)));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(request.<Instant>get("submittedAt"),
                        dateTo.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("validationRequest.submittedAt"), Sort.Order.asc("skillName"),
                        Sort.Order.asc("id")));
        Page<ValidationRequestItem> items = validationRequestItemRepository.findAll(spec, sorted);

        List<UUID> skillIds = items.stream().map(ValidationRequestItem::getEmployeeSkillId).distinct().toList();
        Map<UUID, Instant> lastValidated = new HashMap<>();
        Map<UUID, Long> historyCounts = new HashMap<>();
        Map<UUID, Long> certificateCounts = certificateService.countByEmployeeSkillIds(skillIds);
        if (!skillIds.isEmpty()) {
            employeeSkillRepository.findAllById(skillIds).forEach(skill -> {
                if (skill.getLastValidatedDate() != null) {
                    lastValidated.put(skill.getId(), skill.getLastValidatedDate());
                }
            });
            employeeSkillHistoryRepository.countByEmployeeSkillIds(skillIds)
                    .forEach(row -> historyCounts.put((UUID) row[0], (Long) row[1]));
        }

        return items.map(item -> {
            ValidationRequest request = item.getValidationRequest();
            Employee employee = request.getEmployee();
            return new ValidationSkillReviewResponseDto(
                    item.getId(),
                    request.getId(),
                    employee.getId(),
                    employee.getFirstName() + " " + employee.getLastName(),
                    item.getEmployeeSkillId(),
                    item.getSkillName(),
                    item.getCategoryName(),
                    request.getRequestType(),
                    item.getStatus(),
                    item.getSelfAssessedLevel(),
                    lastValidated.get(item.getEmployeeSkillId()),
                    request.getSubmittedAt(),
                    historyCounts.getOrDefault(item.getEmployeeSkillId(), 0L),
                    certificateCounts.getOrDefault(item.getEmployeeSkillId(), 0L));
        });
    }

    @Transactional(readOnly = true)
    public ValidationRequestResponseDto getValidationRequestById(UUID requestId) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        ValidationRequest request = findValidationRequestOrThrow(requestId);
        assertCanViewRequest(currentUser, request);
        return validationRequestMapper.toResponseDto(request);
    }

    @Transactional(readOnly = true)
    public Page<ValidationRequestResponseDto> getMyValidationRequests(ValidationRequestStatus status,
                                                                      Pageable pageable) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        Specification<ValidationRequest> spec = (root, query, cb) -> {
            Predicate own = cb.equal(root.get("submittedBy").get("id"), currentUser.getId());
            return status == null ? own : cb.and(own, cb.equal(root.get("status"), status));
        };
        return validationRequestRepository.findAll(spec, pageable)
                .map(validationRequestMapper::toResponseDto);
    }

    // ── Revoke (requester only, before any manager decision) ────────────────

    /**
     * Cancels a fully undecided SUBMITTED request and restores every affected skill to the revision captured
     * immediately before submission (a deletion request never changed its skill, so it is only cancelled). Everything runs in one transaction: any failure rolls back completely.
     */
    @Transactional
    public ValidationRequestResponseDto revokeRequest(UUID requestId) {
        User currentUser = employeeSkillService.resolveCurrentUser();

        ValidationRequest request = findValidationRequestForUpdateOrThrow(requestId);
        if (request.getSubmittedBy() == null || !request.getSubmittedBy().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the requester can revoke a validation request");
        }
        assertRequestIsSubmitted(request);

        List<ValidationRequestItem> items = validationRequestItemRepository.findByValidationRequestId(requestId);
        if (items.isEmpty() || items.stream().anyMatch(i -> i.getStatus() != ValidationRequestStatus.SUBMITTED)) {
            throw new IllegalStateException("A validation request can only be revoked before any item is decided");
        }

        Instant now = Instant.now();
        boolean deletion = request.getRequestType() == ValidationRequestType.DELETION;
        for (ValidationRequestItem item : items) {
            if (deletion) {
                // The skill was never changed by a deletion request: only the request is cancelled
                item.setStatus(ValidationRequestStatus.CANCELLED);
                item.setReviewedAt(now);
                validationRequestItemRepository.save(item);
                continue;
            }
            EmployeeSkill skill = employeeSkillService.findEmployeeSkillForUpdateOrThrow(item.getEmployeeSkillId());
            EmployeeSkillHistory preSubmission = item.getPreSubmissionRevision();
            if (skill.getValidationStatus() != ValidationStatus.SUBMITTED
                    || preSubmission == null
                    || !preSubmission.getEmployeeSkillId().equals(skill.getId())) {
                throw new IllegalStateException(
                        "Request cannot be revoked: skill " + skill.getId() + " has no restorable pre-submission state");
            }

            EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(skill);
            employeeSkillService.applyRevision(skill, preSubmission);
            employeeSkillRepository.save(skill);
            employeeSkillService.snapshotHistory(skill, currentUser);
            auditService.log("EmployeeSkill", skill.getId(), AuditAction.UPDATE, currentUser, oldDto,
                    employeeSkillMapper.toResponseDto(skill),
                    "Restored pre-submission revision v" + preSubmission.getVersion()
                            + " on revoke of request: " + requestId);

            item.setStatus(ValidationRequestStatus.CANCELLED);
            item.setReviewedAt(now);
            validationRequestItemRepository.save(item);
        }

        request.setStatus(ValidationRequestStatus.CANCELLED);
        validationRequestRepository.save(request);
        auditService.log(ENTITY_NAME, requestId, AuditAction.UPDATE, currentUser,
                ValidationRequestStatus.SUBMITTED.name(), ValidationRequestStatus.CANCELLED.name(),
                "Revoked by requester");
        notificationService.removeRequestNotifications(requestId);

        return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(requestId));
    }

    // ── Item-level actions ───────────────────────────────────────────────────

    @Transactional
    public ValidationRequestResponseDto approveItem(UUID requestId, UUID itemId, ApproveItemRequestDto dto) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        assertIsManager(currentUser);

        ValidationRequest request = findValidationRequestForUpdateOrThrow(requestId);
        assertRequestIsSubmitted(request);
        ValidationRequestItem item = findItemOrThrow(requestId, itemId);

        // ADMIN bypasses direct-report check; LINE_MANAGER must own the employee
        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            Employee managerEmployee = findEmployeeForUser(currentUser);
            assertManagerOwnsEmployee(request.getEmployee(), managerEmployee);
        }

        assertItemIsSubmitted(item);
        String managerComment = dto == null ? null : dto.getManagerComment();
        Instant now = Instant.now();

        if (request.getRequestType() == ValidationRequestType.DELETION) {
            return approveDeletion(request, item, currentUser, managerComment, now);
        }

        if (dto == null || dto.getManagerValidatedLevel() == null) {
            throw new IllegalArgumentException("managerValidatedLevel is required for approval");
        }
        int validatedLevel = dto.getManagerValidatedLevel();

        // Update item
        item.setManagerValidatedLevel(validatedLevel);
        item.setManagerComment(dto.getManagerComment());
        item.setStatus(ValidationRequestStatus.APPROVED);
        item.setReviewedAt(now);
        validationRequestItemRepository.save(item);

        // Update employee skill
        EmployeeSkill employeeSkill = employeeSkillService.findEmployeeSkillForUpdateOrThrow(item.getEmployeeSkillId());
        employeeSkill.setManagerValidatedLevel(validatedLevel);
        employeeSkill.setManagerComment(dto.getManagerComment());
        employeeSkill.setValidationStatus(ValidationStatus.VALIDATED);
        employeeSkill.setLastValidatedDate(now);
        employeeSkill.setLastUpdatedDate(now);
        employeeSkillRepository.save(employeeSkill);

        employeeSkillService.snapshotHistory(employeeSkill, currentUser);

        auditService.log("EmployeeSkill", employeeSkill.getId(), AuditAction.APPROVE, currentUser,
                null, null, "Approved in request: " + requestId);
        auditService.log(ENTITY_NAME, requestId, AuditAction.APPROVE, currentUser,
                null, null, "Item " + itemId + " approved");

        notifyEmployeeOfDecision(request, item, true);

        // Auto-rollup request status
        rollupRequestStatus(request, currentUser, now);

        return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(requestId));
    }

    @Transactional
    public ValidationRequestResponseDto rejectItem(UUID requestId, UUID itemId, RejectItemRequestDto dto) {
        User currentUser = employeeSkillService.resolveCurrentUser();
        assertIsManager(currentUser);

        ValidationRequest request = findValidationRequestForUpdateOrThrow(requestId);
        assertRequestIsSubmitted(request);
        ValidationRequestItem item = findItemOrThrow(requestId, itemId);

        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            Employee managerEmployee = findEmployeeForUser(currentUser);
            assertManagerOwnsEmployee(request.getEmployee(), managerEmployee);
        }

        assertItemIsSubmitted(item);
        Instant now = Instant.now();

        item.setManagerComment(dto.getManagerComment());
        item.setStatus(ValidationRequestStatus.REJECTED);
        item.setReviewedAt(now);
        validationRequestItemRepository.save(item);

        if (request.getRequestType() == ValidationRequestType.DELETION) {
            // Rejected deletion: the skill stays exactly as it was
            auditService.log("EmployeeSkill", item.getEmployeeSkillId(), AuditAction.REJECT, currentUser,
                    null, null, "Deletion rejected in request: " + requestId);
            auditService.log(ENTITY_NAME, requestId, AuditAction.REJECT, currentUser,
                    null, null, "Item " + itemId + " rejected");
            notifyEmployeeOfDecision(request, item, false);
            rollupRequestStatus(request, currentUser, now);
            return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(requestId));
        }

        EmployeeSkill employeeSkill = employeeSkillService.findEmployeeSkillForUpdateOrThrow(item.getEmployeeSkillId());
        employeeSkill.setManagerComment(dto.getManagerComment());
        employeeSkill.setValidationStatus(ValidationStatus.REJECTED);
        employeeSkill.setLastUpdatedDate(now);
        employeeSkillRepository.save(employeeSkill);

        employeeSkillService.snapshotHistory(employeeSkill, currentUser);

        auditService.log("EmployeeSkill", employeeSkill.getId(), AuditAction.REJECT, currentUser,
                null, null, "Rejected in request: " + requestId);
        auditService.log(ENTITY_NAME, requestId, AuditAction.REJECT, currentUser,
                null, null, "Item " + itemId + " rejected");

        notifyEmployeeOfDecision(request, item, false);
        rollupRequestStatus(request, currentUser, now);

        return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(requestId));
    }

    /** Approval of a deletion item: decision and physical delete share the caller's transaction. */
    private ValidationRequestResponseDto approveDeletion(ValidationRequest request, ValidationRequestItem item,
                                                         User approver, String managerComment, Instant now) {
        EmployeeSkill skill = employeeSkillService.findEmployeeSkillForUpdateOrThrow(item.getEmployeeSkillId());
        if (!skill.getEmployee().getId().equals(request.getEmployee().getId())) {
            throw new IllegalStateException("Skill does not belong to the employee of this request");
        }

        item.setManagerComment(managerComment);
        item.setStatus(ValidationRequestStatus.APPROVED);
        item.setReviewedAt(now);
        validationRequestItemRepository.save(item);

        employeeSkillService.deleteApproved(skill, approver, request.getId());
        auditService.log(ENTITY_NAME, request.getId(), AuditAction.APPROVE, approver,
                null, null, "Item " + item.getId() + " approved (skill deleted)");

        notifyEmployeeOfDecision(request, item, true);
        rollupRequestStatus(request, approver, now);
        return validationRequestMapper.toResponseDto(findValidationRequestOrThrow(request.getId()));
    }

    // ── In-app notifications (same transaction as the triggering action) ─────

    /** Notifies the employee's responsible manager; nothing is sent when there is no manager user who can act. */
    private void notifyManagerOfSubmission(ValidationRequest request, Employee employee, List<String> skillNames) {
        Employee manager = employee.getManager();
        User recipient = manager == null ? null : manager.getUser();
        if (recipient == null
                || (recipient.getRole() != UserRole.LINE_MANAGER && recipient.getRole() != UserRole.ADMIN)) {
            return;
        }
        String employeeName = employee.getFirstName() + " " + employee.getLastName();
        boolean deletion = request.getRequestType() == ValidationRequestType.DELETION;
        String title = (deletion ? "Skill deletion request from " : "Validation request from ") + employeeName;
        String body = deletion
                ? employeeName + " requested deletion of " + skillNames.get(0) + ". Reason: " + request.getReason()
                : employeeName + " submitted " + skillNames.size() + " skill(s) for validation: "
                        + String.join(", ", skillNames);
        notificationService.notifyRequestEvent(recipient, NotificationEvent.REQUEST_SUBMITTED, request.getId(),
                request.getId(), title, body);
    }

    private void notifyEmployeeOfDecision(ValidationRequest request, ValidationRequestItem item, boolean approved) {
        User recipient = request.getEmployee().getUser();
        boolean deletion = request.getRequestType() == ValidationRequestType.DELETION;
        String subject = deletion ? "Deletion request" : "Validation";
        String outcome = approved ? "approved" : "rejected";
        String body = subject + " of \"" + item.getSkillName() + "\" was " + outcome + " by your manager."
                + (item.getManagerComment() == null || item.getManagerComment().isBlank()
                        ? "" : " Manager note: " + item.getManagerComment());
        notificationService.notifyRequestEvent(recipient,
                approved ? NotificationEvent.ITEM_APPROVED : NotificationEvent.ITEM_REJECTED,
                item.getId(), request.getId(), subject + " " + outcome + ": " + item.getSkillName(), body);
    }

    // ── Auto-rollup ──────────────────────────────────────────────────────────

    /**
     * After each item action, check if all items are resolved and update the request status.
     * Priority: REJECTED > APPROVED (all resolved only)
     */
    private void rollupRequestStatus(ValidationRequest request, User reviewer, Instant now) {
        List<ValidationRequestItem> items = validationRequestItemRepository
                .findByValidationRequestId(request.getId());

        boolean anyStillSubmitted = items.stream()
                .anyMatch(i -> i.getStatus() == ValidationRequestStatus.SUBMITTED);

        if (anyStillSubmitted) {
            // Not all items resolved yet; keep request SUBMITTED
            return;
        }

        boolean anyRejected = items.stream()
                .anyMatch(i -> i.getStatus() == ValidationRequestStatus.REJECTED);
        boolean allApproved = items.stream()
                .allMatch(i -> i.getStatus() == ValidationRequestStatus.APPROVED);

        ValidationRequestStatus newStatus;
        if (anyRejected) {
            newStatus = ValidationRequestStatus.REJECTED;
        } else if (allApproved) {
            newStatus = ValidationRequestStatus.APPROVED;
        } else {
            return;
        }

        request.setStatus(newStatus);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(now);
        validationRequestRepository.save(request);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private ValidationRequest findValidationRequestOrThrow(UUID id) {
        return validationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ValidationRequest not found with id: " + id));
    }

    private ValidationRequest findValidationRequestForUpdateOrThrow(UUID id) {
        return validationRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("ValidationRequest not found with id: " + id));
    }

    private ValidationRequestItem findItemOrThrow(UUID requestId, UUID itemId) {
        ValidationRequestItem item = validationRequestItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ValidationRequestItem not found with id: " + itemId));
        if (!item.getValidationRequest().getId().equals(requestId)) {
            throw new ResourceNotFoundException("Item " + itemId + " does not belong to request " + requestId);
        }
        return item;
    }

    private void assertItemIsSubmitted(ValidationRequestItem item) {
        if (item.getStatus() != ValidationRequestStatus.SUBMITTED) {
            throw new IllegalStateException("Item has already been decided — current status: " + item.getStatus());
        }
    }

    private void assertRequestIsSubmitted(ValidationRequest request) {
        if (request.getStatus() != ValidationRequestStatus.SUBMITTED) {
            throw new IllegalStateException(
                    "ValidationRequest is not in SUBMITTED status — current status: " + request.getStatus());
        }
    }

    private void assertIsManager(User user) {
        if (user.getRole() != UserRole.LINE_MANAGER && user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only LINE_MANAGER or ADMIN can perform validation actions");
        }
    }

    private void assertManagerOwnsEmployee(Employee employee, Employee managerEmployee) {
        if (employee.getManager() == null
                || !employee.getManager().getId().equals(managerEmployee.getId())) {
            throw new AccessDeniedException(
                    "You are not the direct manager of employee: " + employee.getId());
        }
    }

    private void assertCanViewRequest(User user, ValidationRequest request) {
        UserRole role = user.getRole();
        if (role == UserRole.ADMIN || role == UserRole.HR) {
            return;
        }
        if (role == UserRole.LINE_MANAGER) {
            Employee managerEmployee = findEmployeeForUser(user);
            Employee requestEmployee = request.getEmployee();
            if (request.getStatus() == ValidationRequestStatus.CANCELLED
                    || requestEmployee.getManager() == null
                    || !requestEmployee.getManager().getId().equals(managerEmployee.getId())) {
                throw new AccessDeniedException("You can only view requests for your direct reports");
            }
            return;
        }
        // EMPLOYEE: can view their own requests
        Employee employee = findEmployeeForUser(user);
        if (!request.getEmployee().getId().equals(employee.getId())) {
            throw new AccessDeniedException("You can only view your own validation requests");
        }
    }


    private Employee findEmployeeForUser(User user) {
        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record found for user: " + user.getUsername()));
    }
}





package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.dto.request.EmployeeSkillRequestDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillRevisionResponseDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.EmployeeSkillHistory;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.EmployeeSkillMapper;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillHistoryRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillRepository;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.repository.ValidationRequestItemRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeSkillService {

    private static final String ENTITY_NAME = "EmployeeSkill";

    private final EmployeeSkillRepository employeeSkillRepository;
    private final EmployeeSkillHistoryRepository employeeSkillHistoryRepository;
    private final ValidationRequestItemRepository validationRequestItemRepository;
    private final EmployeeRepository employeeRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final EmployeeSkillMapper employeeSkillMapper;
    private final AuditService auditService;

    // ── Employee self-service ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeSkillResponseDto> getMySkills() {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);
        return employeeSkillRepository.findByEmployeeId(employee.getId())
                .stream()
                .map(employeeSkillMapper::toResponseDto)
                .toList();
    }

    public EmployeeSkillResponseDto addSkill(EmployeeSkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        Skill skill = findSkillOrThrow(dto.getSkillId());

        if (employeeSkillRepository.existsByEmployeeIdAndSkillId(employee.getId(), skill.getId())) {
            throw new DuplicateResourceException("Skill already exists in your profile");
        }

        validateLevel(dto.getSelfAssessedLevel());

        EmployeeSkill employeeSkill = EmployeeSkill.builder()
                .employee(employee)
                .skill(skill)
                .selfAssessedLevel(dto.getSelfAssessedLevel())
                .yearsOfExperience(dto.getYearsOfExperience())
                .lastUsedDate(dto.getLastUsedDate())
                .employeeComment(dto.getEmployeeComment())
                .validationStatus(ValidationStatus.DRAFT)
                .lastUpdatedDate(Instant.now())
                .build();

        EmployeeSkill saved = employeeSkillRepository.save(employeeSkill);

        snapshotHistory(saved, currentUser);

        EmployeeSkillResponseDto responseDto = employeeSkillMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, responseDto, null);

        return responseDto;
    }

    public EmployeeSkillResponseDto updateSkill(UUID employeeSkillId, EmployeeSkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        assertOwnership(employeeSkill, employee);
        assertNotLocked(employeeSkill);

        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);

        validateLevel(dto.getSelfAssessedLevel());
        if (Objects.equals(employeeSkill.getSelfAssessedLevel(), dto.getSelfAssessedLevel())
                && sameDecimal(employeeSkill.getYearsOfExperience(), dto.getYearsOfExperience())
                && Objects.equals(employeeSkill.getLastUsedDate(), dto.getLastUsedDate())
                && Objects.equals(employeeSkill.getEmployeeComment(), dto.getEmployeeComment())) {
            return oldDto;
        }
        // A real edit of a VALIDATED skill reopens it; the validated revision (guaranteed to exist) stays restorable
        boolean reopen = employeeSkill.getValidationStatus() == ValidationStatus.VALIDATED;
        if (reopen) {
            ensureRevisionMatchesLiveState(employeeSkill, currentUser);
            employeeSkill.setValidationStatus(ValidationStatus.REOPENED_FOR_EDIT);
        }
        // Only the four employee-editable fields change; manager-validated data stays as it is
        employeeSkill.setSelfAssessedLevel(dto.getSelfAssessedLevel());
        employeeSkill.setYearsOfExperience(dto.getYearsOfExperience());
        employeeSkill.setLastUsedDate(dto.getLastUsedDate());
        employeeSkill.setEmployeeComment(dto.getEmployeeComment());
        employeeSkill.setLastUpdatedDate(Instant.now());

        EmployeeSkill saved = employeeSkillRepository.save(employeeSkill);

        snapshotHistory(saved, currentUser);

        EmployeeSkillResponseDto newDto = employeeSkillMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto,
                reopen ? "Reopened for edit" : null);

        return newDto;
    }

    // ── Admin / Manager / HR access ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeSkillResponseDto> getEmployeeSkills(UUID employeeId) {
        User currentUser = resolveCurrentUser();
        UserRole role = currentUser.getRole();

        Employee targetEmployee = findEmployeeOrThrow(employeeId);

        if (role == UserRole.LINE_MANAGER) {
            Employee managerEmployee = findEmployeeForUser(currentUser);
            if (targetEmployee.getManager() == null
                    || !targetEmployee.getManager().getId().equals(managerEmployee.getId())) {
                throw new AccessDeniedException("Line managers can only view skills of their direct reports");
            }
        } else if (role == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees must use /api/me/skills to view their own skills");
        }

        return employeeSkillRepository.findByEmployeeId(employeeId)
                .stream()
                .map(employeeSkillMapper::toResponseDto)
                .toList();
    }

    public EmployeeSkillResponseDto addSkillForEmployee(UUID employeeId, EmployeeSkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        assertAdminOrHrOrManager(currentUser);

        Employee employee = findEmployeeOrThrow(employeeId);
        Skill skill = findSkillOrThrow(dto.getSkillId());

        if (employeeSkillRepository.existsByEmployeeIdAndSkillId(employee.getId(), skill.getId())) {
            throw new DuplicateResourceException("Skill already exists in the employee's profile");
        }

        validateLevel(dto.getSelfAssessedLevel());

        EmployeeSkill employeeSkill = EmployeeSkill.builder()
                .employee(employee)
                .skill(skill)
                .selfAssessedLevel(dto.getSelfAssessedLevel())
                .yearsOfExperience(dto.getYearsOfExperience())
                .lastUsedDate(dto.getLastUsedDate())
                .employeeComment(dto.getEmployeeComment())
                .validationStatus(ValidationStatus.DRAFT)
                .lastUpdatedDate(Instant.now())
                .build();

        EmployeeSkill saved = employeeSkillRepository.save(employeeSkill);
        snapshotHistory(saved, currentUser);

        EmployeeSkillResponseDto responseDto = employeeSkillMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, responseDto,
                "Created by " + currentUser.getRole());

        return responseDto;
    }

    public EmployeeSkillResponseDto updateSkillByAdmin(UUID employeeSkillId, EmployeeSkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        assertAdminOrHrOrManager(currentUser);

        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);

        validateLevel(dto.getSelfAssessedLevel());
        employeeSkill.setSelfAssessedLevel(dto.getSelfAssessedLevel());
        employeeSkill.setYearsOfExperience(dto.getYearsOfExperience());
        employeeSkill.setLastUsedDate(dto.getLastUsedDate());
        employeeSkill.setEmployeeComment(dto.getEmployeeComment());
        employeeSkill.setLastUpdatedDate(Instant.now());

        EmployeeSkill saved = employeeSkillRepository.save(employeeSkill);
        snapshotHistory(saved, currentUser);

        EmployeeSkillResponseDto newDto = employeeSkillMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto,
                "Updated by " + currentUser.getRole());

        return newDto;
    }

    public void deleteSkillByAdmin(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        assertAdminOrHrOrManager(currentUser);

        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        assertNotReferencedByRequests(employeeSkillId);
        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);

        snapshotHistory(employeeSkill, currentUser);
        auditService.log(ENTITY_NAME, employeeSkillId, AuditAction.DELETE, currentUser, oldDto, null,
                "Deleted by " + currentUser.getRole());
        employeeSkillRepository.delete(employeeSkill);
    }

    /**
     * Direct deletion by the owner, allowed only for a DRAFT skill (never validated) without an open request.
     * The final pre-delete revision and the DELETE audit entry are written before the live row is removed.
     */
    public void deleteMyDraftSkill(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        assertOwnership(employeeSkill, employee);
        if (employeeSkill.getValidationStatus() != ValidationStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only DRAFT skills can be deleted directly; request deletion from your manager instead");
        }
        assertNotLocked(employeeSkill);

        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);
        snapshotHistory(employeeSkill, currentUser);
        auditService.log(ENTITY_NAME, employeeSkillId, AuditAction.DELETE, currentUser, oldDto, null,
                "Deleted by owner (DRAFT)");
        employeeSkillRepository.delete(employeeSkill);
    }

    // ── Latest validated revision: lookup and restore ───────────────────────

    /** Same history for ADMIN/HR/LINE_MANAGER (direct reports only); oldest first. */
    @Transactional(readOnly = true)
    public List<EmployeeSkillRevisionResponseDto> getRevisionHistory(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        EmployeeSkill employeeSkill = findEmployeeSkillOrThrow(employeeSkillId);
        assertCanReadEmployeeSkill(currentUser, employeeSkill);
        return employeeSkillHistoryRepository.findByEmployeeSkillIdOrderByVersionAsc(employeeSkill.getId()).stream()
                .map(employeeSkillMapper::toRevisionDto)
                .toList();
    }

    /** Every revision of an own skill, oldest first (append-only history written on each change). */
    @Transactional(readOnly = true)
    public List<EmployeeSkillRevisionResponseDto> getMyRevisionHistory(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        EmployeeSkill employeeSkill = findEmployeeSkillOrThrow(employeeSkillId);
        assertOwnership(employeeSkill, findEmployeeForUser(currentUser));
        return employeeSkillHistoryRepository.findByEmployeeSkillIdOrderByVersionAsc(employeeSkill.getId()).stream()
                .map(employeeSkillMapper::toRevisionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeSkillRevisionResponseDto getMyLatestValidatedRevision(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        EmployeeSkill employeeSkill = findEmployeeSkillOrThrow(employeeSkillId);
        assertOwnership(employeeSkill, findEmployeeForUser(currentUser));
        return employeeSkillMapper.toRevisionDto(findLatestValidatedOrThrow(employeeSkill));
    }

    @Transactional(readOnly = true)
    public EmployeeSkillRevisionResponseDto getLatestValidatedRevision(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        EmployeeSkill employeeSkill = findEmployeeSkillOrThrow(employeeSkillId);
        assertCanReadEmployeeSkill(currentUser, employeeSkill);
        return employeeSkillMapper.toRevisionDto(findLatestValidatedOrThrow(employeeSkill));
    }

    public EmployeeSkillResponseDto restoreMyLatestValidated(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        assertOwnership(employeeSkill, findEmployeeForUser(currentUser));
        return restoreLatestValidated(employeeSkill, currentUser, null);
    }

    public EmployeeSkillResponseDto restoreLatestValidatedByAdmin(UUID employeeSkillId) {
        User currentUser = resolveCurrentUser();
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.LINE_MANAGER) {
            throw new AccessDeniedException("Insufficient permissions");
        }
        EmployeeSkill employeeSkill = findEmployeeSkillForUpdateOrThrow(employeeSkillId);
        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            assertDirectReport(employeeSkill.getEmployee(), findEmployeeForUser(currentUser));
        }
        return restoreLatestValidated(employeeSkill, currentUser, "Restored by " + currentUser.getRole());
    }

    private EmployeeSkillResponseDto restoreLatestValidated(EmployeeSkill employeeSkill, User currentUser,
                                                            String actorNote) {
        if (isLockedByValidationRequest(employeeSkill)) {
            throw new IllegalStateException(
                    "Skill is locked by a submitted validation request and cannot be restored");
        }
        EmployeeSkillHistory revision = findLatestValidatedOrThrow(employeeSkill);
        if (matchesState(employeeSkill, revision)) {
            return employeeSkillMapper.toResponseDto(employeeSkill);
        }

        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);
        applyRevision(employeeSkill, revision);
        EmployeeSkill saved = employeeSkillRepository.save(employeeSkill);
        snapshotHistory(saved, currentUser);

        EmployeeSkillResponseDto newDto = employeeSkillMapper.toResponseDto(saved);
        String comment = "Restored latest validated revision v" + revision.getVersion()
                + (actorNote == null ? "" : " (" + actorNote + ")");
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, comment);
        return newDto;
    }

    // ── Package-visible helpers used by ValidationRequestService / ImportService ──

    EmployeeSkill findEmployeeSkillOrThrow(UUID id) {
        return employeeSkillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeSkill not found with id: " + id));
    }

    EmployeeSkill findEmployeeSkillForUpdateOrThrow(UUID id) {
        return employeeSkillRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeSkill not found with id: " + id));
    }

    /**
     * Appends the next immutable revision of the skill. The skill row is locked first so concurrent writers
     * receive strictly sequential versions; the (employee_skill_id, version) unique constraint is the backstop.
     */
    EmployeeSkillHistory snapshotHistory(EmployeeSkill employeeSkill, User changedBy) {
        employeeSkillRepository.findByIdForUpdate(employeeSkill.getId());
        int nextVersion = employeeSkillHistoryRepository.findMaxVersion(employeeSkill.getId()) + 1;
        EmployeeSkillHistory history = EmployeeSkillHistory.builder()
                .employeeSkillId(employeeSkill.getId())
                .employeeId(employeeSkill.getEmployee().getId())
                .version(nextVersion)
                .selfAssessedLevel(employeeSkill.getSelfAssessedLevel())
                .managerValidatedLevel(employeeSkill.getManagerValidatedLevel())
                .validationStatus(employeeSkill.getValidationStatus())
                .yearsOfExperience(employeeSkill.getYearsOfExperience())
                .lastUsedDate(employeeSkill.getLastUsedDate())
                .employeeComment(employeeSkill.getEmployeeComment())
                .managerComment(employeeSkill.getManagerComment())
                .lastUpdatedDate(employeeSkill.getLastUpdatedDate())
                .lastValidatedDate(employeeSkill.getLastValidatedDate())
                .changedByUser(changedBy)
                .build();
        return employeeSkillHistoryRepository.save(history);
    }

    /**
     * Returns the latest revision if it already reflects the live state, otherwise appends a baseline revision.
     * Used right before a state transition so that a restorable pre-change revision always exists.
     */
    EmployeeSkillHistory ensureRevisionMatchesLiveState(EmployeeSkill employeeSkill, User changedBy) {
        employeeSkillRepository.findByIdForUpdate(employeeSkill.getId());
        return employeeSkillHistoryRepository.findFirstByEmployeeSkillIdOrderByVersionDesc(employeeSkill.getId())
                .filter(latest -> matchesState(employeeSkill, latest))
                .orElseGet(() -> snapshotHistory(employeeSkill, changedBy));
    }

    /** Copies every stateful field of the revision into the live row; identity (id, employee, skill) is untouched. */
    void applyRevision(EmployeeSkill employeeSkill, EmployeeSkillHistory revision) {
        employeeSkill.setSelfAssessedLevel(revision.getSelfAssessedLevel());
        employeeSkill.setManagerValidatedLevel(revision.getManagerValidatedLevel());
        employeeSkill.setValidationStatus(revision.getValidationStatus());
        employeeSkill.setYearsOfExperience(revision.getYearsOfExperience());
        employeeSkill.setLastUsedDate(revision.getLastUsedDate());
        employeeSkill.setEmployeeComment(revision.getEmployeeComment());
        employeeSkill.setManagerComment(revision.getManagerComment());
        employeeSkill.setLastUpdatedDate(revision.getLastUpdatedDate());
        employeeSkill.setLastValidatedDate(revision.getLastValidatedDate());
    }

    /** Field-by-field comparison of the live row against a revision (lastUpdatedDate is bookkeeping, not state). */
    boolean matchesState(EmployeeSkill es, EmployeeSkillHistory h) {
        return Objects.equals(es.getSelfAssessedLevel(), h.getSelfAssessedLevel())
                && Objects.equals(es.getManagerValidatedLevel(), h.getManagerValidatedLevel())
                && es.getValidationStatus() == h.getValidationStatus()
                && sameDecimal(es.getYearsOfExperience(), h.getYearsOfExperience())
                && Objects.equals(es.getLastUsedDate(), h.getLastUsedDate())
                && Objects.equals(es.getEmployeeComment(), h.getEmployeeComment())
                && Objects.equals(es.getManagerComment(), h.getManagerComment())
                && Objects.equals(micros(es.getLastValidatedDate()), micros(h.getLastValidatedDate()));
    }

    /**
     * Physically removes the skill after its manager approved a deletion request. The final pre-delete revision
     * and the DELETE audit entry are written first; existing history/audit rows are never touched.
     */
    void deleteApproved(EmployeeSkill employeeSkill, User approver, UUID requestId) {
        EmployeeSkillResponseDto oldDto = employeeSkillMapper.toResponseDto(employeeSkill);
        snapshotHistory(employeeSkill, approver);
        auditService.log(ENTITY_NAME, employeeSkill.getId(), AuditAction.DELETE, approver, oldDto, null,
                "Deleted on approval of deletion request: " + requestId);
        employeeSkillRepository.delete(employeeSkill);
    }

    void assertNotLocked(EmployeeSkill employeeSkill) {
        if (isLockedByValidationRequest(employeeSkill)) {
            throw new IllegalStateException(
                    "Skill is locked by a submitted validation or deletion request and cannot be modified");
        }
    }

    boolean isLockedByValidationRequest(EmployeeSkill employeeSkill) {
        return employeeSkill.getValidationStatus() == ValidationStatus.SUBMITTED
                || validationRequestItemRepository.existsByEmployeeSkillIdAndStatusAndValidationRequestStatus(
                        employeeSkill.getId(), ValidationRequestStatus.SUBMITTED, ValidationRequestStatus.SUBMITTED);
    }

    private EmployeeSkillHistory findLatestValidatedOrThrow(EmployeeSkill employeeSkill) {
        return employeeSkillHistoryRepository
                .findFirstByEmployeeSkillIdAndEmployeeIdAndValidationStatusOrderByVersionDesc(
                        employeeSkill.getId(), employeeSkill.getEmployee().getId(), ValidationStatus.VALIDATED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No validated revision found for EmployeeSkill: " + employeeSkill.getId()));
    }

    private void assertCanReadEmployeeSkill(User user, EmployeeSkill employeeSkill) {
        UserRole role = user.getRole();
        if (role == UserRole.ADMIN || role == UserRole.HR) {
            return;
        }
        if (role == UserRole.LINE_MANAGER) {
            assertDirectReport(employeeSkill.getEmployee(), findEmployeeForUser(user));
            return;
        }
        throw new AccessDeniedException("Employees must use /api/me/skills to view their own skills");
    }

    private void assertDirectReport(Employee employee, Employee managerEmployee) {
        if (employee.getManager() == null || !employee.getManager().getId().equals(managerEmployee.getId())) {
            throw new AccessDeniedException("Line managers can only access skills of their direct reports");
        }
    }

    private void assertNotReferencedByRequests(UUID employeeSkillId) {
        if (validationRequestItemRepository.existsByEmployeeSkillId(employeeSkillId)) {
            throw new IllegalStateException("Skill is referenced by a validation request and cannot be deleted");
        }
    }

    private static boolean sameDecimal(BigDecimal a, BigDecimal b) {
        return a == null || b == null ? a == b : a.compareTo(b) == 0;
    }

    private static Instant micros(Instant instant) {
        return instant == null ? null : instant.truncatedTo(ChronoUnit.MICROS);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void assertOwnership(EmployeeSkill employeeSkill, Employee employee) {
        if (!employeeSkill.getEmployee().getId().equals(employee.getId())) {
            throw new AccessDeniedException("You can only modify your own skills");
        }
    }

    private void assertAdminOrHrOrManager(User user) {
        UserRole role = user.getRole();
        if (role != UserRole.ADMIN && role != UserRole.HR && role != UserRole.LINE_MANAGER) {
            throw new AccessDeniedException("Insufficient permissions");
        }
    }

    private void validateLevel(Integer level) {
        if (level == null || level < 1 || level > 5) {
            throw new IllegalArgumentException("Knowledge level must be between 1 and 5");
        }
    }

    private Skill findSkillOrThrow(UUID skillId) {
        return skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + skillId));
    }

    private Employee findEmployeeOrThrow(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
    }

    private Employee findEmployeeForUser(User user) {
        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record found for user: " + user.getUsername()));
    }

    User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}


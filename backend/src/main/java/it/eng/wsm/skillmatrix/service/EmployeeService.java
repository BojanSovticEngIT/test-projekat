package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.common.Countries;
import it.eng.wsm.skillmatrix.common.EmployeeOrgUnitResolver;
import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.dto.request.EmployeeRequestDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeResponseDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.EmployeeMapper;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeService {

    private static final String ENTITY_NAME = "Employee";

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmployeeMapper employeeMapper;
    private final AuditService auditService;
    private final ScopeService scopeService;
    private final EmployeeOrgUnitResolver orgUnitResolver;

    @Transactional(readOnly = true)
    public Page<EmployeeResponseDto> findAll(
            String search,
            UUID managerId,
            UUID horizontalNodeId,
            String location,
            EmploymentStatus employmentStatus,
            WorkforceType workforceType,
            UUID skillId,
            Integer skillLevelMin,
            ValidationStatus validationStatus,
            Pageable pageable) {

        User currentUser = resolveCurrentUser();

        if (currentUser.getRole() == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees must use /api/me/employee-profile to view their own profile");
        }

        UUID effectiveManagerId = managerId;
        Set<UUID> scopedNodeIds = null;

        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            effectiveManagerId = scopeService.getLineManagerEmployeeId(currentUser);
        } else if (currentUser.getRole() == UserRole.HR_BUSINESS_PARTNER) {
            scopedNodeIds = scopeService.getScopedNodeIds(currentUser);
            if (scopedNodeIds.isEmpty()) {
                return Page.empty(pageable);
            }
        }

        Specification<Employee> spec = buildSpecification(
                search, effectiveManagerId, horizontalNodeId, location, employmentStatus, workforceType,
                skillId, skillLevelMin, validationStatus, scopedNodeIds);

        Page<Employee> page = employeeRepository.findAll(spec, pageable);
        Map<UUID, String> orgUnits = orgUnitResolver.labelsFor(
                page.getContent().stream().map(Employee::getId).toList());
        return page.map(employee -> toVisibleResponse(employee, currentUser, orgUnits.get(employee.getId())));
    }

    @Transactional(readOnly = true)
    public EmployeeResponseDto findById(UUID id) {
        User currentUser = resolveCurrentUser();

        if (currentUser.getRole() == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees must use /api/me/employee-profile to view their own profile");
        }

        Employee employee = findEmployeeOrThrow(id);

        if (!scopeService.canAccessEmployee(currentUser, id)) {
            throw new AccessDeniedException("You do not have permission to view this employee");
        }

        return toVisibleResponse(employee, currentUser);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeResponseDto create(EmployeeRequestDto dto) {
        User currentUser = resolveCurrentUser();

        if (dto.getEmployeeNumber() == null || dto.getEmployeeNumber().isBlank()) {
            dto.setEmployeeNumber(generateEmployeeNumber());
        }
        validateUniqueEmployeeNumber(dto.getEmployeeNumber().trim(), null);
        validateUniqueEmail(dto.getEmail(), null);

        Employee employee = new Employee();
        mapRequestToEmployee(dto, employee);

        Employee saved = employeeRepository.save(employee);

        EmployeeResponseDto responseDto = employeeMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, responseDto, null);

        return responseDto;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeResponseDto update(UUID id, EmployeeRequestDto dto) {
        User currentUser = resolveCurrentUser();

        Employee employee = findEmployeeOrThrow(id);
        EmployeeResponseDto oldDto = employeeMapper.toResponseDto(employee);

        if (dto.getEmployeeNumber() == null || dto.getEmployeeNumber().isBlank()) {
            dto.setEmployeeNumber(employee.getEmployeeNumber());
        }
        validateUniqueEmployeeNumber(dto.getEmployeeNumber().trim(), id);
        validateUniqueEmail(dto.getEmail(), id);

        mapRequestToEmployee(dto, employee);

        Employee saved = employeeRepository.save(employee);

        EmployeeResponseDto newDto = employeeMapper.toResponseDto(saved);
        auditService.log(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, null);

        newDto.setOrganizationUnit(orgUnitResolver.labelFor(saved.getId()));
        return newDto;
    }

    @Transactional(readOnly = true)
    public EmployeeResponseDto findOwnProfile() {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);
        return toVisibleResponse(employee, currentUser);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Cost code and the seniority derived from it are only visible to ADMIN and HR.
    private EmployeeResponseDto toVisibleResponse(Employee employee, User currentUser) {
        return toVisibleResponse(employee, currentUser, orgUnitResolver.labelFor(employee.getId()));
    }

    private EmployeeResponseDto toVisibleResponse(Employee employee, User currentUser, String organizationUnit) {
        EmployeeResponseDto dto = employeeMapper.toResponseDto(employee);
        dto.setOrganizationUnit(organizationUnit);
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.HR) {
            dto.setCostCode(null);
            dto.setSeniority(null);
        }
        return dto;
    }

    private void mapRequestToEmployee(EmployeeRequestDto dto, Employee employee) {
        employee.setEmployeeNumber(dto.getEmployeeNumber() != null ? dto.getEmployeeNumber().trim() : null);
        employee.setFirstName(dto.getFirstName() != null ? dto.getFirstName().trim() : null);
        employee.setLastName(dto.getLastName() != null ? dto.getLastName().trim() : null);
        employee.setEmail(dto.getEmail() != null ? dto.getEmail().trim().toLowerCase(Locale.ROOT) : null);
        employee.setJobTitle(dto.getJobTitle());
        employee.setJobProfile(dto.getJobProfile());
        employee.setLocation(normalizeCountry(dto.getLocation(), employee.getLocation()));
        employee.setEmploymentStatus(
                dto.getEmploymentStatus() != null ? dto.getEmploymentStatus() : EmploymentStatus.ACTIVE);
        if (dto.getWorkforceType() != null) {
            employee.setWorkforceType(dto.getWorkforceType());
        }
        employee.setCostCode(dto.getCostCode());

        if (dto.getManagerId() != null) {
            Employee manager = findEmployeeOrThrow(dto.getManagerId());
            employee.setManager(manager);
        } else {
            employee.setManager(null);
        }
    }

    // The country is required. A value already stored on the employee may be kept as is, so old data stays editable.
    private String normalizeCountry(String requested, String current) {
        if (current != null && current.trim().equalsIgnoreCase(requested.trim())) {
            return Countries.canonical(requested).orElse(current);
        }
        return Countries.canonical(requested).orElseThrow(
                () -> new IllegalArgumentException("Country '" + requested.trim() + "' is not in the list of countries."));
    }

    private String generateEmployeeNumber() {
        String candidate;
        do {
            candidate = "EMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (employeeRepository.existsByEmployeeNumber(candidate));
        return candidate;
    }

    private void validateUniqueEmployeeNumber(String employeeNumber, UUID excludeId) {
        if (excludeId == null) {
            if (employeeRepository.existsByEmployeeNumber(employeeNumber)) {
                throw new DuplicateResourceException(
                        "Employee with employee number '" + employeeNumber + "' already exists");
            }
        } else {
            if (employeeRepository.existsByEmployeeNumberAndIdNot(employeeNumber, excludeId)) {
                throw new DuplicateResourceException(
                        "Employee with employee number '" + employeeNumber + "' already exists");
            }
        }
    }

    private void validateUniqueEmail(String email, UUID excludeId) {
        String normalizedEmail = email != null ? email.trim().toLowerCase(Locale.ROOT) : null;
        if (excludeId == null) {
            if (employeeRepository.existsByEmail(normalizedEmail)) {
                throw new DuplicateResourceException(
                        "Employee with email '" + normalizedEmail + "' already exists");
            }
        } else {
            if (employeeRepository.existsByEmailAndIdNot(normalizedEmail, excludeId)) {
                throw new DuplicateResourceException(
                        "Employee with email '" + normalizedEmail + "' already exists");
            }
        }
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

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private Specification<Employee> buildSpecification(
            String search,
            UUID managerId,
            UUID horizontalNodeId,
            String location,
            EmploymentStatus employmentStatus,
            WorkforceType workforceType,
            UUID skillId,
            Integer skillLevelMin,
            ValidationStatus validationStatus,
            Set<UUID> scopedNodeIds) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate namePredicate = cb.or(
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern));
                predicates.add(namePredicate);
            }

            if (managerId != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), managerId));
            }

            if (scopedNodeIds != null && !scopedNodeIds.isEmpty()) {
                predicates.add(orgUnitResolver.currentNodeIn(root, query, cb, scopedNodeIds));
            }

            if (horizontalNodeId != null) {
                predicates.add(orgUnitResolver.currentNodeIn(
                        root, query, cb, orgUnitResolver.subtreeIds(List.of(horizontalNodeId))));
            }

            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("location")),
                        "%" + location.trim().toLowerCase(Locale.ROOT) + "%"));
            }

            if (employmentStatus != null) {
                predicates.add(cb.equal(root.get("employmentStatus"), employmentStatus));
            }

            if (workforceType != null) {
                predicates.add(cb.equal(root.get("workforceType"), workforceType));
            }

            // skillId / skillLevelMin / validationStatus filters require EmployeeSkill entity
            // — implemented in Phase 3/4 when EmployeeSkill is introduced
            // TODO: wire these filters once EmployeeSkillRepository is available

            return predicates.isEmpty() ? cb.conjunction()
                    : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

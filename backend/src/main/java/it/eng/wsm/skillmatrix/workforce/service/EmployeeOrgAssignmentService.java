package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.EmployeeHorizontalAssignmentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.EmployeeVerticalAssignmentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeHorizontalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeVerticalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeHorizontalAssignment;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeVerticalAssignment;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeHorizontalAssignmentRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeVerticalAssignmentRepository;
import it.eng.wsm.skillmatrix.workforce.repository.VerticalTaxonomyRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeOrgAssignmentService {

    private static final String HORIZONTAL_ENTITY = "EmployeeHorizontalAssignment";
    private static final String VERTICAL_ENTITY = "EmployeeVerticalAssignment";

    private final EmployeeHorizontalAssignmentRepository horizontalAssignmentRepository;
    private final EmployeeVerticalAssignmentRepository verticalAssignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final HorizontalNodeService horizontalNodeService;
    private final VerticalTaxonomyRepository verticalTaxonomyRepository;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;
    private final ScopeService scopeService;

    @Transactional(readOnly = true)
    public List<EmployeeHorizontalAssignmentResponseDto> findHorizontalAssignments(UUID employeeId) {
        assertCanViewEmployee(employeeId);
        return horizontalAssignmentRepository.findByEmployeeIdOrderByStartDateDesc(employeeId).stream()
                .map(workforceMapper::toHorizontalAssignmentResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EmployeeVerticalAssignmentResponseDto> findVerticalAssignments(UUID employeeId) {
        assertCanViewEmployee(employeeId);
        return verticalAssignmentRepository.findByEmployeeIdOrderByStartDateDesc(employeeId).stream()
                .map(workforceMapper::toVerticalAssignmentResponseDto)
                .toList();
    }

    public EmployeeHorizontalAssignmentResponseDto createHorizontalAssignment(
            UUID employeeId,
            EmployeeHorizontalAssignmentRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        assertCanModifyEmployee(currentUser, employeeId);
        validateDates(dto.getStartDate(), dto.getEndDate());

        Employee employee = findEmployeeOrThrow(employeeId);
        HorizontalNode node = horizontalNodeService.findNodeOrThrow(dto.getHorizontalNodeId());

        EmployeeHorizontalAssignment assignment = EmployeeHorizontalAssignment.builder()
                .employee(employee)
                .horizontalNode(node)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .build();

        EmployeeHorizontalAssignment saved = horizontalAssignmentRepository.save(assignment);
        EmployeeHorizontalAssignmentResponseDto response = workforceMapper.toHorizontalAssignmentResponseDto(saved);
        auditService.logWorkforceAction(HORIZONTAL_ENTITY, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    public EmployeeVerticalAssignmentResponseDto createVerticalAssignment(
            UUID employeeId,
            EmployeeVerticalAssignmentRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        assertCanModifyEmployee(currentUser, employeeId);
        validateDates(dto.getStartDate(), dto.getEndDate());
        validateVerticalTaxonomy(dto.getVerticalN1(), dto.getVerticalN2());

        Employee employee = findEmployeeOrThrow(employeeId);

        EmployeeVerticalAssignment assignment = EmployeeVerticalAssignment.builder()
                .employee(employee)
                .verticalN1(dto.getVerticalN1().trim())
                .verticalN2(trimToNull(dto.getVerticalN2()))
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .build();

        EmployeeVerticalAssignment saved = verticalAssignmentRepository.save(assignment);
        EmployeeVerticalAssignmentResponseDto response = workforceMapper.toVerticalAssignmentResponseDto(saved);
        auditService.logWorkforceAction(VERTICAL_ENTITY, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    private void assertCanViewEmployee(UUID employeeId) {
        User currentUser = securitySupport.resolveCurrentUser();
        if (!scopeService.canAccessEmployee(currentUser, employeeId)) {
            throw new AccessDeniedException("You do not have permission to view this employee");
        }
    }

    private void assertCanModifyEmployee(User currentUser, UUID employeeId) {
        if (!scopeService.canAccessEmployee(currentUser, employeeId)) {
            throw new AccessDeniedException("You do not have permission to modify assignments for this employee");
        }
        UserRole role = currentUser.getRole();
        if (role == UserRole.ADMIN || role == UserRole.PMO) {
            return;
        }
        if (role == UserRole.LINE_MANAGER || role == UserRole.HR_BUSINESS_PARTNER) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to create employee org assignments");
    }

    private void validateVerticalTaxonomy(String verticalN1, String verticalN2) {
        boolean exists = verticalTaxonomyRepository.findAllByOrderByVerticalN1AscVerticalN2Asc().stream()
                .anyMatch(item -> item.getVerticalN1().equals(verticalN1.trim())
                        && (verticalN2 == null
                                ? item.getVerticalN2() == null
                                : verticalN2.trim().equals(item.getVerticalN2())));
        if (!exists) {
            throw new IllegalArgumentException("Vertical taxonomy value is not recognized");
        }
    }

    private Employee findEmployeeOrThrow(UUID employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("start_date must be on or before end_date");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

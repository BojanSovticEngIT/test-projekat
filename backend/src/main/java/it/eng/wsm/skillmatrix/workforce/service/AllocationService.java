package it.eng.wsm.skillmatrix.workforce.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.AllocationConflictException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationCommentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationEndRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationCommentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationHistoryResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.entity.AllocationComment;
import it.eng.wsm.skillmatrix.workforce.entity.AllocationHistory;
import it.eng.wsm.skillmatrix.workforce.entity.Project;
import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import it.eng.wsm.skillmatrix.workforce.enums.OnboardingStatus;
import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import it.eng.wsm.skillmatrix.workforce.mapper.AllocationMapper;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationCommentRepository;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationHistoryRepository;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.ProjectRepository;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class AllocationService {

    private static final String ENTITY_NAME = "Allocation";

    private final AllocationRepository allocationRepository;
    private final AllocationHistoryRepository allocationHistoryRepository;
    private final AllocationCommentRepository allocationCommentRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final AllocationMapper allocationMapper;
    private final ConflictDetectionService conflictDetectionService;
    private final ScopeService scopeService;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;
    private final ObjectMapper objectMapper;
    private final EngagementSkillEventPublisher engagementSkillEventPublisher;

    @Transactional(readOnly = true)
    public List<AllocationResponseDto> findAll(UUID employeeId, UUID projectId, AllocationLifecycleStatus lifecycleStatus) {
        User currentUser = securitySupport.resolveCurrentUser();
        List<Allocation> allocations;
        if (projectId != null) {
            allocations = allocationRepository.findByProjectId(projectId);
        } else if (employeeId != null) {
            allocations = allocationRepository.findByEmployeeIdOrderByStartDateDesc(employeeId);
        } else {
            allocations = allocationRepository.findAll();
        }

        return allocations.stream()
                .filter(allocation -> employeeId == null || allocation.getEmployee().getId().equals(employeeId))
                .filter(allocation -> projectId == null || allocation.getProject().getId().equals(projectId))
                .filter(allocation -> canReadAllocation(currentUser, allocation))
                .filter(allocation -> lifecycleStatus == null
                        || AllocationLifecycleSupport.getLifecycleStatus(allocation, LocalDate.now()) == lifecycleStatus)
                .map(allocationMapper::toResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AllocationResponseDto> findByProjectId(UUID projectId) {
        User currentUser = securitySupport.resolveCurrentUser();
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        return allocationRepository.findByProjectId(projectId).stream()
                .filter(allocation -> canReadAllocation(currentUser, allocation))
                .map(allocationMapper::toResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AllocationResponseDto findById(UUID id) {
        Allocation allocation = getAllocationOrThrow(id);
        assertCanRead(securitySupport.resolveCurrentUser(), allocation);
        return allocationMapper.toResponseDto(allocation);
    }

    @Transactional(readOnly = true)
    public List<AllocationHistoryResponseDto> findHistoryByAllocationId(UUID allocationId) {
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanRead(securitySupport.resolveCurrentUser(), allocation);
        return allocationHistoryRepository.findByAllocationIdOrderByChangedAtDesc(allocationId).stream()
                .map(allocationMapper::toHistoryResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AllocationHistoryResponseDto> findHistoryByEmployeeId(UUID employeeId) {
        User currentUser = securitySupport.resolveCurrentUser();
        if (!scopeService.canAccessEmployee(currentUser, employeeId)) {
            throw new AccessDeniedException("You do not have permission to view this employee's allocation history");
        }
        return allocationHistoryRepository.findByAllocationEmployeeIdOrderByChangedAtDesc(employeeId).stream()
                .map(allocationMapper::toHistoryResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AllocationCommentResponseDto> findComments(UUID allocationId) {
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanRead(securitySupport.resolveCurrentUser(), allocation);
        return allocationCommentRepository.findByAllocationIdOrderByCreatedAtAsc(allocationId).stream()
                .map(allocationMapper::toCommentResponseDto)
                .toList();
    }

    public AllocationResponseDto create(AllocationRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Employee employee = getEmployeeOrThrow(dto.getEmployeeId());
        Project project = getProjectOrThrow(dto.getProjectId());

        assertCanWrite(currentUser, employee);
        validateDates(dto.getStartDate(), dto.getEndDate());
        validateAllocationPct(dto.getAllocationPct());
        validateEmployeeActive(employee);
        validateProjectAllocatable(project);

        boolean overridden = handleConflictCheck(currentUser, employee, dto, null);

        Allocation allocation = Allocation.builder()
                .employee(employee)
                .project(project)
                .roleName(dto.getRoleName())
                .allocationPct(dto.getAllocationPct())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .expectedEndDate(dto.getExpectedEndDate())
                .onboardingStatus(dto.getOnboardingStatus() != null ? dto.getOnboardingStatus() : OnboardingStatus.NOT_STARTED)
                .overrideFlag(overridden)
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build();

        Allocation saved = allocationRepository.save(allocation);
        appendHistory(saved, null, snapshot(saved), currentUser, overridden ? dto.getReason() : null);
        if (StringUtils.hasText(dto.getComment())) {
            addCommentInternal(saved, currentUser, dto.getComment());
        }

        AllocationResponseDto response = allocationMapper.toResponseDto(saved);
        AuditAction action = overridden ? AuditAction.OVERRIDE : AuditAction.CREATE;
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), action, currentUser, null, response,
                overridden ? dto.getReason() : null);
        return response;
    }

    public AllocationResponseDto update(UUID id, AllocationRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Allocation allocation = getAllocationOrThrow(id);
        assertCanWrite(currentUser, allocation.getEmployee());

        validateDates(dto.getStartDate(), dto.getEndDate());
        validateAllocationPct(dto.getAllocationPct());

        Employee employee = dto.getEmployeeId().equals(allocation.getEmployee().getId())
                ? allocation.getEmployee()
                : getEmployeeOrThrow(dto.getEmployeeId());
        assertCanWrite(currentUser, employee);

        Project project = dto.getProjectId().equals(allocation.getProject().getId())
                ? allocation.getProject()
                : getProjectOrThrow(dto.getProjectId());

        validateEmployeeActive(employee);
        validateProjectAllocatable(project);

        String previousSnapshot = snapshot(allocation);
        AllocationResponseDto oldDto = allocationMapper.toResponseDto(allocation);

        boolean overridden = handleConflictCheck(currentUser, employee, dto, allocation.getId());

        allocation.setEmployee(employee);
        allocation.setProject(project);
        allocation.setRoleName(dto.getRoleName());
        allocation.setAllocationPct(dto.getAllocationPct());
        allocation.setStartDate(dto.getStartDate());
        allocation.setEndDate(dto.getEndDate());
        allocation.setExpectedEndDate(dto.getExpectedEndDate());
        if (dto.getOnboardingStatus() != null) {
            allocation.setOnboardingStatus(dto.getOnboardingStatus());
        }
        if (overridden) {
            allocation.setOverrideFlag(true);
        }
        allocation.setUpdatedBy(currentUser);

        Allocation saved = allocationRepository.save(allocation);
        appendHistory(saved, previousSnapshot, snapshot(saved), currentUser, overridden ? dto.getReason() : null);

        AllocationResponseDto response = allocationMapper.toResponseDto(saved);
        AuditAction action = overridden ? AuditAction.OVERRIDE : AuditAction.UPDATE;
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), action, currentUser, oldDto, response,
                overridden ? dto.getReason() : null);
        return response;
    }

    public AllocationResponseDto end(UUID id, AllocationEndRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Allocation allocation = getAllocationOrThrow(id);
        assertCanWrite(currentUser, allocation.getEmployee());

        if (dto.getEffectiveEndDate().isBefore(allocation.getStartDate())) {
            throw new IllegalArgumentException("Effective end date cannot be before allocation start date");
        }

        boolean backdated = dto.getEffectiveEndDate().isBefore(LocalDate.now());
        if (backdated && !StringUtils.hasText(dto.getReason())) {
            throw new IllegalArgumentException("Reason is mandatory when backdating allocation end date");
        }

        String previousSnapshot = snapshot(allocation);
        AllocationResponseDto oldDto = allocationMapper.toResponseDto(allocation);

        allocation.setEndDate(dto.getEffectiveEndDate());
        allocation.setUpdatedBy(currentUser);
        Allocation saved = allocationRepository.save(allocation);

        appendHistory(saved, previousSnapshot, snapshot(saved), currentUser, dto.getReason());
        AllocationResponseDto response = allocationMapper.toResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.END, currentUser, oldDto, response,
                dto.getReason());
        engagementSkillEventPublisher.publish(saved.getId());
        return response;
    }

    public AllocationCommentResponseDto addComment(UUID allocationId, AllocationCommentRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanRead(currentUser, allocation);
        AllocationComment saved = addCommentInternal(allocation, currentUser, dto.getCommentText());
        return allocationMapper.toCommentResponseDto(saved);
    }

    private AllocationComment addCommentInternal(Allocation allocation, User currentUser, String commentText) {
        AllocationComment comment = AllocationComment.builder()
                .allocation(allocation)
                .author(currentUser)
                .commentText(commentText.trim())
                .build();
        return allocationCommentRepository.save(comment);
    }

    private boolean handleConflictCheck(User currentUser, Employee employee, AllocationRequestDto dto, UUID excludeId) {
        try {
            conflictDetectionService.check(
                    employee,
                    dto.getAllocationPct(),
                    dto.getStartDate(),
                    dto.getEndDate(),
                    dto.getExpectedEndDate(),
                    excludeId);
            return false;
        } catch (AllocationConflictException conflict) {
            if (!dto.isOverride()) {
                throw conflict;
            }
            if (!canOverride(currentUser)) {
                throw new AccessDeniedException("You do not have permission to override allocation conflicts");
            }
            if (!StringUtils.hasText(dto.getReason())) {
                throw new IllegalArgumentException("Override reason is mandatory when overriding allocation conflicts");
            }
            return true;
        }
    }

    private void appendHistory(
            Allocation allocation,
            String previousValues,
            String newValues,
            User changedBy,
            String reason) {
        AllocationHistory history = AllocationHistory.builder()
                .allocation(allocation)
                .previousValues(previousValues)
                .newValues(newValues)
                .changedBy(changedBy)
                .reason(reason)
                .build();
        allocationHistoryRepository.save(history);
    }

    private String snapshot(Allocation allocation) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("employeeId", allocation.getEmployee().getId());
        values.put("projectId", allocation.getProject().getId());
        values.put("roleName", allocation.getRoleName());
        values.put("allocationPct", allocation.getAllocationPct());
        values.put("startDate", allocation.getStartDate());
        values.put("endDate", allocation.getEndDate());
        values.put("expectedEndDate", allocation.getExpectedEndDate());
        values.put("onboardingStatus", allocation.getOnboardingStatus());
        values.put("overrideFlag", allocation.isOverrideFlag());
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize allocation snapshot", ex);
        }
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be on or before end date");
        }
    }

    private void validateAllocationPct(Integer allocationPct) {
        if (allocationPct == null || allocationPct <= 0) {
            throw new IllegalArgumentException("Allocation percentage must be greater than zero");
        }
    }

    private void validateEmployeeActive(Employee employee) {
        if (employee.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new IllegalArgumentException("Employee must be ACTIVE to receive an allocation");
        }
    }

    private void validateProjectAllocatable(Project project) {
        if (project.getStatus() != ProjectStatus.ACTIVE && project.getStatus() != ProjectStatus.PIPELINE) {
            throw new IllegalArgumentException("Project must be ACTIVE or PIPELINE to receive allocations");
        }
    }

    private boolean canOverride(User user) {
        return user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.PMO;
    }

    private void assertCanWrite(User currentUser, Employee employee) {
        if (currentUser.getRole() == UserRole.ADMIN || currentUser.getRole() == UserRole.PMO) {
            return;
        }
        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            if (!scopeService.getDirectReportIds(currentUser).contains(employee.getId())) {
                throw new AccessDeniedException("Line managers can only allocate direct reports");
            }
            return;
        }
        if (currentUser.getRole() == UserRole.HR_BUSINESS_PARTNER) {
            if (!scopeService.canAccessEmployee(currentUser, employee.getId())) {
                throw new AccessDeniedException("HR Business Partners can only allocate employees in their org units");
            }
            return;
        }
        throw new AccessDeniedException("You do not have permission to modify allocations");
    }

    private void assertCanRead(User currentUser, Allocation allocation) {
        if (!canReadAllocation(currentUser, allocation)) {
            throw new AccessDeniedException("You do not have permission to view this allocation");
        }
    }

    private boolean canReadAllocation(User currentUser, Allocation allocation) {
        if (currentUser.getRole() == UserRole.EMPLOYEE) {
            return scopeService.canAccessEmployee(currentUser, allocation.getEmployee().getId());
        }
        if (scopeService.isOrgWide(currentUser) || currentUser.getRole() == UserRole.HR) {
            return true;
        }
        return scopeService.canAccessEmployee(currentUser, allocation.getEmployee().getId());
    }

    private Allocation getAllocationOrThrow(UUID id) {
        return allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + id));
    }

    private Employee getEmployeeOrThrow(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
    }

    private Project getProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }
}

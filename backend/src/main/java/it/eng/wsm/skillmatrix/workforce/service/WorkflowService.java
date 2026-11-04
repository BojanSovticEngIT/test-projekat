package it.eng.wsm.skillmatrix.workforce.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.common.EmployeeOrgUnitResolver;
import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.HrBpOrgUnit;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.HrBpOrgUnitRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationEndRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.WorkflowDecisionRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.WorkflowRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkflowApprovalResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkflowResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.entity.WorkflowApproval;
import it.eng.wsm.skillmatrix.workforce.entity.WorkflowRequest;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationPriority;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationType;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowDecision;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowPriority;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowStatus;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowType;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.WorkflowApprovalRepository;
import it.eng.wsm.skillmatrix.workforce.repository.WorkflowRequestRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkflowService {

    private final WorkflowRequestRepository workflowRequestRepository;
    private final WorkflowApprovalRepository workflowApprovalRepository;
    private final AllocationRepository allocationRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final HrBpOrgUnitRepository hrBpOrgUnitRepository;
    private final NotificationService notificationService;
    private final AllocationService allocationService;
    private final ScopeService scopeService;
    private final EmployeeOrgUnitResolver orgUnitResolver;
    private final WorkforceSecuritySupport securitySupport;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WorkflowResponseDto> findAll(WorkflowStatus status, WorkflowType type) {
        User currentUser = securitySupport.resolveCurrentUser();
        return workflowRequestRepository.findAll().stream()
                .filter(workflow -> status == null || workflow.getStatus() == status)
                .filter(workflow -> type == null || workflow.getType() == type)
                .filter(workflow -> canReadWorkflow(currentUser, workflow))
                .map(this::toResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkflowResponseDto findById(UUID id) {
        WorkflowRequest workflow = getWorkflowOrThrow(id);
        assertCanRead(securitySupport.resolveCurrentUser(), workflow);
        return toResponseDto(workflow);
    }

    public WorkflowResponseDto submit(WorkflowRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        if (currentUser.getRole() != UserRole.LINE_MANAGER) {
            throw new AccessDeniedException("Only line managers can submit workflow requests");
        }

        UUID allocationId = extractAllocationId(dto.getPayload());
        Allocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));
        if (!scopeService.getDirectReportIds(currentUser).contains(allocation.getEmployee().getId())) {
            throw new AccessDeniedException("You can only submit workflows for direct reports");
        }

        WorkflowRequest workflow = WorkflowRequest.builder()
                .type(dto.getType())
                .status(WorkflowStatus.HRBP_REVIEW)
                .priority(dto.getPriority() != null ? dto.getPriority() : WorkflowPriority.NORMAL)
                .submittedBy(currentUser)
                .payload(writePayload(dto.getPayload()))
                .build();
        WorkflowRequest saved = workflowRequestRepository.save(workflow);

        notifyHrBpUsers(allocation.getEmployee(), saved);
        return toResponseDto(saved);
    }

    public WorkflowResponseDto approve(UUID id, WorkflowDecisionRequestDto dto) {
        return processDecision(id, dto, true);
    }

    public WorkflowResponseDto reject(UUID id, WorkflowDecisionRequestDto dto) {
        if (!StringUtils.hasText(dto.getComment())) {
            throw new IllegalArgumentException("Rejection comment is mandatory");
        }
        return processDecision(id, dto, false);
    }

    private WorkflowResponseDto processDecision(UUID id, WorkflowDecisionRequestDto dto, boolean approving) {
        User currentUser = securitySupport.resolveCurrentUser();
        WorkflowRequest workflow = getWorkflowOrThrow(id);
        WorkflowDecision decision = dto.getDecision();

        if (approving && decision != WorkflowDecision.APPROVE && decision != WorkflowDecision.ACKNOWLEDGE) {
            throw new IllegalArgumentException("Approve endpoint requires APPROVE or ACKNOWLEDGE decision");
        }
        if (!approving && decision != WorkflowDecision.REJECT && decision != WorkflowDecision.FLAG) {
            throw new IllegalArgumentException("Reject endpoint requires REJECT or FLAG decision");
        }

        recordApproval(workflow, currentUser, decision, dto.getComment());

        if (decision == WorkflowDecision.REJECT) {
            workflow.setStatus(WorkflowStatus.REJECTED);
            notifySubmitter(workflow, "Workflow rejected", dto.getComment());
        } else if (workflow.getStatus() == WorkflowStatus.HRBP_REVIEW) {
            handleHrbpDecision(workflow, currentUser, decision, dto.getComment());
        } else if (workflow.getStatus() == WorkflowStatus.PMO_REVIEW) {
            handlePmoDecision(workflow, currentUser, decision, dto.getComment());
        } else {
            throw new IllegalArgumentException("Workflow is not awaiting approval");
        }

        WorkflowRequest saved = workflowRequestRepository.save(workflow);
        return toResponseDto(saved);
    }

    private void handleHrbpDecision(
            WorkflowRequest workflow, User currentUser, WorkflowDecision decision, String comment) {
        if (currentUser.getRole() != UserRole.HR_BUSINESS_PARTNER && currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only HR Business Partners can act at HRBP review stage");
        }
        if (currentUser.getRole() == UserRole.HR_BUSINESS_PARTNER && !canHrbpActOn(workflow, currentUser)) {
            throw new AccessDeniedException("Workflow is outside your org unit scope");
        }

        if (workflow.getType() == WorkflowType.END_DATE_CHANGE) {
            workflow.setStatus(WorkflowStatus.APPROVED);
            applyApprovedChanges(workflow);
            notifyPmoUsers(workflow, "End date change acknowledged by HR BP");
            notifySubmitter(workflow, "End date change approved", comment);
            return;
        }

        if (decision == WorkflowDecision.APPROVE) {
            workflow.setStatus(WorkflowStatus.PMO_REVIEW);
            notifyPmoUsers(workflow, "Workflow awaiting PMO approval");
        }
    }

    private void handlePmoDecision(
            WorkflowRequest workflow, User currentUser, WorkflowDecision decision, String comment) {
        if (currentUser.getRole() != UserRole.PMO && currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only PMO can act at PMO review stage");
        }
        if (decision == WorkflowDecision.APPROVE) {
            workflow.setStatus(WorkflowStatus.APPROVED);
            applyApprovedChanges(workflow);
            notifySubmitter(workflow, "Workflow approved", comment);
        }
    }

    private void applyApprovedChanges(WorkflowRequest workflow) {
        Map<String, Object> payload = readPayload(workflow.getPayload());
        UUID allocationId = UUID.fromString(String.valueOf(payload.get("allocationId")));

        switch (workflow.getType()) {
            case ALLOCATION_CHANGE -> {
                Allocation allocation = allocationRepository.findById(allocationId)
                        .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));
                AllocationRequestDto request = new AllocationRequestDto();
                request.setEmployeeId(allocation.getEmployee().getId());
                request.setProjectId(allocation.getProject().getId());
                request.setRoleName(allocation.getRoleName());
                request.setAllocationPct(readInt(payload, "allocationPct", allocation.getAllocationPct()));
                request.setStartDate(allocation.getStartDate());
                if (payload.containsKey("endDate")) {
                    request.setEndDate(readDate(payload, "endDate"));
                } else {
                    request.setEndDate(allocation.getEndDate());
                }
                request.setExpectedEndDate(allocation.getExpectedEndDate());
                request.setOnboardingStatus(allocation.getOnboardingStatus());
                allocationService.update(allocationId, request);
            }
            case RELEASE_REQUEST, END_DATE_CHANGE -> {
                AllocationEndRequestDto endRequest = new AllocationEndRequestDto();
                endRequest.setEffectiveEndDate(readDate(payload, "effectiveEndDate"));
                endRequest.setReason(payload.get("reason") != null ? String.valueOf(payload.get("reason")) : null);
                allocationService.end(allocationId, endRequest);
            }
        }
    }

    private void recordApproval(
            WorkflowRequest workflow, User approver, WorkflowDecision decision, String comment) {
        WorkflowApproval approval = WorkflowApproval.builder()
                .workflowRequest(workflow)
                .approver(approver)
                .decision(decision)
                .commentText(comment)
                .build();
        workflowApprovalRepository.save(approval);
    }

    private void notifyHrBpUsers(Employee employee, WorkflowRequest workflow) {
        Set<UUID> nodeIds = orgUnitResolver.ancestorsOrSelf(orgUnitResolver.nodeIdFor(employee.getId()));
        if (nodeIds.isEmpty()) {
            return;
        }
        hrBpOrgUnitRepository.findByHorizontalNodeIdIn(nodeIds).stream()
                .map(HrBpOrgUnit::getUser)
                .distinct()
                .forEach(user -> notificationService.send(
                        user.getId(),
                        user,
                        NotificationType.WORKFLOW,
                        "Workflow pending HR BP review",
                        workflow.getType() + " for " + employee.getFirstName() + " " + employee.getLastName(),
                        workflow.getPriority() == WorkflowPriority.HIGH
                                ? NotificationPriority.HIGH
                                : NotificationPriority.MEDIUM));
    }

    private void notifyPmoUsers(WorkflowRequest workflow, String title) {
        userRepository.findByRole(UserRole.PMO).forEach(user -> notificationService.send(
                user.getId(),
                user,
                NotificationType.WORKFLOW,
                title,
                workflow.getType() + " workflow " + workflow.getId(),
                NotificationPriority.MEDIUM));
    }

    private void notifySubmitter(WorkflowRequest workflow, String title, String comment) {
        User submitter = workflow.getSubmittedBy();
        String body = comment != null ? comment : workflow.getType().name();
        notificationService.send(
                submitter.getId(),
                submitter,
                NotificationType.WORKFLOW,
                title,
                body,
                NotificationPriority.MEDIUM);
    }

    private boolean canHrbpActOn(WorkflowRequest workflow, User currentUser) {
        UUID employeeId = extractEmployeeId(readPayload(workflow.getPayload()));
        return scopeService.canAccessEmployee(currentUser, employeeId);
    }

    private boolean canReadWorkflow(User currentUser, WorkflowRequest workflow) {
        if (currentUser.getRole() == UserRole.ADMIN || currentUser.getRole() == UserRole.PMO) {
            return true;
        }
        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            return workflow.getSubmittedBy().getId().equals(currentUser.getId());
        }
        if (currentUser.getRole() == UserRole.HR_BUSINESS_PARTNER) {
            return canHrbpActOn(workflow, currentUser)
                    || workflow.getStatus() == WorkflowStatus.HRBP_REVIEW;
        }
        return false;
    }

    private void assertCanRead(User currentUser, WorkflowRequest workflow) {
        if (!canReadWorkflow(currentUser, workflow)) {
            throw new AccessDeniedException("You do not have permission to view this workflow");
        }
    }

    private WorkflowResponseDto toResponseDto(WorkflowRequest workflow) {
        List<WorkflowApprovalResponseDto> approvals = workflowApprovalRepository
                .findByWorkflowRequestIdOrderByDecidedAtAsc(workflow.getId()).stream()
                .map(approval -> WorkflowApprovalResponseDto.builder()
                        .id(approval.getId())
                        .approverId(approval.getApprover().getId())
                        .approverName(approval.getApprover().getUsername())
                        .decision(approval.getDecision())
                        .comment(approval.getCommentText())
                        .decidedAt(approval.getDecidedAt())
                        .build())
                .toList();

        return WorkflowResponseDto.builder()
                .id(workflow.getId())
                .type(workflow.getType())
                .status(workflow.getStatus())
                .priority(workflow.getPriority())
                .submittedById(workflow.getSubmittedBy().getId())
                .submittedByName(workflow.getSubmittedBy().getUsername())
                .payload(workflow.getPayload())
                .submittedAt(workflow.getSubmittedAt())
                .slaBreached(workflow.isSlaBreached())
                .approvals(approvals)
                .build();
    }

    private WorkflowRequest getWorkflowOrThrow(UUID id) {
        return workflowRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
    }

    private UUID extractAllocationId(Map<String, Object> payload) {
        Object value = payload.get("allocationId");
        if (value == null) {
            throw new IllegalArgumentException("payload.allocationId is required");
        }
        return UUID.fromString(String.valueOf(value));
    }

    private UUID extractEmployeeId(Map<String, Object> payload) {
        if (payload.containsKey("employeeId")) {
            return UUID.fromString(String.valueOf(payload.get("employeeId")));
        }
        UUID allocationId = extractAllocationId(payload);
        return allocationRepository.findById(allocationId)
                .map(allocation -> allocation.getEmployee().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));
    }

    private String writePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid workflow payload", ex);
        }
    }

    private Map<String, Object> readPayload(String payload) {
        try {
            return objectMapper.readValue(payload, new TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to parse workflow payload", ex);
        }
    }

    private int readInt(Map<String, Object> payload, String key, int defaultValue) {
        Object value = payload.get(key);
        return value == null ? defaultValue : Integer.parseInt(String.valueOf(value));
    }

    private LocalDate readDate(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            throw new IllegalArgumentException("payload." + key + " is required");
        }
        return LocalDate.parse(String.valueOf(value));
    }
}

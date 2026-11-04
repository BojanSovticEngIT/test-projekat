package it.eng.wsm.skillmatrix.workforce.scheduler;

import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.workforce.dto.response.BenchEntryResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.WorkflowRequest;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationPriority;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationType;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowPriority;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowStatus;
import it.eng.wsm.skillmatrix.workforce.repository.WorkflowRequestRepository;
import it.eng.wsm.skillmatrix.workforce.service.BenchService;
import it.eng.wsm.skillmatrix.workforce.service.NotificationService;
import it.eng.wsm.skillmatrix.workforce.service.ProjectService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkforceScheduler {

    private static final Duration HRBP_SLA = Duration.ofDays(3);
    private static final Duration PMO_SLA = Duration.ofDays(5);
    private static final Duration EMERGENCY_SLA = Duration.ofHours(8);

    private final WorkflowRequestRepository workflowRequestRepository;
    private final BenchService benchService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final ProjectService projectService;

    @Scheduled(cron = "0 5 0 * * *")
    public void syncProjectStatuses() {
        projectService.syncStatuses();
    }

    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void evaluateWorkflowSla() {
        Instant now = Instant.now();
        List<WorkflowRequest> openRequests = workflowRequestRepository.findByStatusInOrderBySubmittedAtDesc(
                List.of(WorkflowStatus.HRBP_REVIEW, WorkflowStatus.PMO_REVIEW));

        for (WorkflowRequest workflow : openRequests) {
            Duration age = Duration.between(workflow.getSubmittedAt(), now);
            boolean breached = switch (workflow.getStatus()) {
                case HRBP_REVIEW -> workflow.getPriority() == WorkflowPriority.HIGH
                        ? age.compareTo(EMERGENCY_SLA) >= 0
                        : age.compareTo(HRBP_SLA) >= 0;
                case PMO_REVIEW -> age.compareTo(PMO_SLA) >= 0;
                default -> false;
            };
            if (breached && !workflow.isSlaBreached()) {
                workflow.setSlaBreached(true);
                workflowRequestRepository.save(workflow);
                notificationService.send(
                        workflow.getSubmittedBy().getId(),
                        workflow.getSubmittedBy(),
                        NotificationType.WORKFLOW,
                        "Workflow SLA breached",
                        workflow.getType() + " request requires attention",
                        NotificationPriority.CRITICAL);
            }
        }
    }

    @Scheduled(cron = "0 30 6 * * *")
    @Transactional
    public void sendBenchAlerts() {
        List<BenchEntryResponseDto> benchWithin30 = benchService.getBench(30);
        if (benchWithin30.isEmpty()) {
            return;
        }
        userRepository.findByRole(UserRole.PMO).forEach(user -> notificationService.send(
                user.getId(),
                user,
                NotificationType.BENCH_ALERT,
                "Allocations ending within 30 days",
                benchWithin30.size() + " employees may hit bench without follow-on assignments",
                NotificationPriority.HIGH));
        log.info("Bench alert sent for {} employees within 30-day horizon", benchWithin30.size());
    }
}

package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.dto.request.MeetingFeedbackRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateDto;
import it.eng.wsm.skillmatrix.demand.dto.response.MeetingSummaryDto;
import it.eng.wsm.skillmatrix.demand.dto.response.MeetingUserDto;
import it.eng.wsm.skillmatrix.demand.entity.Candidate;
import it.eng.wsm.skillmatrix.demand.entity.CandidateStep;
import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.MeetingParticipant;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import it.eng.wsm.skillmatrix.demand.enums.MeetingVerdict;
import it.eng.wsm.skillmatrix.demand.repository.CandidateRepository;
import it.eng.wsm.skillmatrix.demand.repository.CandidateStepRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandRepository;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Meetings of the candidate flow (spec N-01 to N-04, R-03). A participant with system access sees only their meetings
 * and a short candidate summary, adds their own feedback once, and may add notes to their own meetings.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MeetingService {

    /** Users that can be invited to a meeting (N-01). */
    private static final Set<UserRole> MEETING_ROLES =
            Set.of(UserRole.LINE_MANAGER, UserRole.HR_BUSINESS_PARTNER, UserRole.HR, UserRole.PMO);

    private final DemandRepository demandRepository;
    private final CandidateRepository candidateRepository;
    private final CandidateStepRepository stepRepository;
    private final UserRepository userRepository;
    private final DemandAccessPolicy accessPolicy;
    private final DemandHistoryRecorder historyRecorder;
    private final CandidateViewBuilder viewBuilder;
    private final CandidateService candidateService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<MeetingUserDto> meetingUsers() {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        return userRepository.findAll().stream()
                .filter(candidate -> candidate.isActive() && MEETING_ROLES.contains(candidate.getRole()))
                .map(candidate -> new MeetingUserDto(candidate.getId(), accessPolicy.displayName(candidate),
                        CandidateService.roleLabel(candidate.getRole())))
                .sorted(Comparator.comparing(MeetingUserDto::name))
                .toList();
    }

    /** R-03: the meetings the signed-in user takes part in, newest first. */
    @Transactional(readOnly = true)
    public List<MeetingSummaryDto> myMeetings() {
        User user = accessPolicy.currentUser();
        List<CandidateStep> meetings = stepRepository.findMeetingsOfParticipant(user.getId()).stream()
                .sorted(Comparator.comparing(CandidateStep::getMeetingAt, Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder())))
                .toList();
        return viewBuilder.meetingSummaries(meetings);
    }

    /** N-02: a participant with system access writes their own feedback once. It is never changed. */
    public CandidateDto addFeedback(UUID demandId, UUID candidateId, UUID stepId, MeetingFeedbackRequestDto request) {
        User user = accessPolicy.currentUser();
        Demand demand = demandRepository.findById(demandId)
                .orElseThrow(() -> new ResourceNotFoundException("Demand not found: " + demandId));
        Candidate candidate = candidateRepository.findByIdAndDemandIdForUpdate(candidateId, demandId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found."));
        CandidateStep step = findStep(candidate, stepId, "Meeting not found.");
        if (step.getType() != CandidateStepType.MEETING) {
            throw new ResourceNotFoundException("Meeting not found.");
        }
        if (demand.isDeleted()) {
            throw new IllegalStateException(CandidateService.DELETED_MESSAGE);
        }
        // Identity comes from the session, never from the request body.
        MeetingParticipant participant = step.getParticipants().stream()
                .filter(item -> !item.isExternal() && item.getUser() != null
                        && item.getUser().getId().equals(request.participantUserId()))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException("Only a participant with system access can give feedback."));
        if (!participant.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can give feedback only for yourself.");
        }
        MeetingVerdict verdict = MeetingVerdict.fromApi(request.verdict());
        String text = CandidateFormat.trimToNull(request.feedback());
        if (verdict == null || text == null) {
            throw new IllegalArgumentException("Select a verdict and write your feedback.");
        }
        if (step.getStatus() == CandidateStepStatus.CANCELLED) {
            throw new IllegalStateException("This meeting was cancelled.");
        }
        if (participant.getVerdict() != null) {
            throw new IllegalStateException("Feedback is already recorded and cannot be changed.");
        }
        Instant now = DemandHistoryRecorder.now();
        participant.setVerdict(verdict);
        participant.setFeedback(text);
        participant.setFeedbackAt(now);
        candidate.setLastChangeAt(now);
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_FEEDBACK_ADDED, "candidateSteps", null,
                participant.getName() + " gave " + verdict.apiValue() + " feedback on \"" + step.getTitle() + "\" for "
                        + CandidateViewBuilder.personName(candidate),
                null, null, user, participant.getName(), now);
        auditService.log("Candidate", candidate.getId(), AuditAction.CREATE, user, null, null,
                "Added meeting feedback on " + demand.getCode());
        return view(user, demand, candidate, step);
    }

    /** N-03: the roles that may add notes, or a participant with system access on their own meeting. */
    public CandidateDto addStepNote(UUID demandId, UUID candidateId, UUID stepId, String rawText) {
        User user = accessPolicy.currentUser();
        Demand demand = demandRepository.findById(demandId)
                .orElseThrow(() -> new ResourceNotFoundException("Demand not found: " + demandId));
        Candidate candidate = candidateRepository.findByIdAndDemandIdAndRemovedFalse(candidateId, demandId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));
        CandidateStep step = findStep(candidate, stepId, "Step not found.");
        boolean participant = isParticipant(user, step);
        boolean canNote = accessPolicy.canAddNote(user);
        if (!canNote && !participant) {
            throw new AccessDeniedException("You can add notes only to meetings you take part in.");
        }
        if (demand.isDeleted()) {
            if (!accessPolicy.canManage(user) && !participant) {
                throw new ResourceNotFoundException("Demand not found: " + demandId);
            }
            throw new IllegalStateException(CandidateService.DELETED_MESSAGE);
        }
        String text = CandidateFormat.trimToNull(rawText);
        if (text == null) {
            throw new IllegalArgumentException("Write the note first.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        candidateService.saveNote(demand, candidate, step, user, actorName, text, null, now);
        historyRecorder.record(demand, DemandHistoryAction.NOTE_ADDED, "step", null,
                "\"" + step.getTitle() + "\" for " + CandidateViewBuilder.personName(candidate),
                null, null, user, actorName, now);
        auditService.log("Candidate", candidate.getId(), AuditAction.CREATE, user, null, null,
                "Added a step note on " + demand.getCode());
        return view(user, demand, candidate, step);
    }

    /** Readers get the full candidate; a participant without demand access gets the meeting summary only. */
    private CandidateDto view(User user, Demand demand, Candidate candidate, CandidateStep step) {
        if (accessPolicy.canRead(user)) {
            return viewBuilder.build(demand, candidate);
        }
        return viewBuilder.participantView(candidate, step);
    }

    private static boolean isParticipant(User user, CandidateStep step) {
        return step.getType() == CandidateStepType.MEETING && step.getParticipants().stream()
                .anyMatch(item -> !item.isExternal() && item.getUser() != null && item.getUser().getId().equals(user.getId()));
    }

    private static CandidateStep findStep(Candidate candidate, UUID stepId, String notFoundMessage) {
        return candidate.getSteps().stream()
                .filter(item -> item.getId().equals(stepId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(notFoundMessage));
    }
}


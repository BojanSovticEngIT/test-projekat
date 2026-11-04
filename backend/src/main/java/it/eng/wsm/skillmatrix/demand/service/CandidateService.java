package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.dto.request.CandidateAddRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateNoteRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateOutcomeRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateStepRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateBudgetDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateOptionsDto;
import it.eng.wsm.skillmatrix.demand.entity.Candidate;
import it.eng.wsm.skillmatrix.demand.entity.CandidateStep;
import it.eng.wsm.skillmatrix.demand.entity.CandidateStepChange;
import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandNote;
import it.eng.wsm.skillmatrix.demand.entity.ExternalPerson;
import it.eng.wsm.skillmatrix.demand.entity.MeetingParticipant;
import it.eng.wsm.skillmatrix.demand.enums.CandidateSource;
import it.eng.wsm.skillmatrix.demand.enums.CandidatePipelineStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import it.eng.wsm.skillmatrix.demand.repository.CandidateRepository;
import it.eng.wsm.skillmatrix.demand.repository.CandidateStepRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandNoteRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandRepository;
import it.eng.wsm.skillmatrix.demand.repository.ExternalPersonRepository;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationPriority;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationType;
import it.eng.wsm.skillmatrix.workforce.service.NotificationService;
import jakarta.persistence.criteria.JoinType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Module 3 candidates and their flow (spec 4.6, 4.7, M-01 to M-05, F-01 to F-07, H-02).
 * <p>
 * The rules mirror the frontend ({@code candidateRules.ts}) so the API returns the same messages as the UI.
 * Every change locks the demand row first, then the candidate row, and writes the demand history and the audit log
 * in the same transaction. The audit log gets ids and the demand code only, no personal data.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CandidateService {

    /** Kinds of meeting (N-01), the same list as the frontend {@code MEETING_KINDS}. */
    public static final List<String> MEETING_KINDS = List.of(
            "Internal interview", "Technical interview", "Client interview", "Other meeting");

    static final String BUDGET_EXCEPTION = "BUDGET_EXCEPTION";
    static final String DELETED_MESSAGE = "A deleted demand cannot be changed. Restore it first.";
    private static final String CLOSED_STEPS = "This candidate is closed. No steps can be added.";
    private static final String AUDIT_ENTITY = "Candidate";
    private static final int FREE_FROM_HORIZON_DAYS = 92;
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Set<WorkforceType> POOL_TYPES =
            EnumSet.of(WorkforceType.EMPLOYEE, WorkforceType.B2B, WorkforceType.SUPPLIER);

    /** Outcome rules per step type (F-03, F-04): the status before, the allowed outcomes, the negative and the stop. */
    private record OutcomeRule(CandidateStepStatus from, List<CandidateStepStatus> options,
            CandidateStepStatus negative, CandidateStepStatus stopped) {
    }

    private static final Map<CandidateStepType, OutcomeRule> OUTCOME_RULES = Map.of(
            CandidateStepType.CV, new OutcomeRule(CandidateStepStatus.WAITING_FOR_FEEDBACK,
                    List.of(CandidateStepStatus.APPROVED, CandidateStepStatus.REJECTED),
                    CandidateStepStatus.REJECTED, null),
            CandidateStepType.MEETING, new OutcomeRule(CandidateStepStatus.SCHEDULED,
                    List.of(CandidateStepStatus.DONE_POSITIVE, CandidateStepStatus.DONE_NEGATIVE, CandidateStepStatus.CANCELLED),
                    CandidateStepStatus.DONE_NEGATIVE, CandidateStepStatus.CANCELLED),
            CandidateStepType.OFFER, new OutcomeRule(CandidateStepStatus.SENT,
                    List.of(CandidateStepStatus.ACCEPTED, CandidateStepStatus.DECLINED, CandidateStepStatus.WITHDRAWN),
                    CandidateStepStatus.DECLINED, CandidateStepStatus.WITHDRAWN),
            CandidateStepType.CUSTOM, new OutcomeRule(CandidateStepStatus.TO_DO,
                    List.of(CandidateStepStatus.DONE, CandidateStepStatus.FAILED),
                    CandidateStepStatus.FAILED, null));

    private final DemandRepository demandRepository;
    private final CandidateRepository candidateRepository;
    private final CandidateStepRepository stepRepository;
    private final ExternalPersonRepository externalPersonRepository;
    private final DemandNoteRepository noteRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DemandAccessPolicy accessPolicy;
    private final DemandHistoryRecorder historyRecorder;
    private final CandidateViewBuilder viewBuilder;
    private final CandidateAllocationReader allocationReader;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // ---------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public List<CandidateDto> list(UUID demandId) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertRead(user);
        Demand demand = findVisibleDemand(demandId, user);
        return viewBuilder.build(demand, candidateRepository.findByDemandIdAndRemovedFalseOrderByCreatedAtAsc(demandId));
    }

    /** Who can be added (M-01, M-02a, M-02b): internal people with capacity within 3 months, and known external people. */
    @Transactional(readOnly = true)
    public CandidateOptionsDto options(UUID demandId) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertAddCandidate(user);
        Demand demand = findVisibleDemand(demandId, user);
        List<Candidate> here = candidateRepository.findByDemandIdAndRemovedFalseOrderByCreatedAtAsc(demandId);
        Set<UUID> hereEmployees = here.stream().filter(c -> c.getEmployee() != null)
                .map(c -> c.getEmployee().getId()).collect(Collectors.toSet());
        Set<UUID> herePersons = here.stream().filter(c -> c.getExternalPerson() != null)
                .map(c -> c.getExternalPerson().getId()).collect(Collectors.toSet());

        List<Employee> pool = employeeRepository.findAll(poolSpecification());
        List<Candidate> externalCandidacies = candidateRepository.findAllExternalOnActiveDemands();
        CandidateViewBuilder.OtherDemandsIndex others = new CandidateViewBuilder.OtherDemandsIndex(
                pool.isEmpty() ? List.of() : candidateRepository.findByEmployeeIds(pool.stream().map(Employee::getId).toList()),
                externalCandidacies);

        CandidateAllocationReader.Snapshot allocations = allocationReader.read();
        LocalDate today = LocalDate.now();
        record Ranked(CandidateOptionsDto.InternalOption option, int rank) {
        }
        List<CandidateOptionsDto.InternalOption> internal = pool.stream()
                .map(employee -> {
                    Availability availability = availability(employee, allocations, today);
                    if (!availability.show()) {
                        return null;
                    }
                    return new Ranked(new CandidateOptionsDto.InternalOption(
                            employee.getId(),
                            CandidateViewBuilder.employeeName(employee),
                            employee.getJobTitle(),
                            null,
                            availability.text(),
                            CandidateViewBuilder.employeeName(employee.getManager()),
                            hereEmployees.contains(employee.getId()),
                            others.ofEmployee(employee.getId(), demandId)), availability.rank());
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt(Ranked::rank).thenComparing(ranked -> ranked.option().name()))
                .map(Ranked::option)
                .toList();

        // The latest candidacy of each external person gives the recruiter and the rate shown in the list.
        Map<UUID, Candidate> latestByPerson = new LinkedHashMap<>();
        for (Candidate candidacy : externalCandidacies) {
            UUID personId = candidacy.getExternalPerson().getId();
            if (!herePersons.contains(personId) && !candidacy.getDemand().getId().equals(demandId)) {
                latestByPerson.put(personId, candidacy);
            }
        }
        List<CandidateOptionsDto.ExternalOption> external = latestByPerson.values().stream()
                .map(candidacy -> new CandidateOptionsDto.ExternalOption(
                        candidacy.getExternalPerson().getId(),
                        candidacy.getExternalPerson().getFullName(),
                        candidacy.getExternalPerson().getEmail(),
                        candidacy.getRecruiterName(),
                        candidacy.getExpectedDailyRate(),
                        others.ofPerson(candidacy.getExternalPerson().getId(), demand.getId())))
                .sorted(Comparator.comparing(CandidateOptionsDto.ExternalOption::name))
                .toList();

        return new CandidateOptionsDto(internal, external, List.copyOf(recruiters().keySet()));
    }

    // ---------------------------------------------------------------- add candidates (M-01, M-02)

    public List<CandidateDto> add(UUID demandId, CandidateAddRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertAddCandidate(user);
        Demand demand = lockDemandForChange(demandId, user);
        if (request.type() == null) {
            throw new IllegalArgumentException("Unknown candidate type.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        List<Candidate> added = new ArrayList<>();
        String historyNote;

        if (request.type() == CandidateType.INTERNAL) {
            List<UUID> ids = request.employeeIds() == null ? List.of()
                    : new ArrayList<>(new LinkedHashSet<>(request.employeeIds()));
            if (ids.isEmpty() || ids.contains(null)) {
                throw new IllegalArgumentException("Select at least one person.");
            }
            Map<UUID, Employee> found = employeeRepository.findAllById(ids).stream()
                    .collect(Collectors.toMap(Employee::getId, Function.identity()));
            if (found.size() != ids.size()) {
                throw new IllegalArgumentException("Select at least one person.");
            }
            for (UUID employeeId : ids) {
                Employee employee = found.get(employeeId);
                if (candidateRepository.existsByDemandIdAndEmployeeIdAndRemovedFalse(demandId, employeeId)) {
                    throw new IllegalStateException(
                            CandidateViewBuilder.employeeName(employee) + " is already a candidate on this demand.");
                }
                Candidate candidate = newCandidate(demand, CandidateType.INTERNAL, CandidateSource.BENCH_SEARCH, user, now);
                candidate.setEmployee(employee);
                added.add(candidate);
            }
            historyNote = "from Module 4 search";
        } else {
            String name = CandidateFormat.trimToNull(request.name());
            String email = CandidateFormat.trimToNull(request.email());
            String recruiterName = CandidateFormat.trimToNull(request.recruiter());
            Integer rate = request.expectedDailyRate();
            if (name == null) {
                throw new IllegalArgumentException("Enter the full name.");
            }
            if (email != null && !EMAIL.matcher(email).matches()) {
                throw new IllegalArgumentException("Enter a valid email.");
            }
            User recruiter = recruiterName == null ? null : recruiters().get(recruiterName);
            if (recruiter == null) {
                throw new IllegalArgumentException("Select a recruiter.");
            }
            if (rate != null && rate < 0) {
                throw new IllegalArgumentException("The daily rate must be zero or more.");
            }
            ExternalPerson person = null;
            if (request.personId() != null) {
                person = externalPersonRepository.findById(request.personId())
                        .orElseThrow(() -> new IllegalArgumentException("The selected person no longer exists."));
            }
            // Names are not identities: an existing person is matched by id or by normalized email only.
            if (person == null && email != null) {
                person = externalPersonRepository.findByEmailNormalized(normalizeEmail(email)).orElse(null);
            }
            if (person != null && candidateRepository.existsByDemandIdAndExternalPersonIdAndRemovedFalse(demandId, person.getId())) {
                throw new IllegalStateException(person.getFullName() + " is already a candidate on this demand.");
            }
            if (person == null) {
                person = new ExternalPerson();
                person.setFullName(name);
                person.setEmail(email);
                person.setEmailNormalized(email == null ? null : normalizeEmail(email));
                person.setCreatedBy(user);
                person = externalPersonRepository.save(person);
            }
            Candidate candidate = newCandidate(demand, CandidateType.EXTERNAL, CandidateSource.RECRUITER, user, now);
            candidate.setExternalPerson(person);
            candidate.setRecruiterUser(recruiter);
            candidate.setRecruiterName(recruiterName);
            candidate.setExpectedDailyRate(rate != null && rate > 0 ? rate : null);
            added.add(candidate);
            historyNote = "(external, recruiter " + recruiterName + ")";
        }

        // M-02c: an above-budget candidate needs an explanation. Checked before anything is stored.
        String exceptionText = CandidateFormat.trimToNull(request.budgetException());
        List<Candidate> overBudget = added.stream().filter(candidate -> isOverBudget(demand, candidate)).toList();
        if (!overBudget.isEmpty() && exceptionText == null) {
            throw new IllegalArgumentException("Explain why the above-budget candidate is accepted.");
        }

        added.forEach(candidateRepository::save);
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_ADDED, "candidates", null,
                added.stream().map(CandidateViewBuilder::personName).collect(Collectors.joining(", ")),
                null, historyNote, user, actorName, now);
        // The reason is stored as an ordinary candidate note, only for candidates that really are above the budget.
        for (Candidate candidate : overBudget) {
            saveNote(demand, candidate, null, user, actorName, exceptionText, BUDGET_EXCEPTION, now);
            historyRecorder.record(demand, DemandHistoryAction.NOTE_ADDED, "candidate", null,
                    CandidateViewBuilder.personName(candidate), null, "Budget exception.", user, actorName, now);
        }
        added.forEach(candidate -> audit(candidate, AuditAction.CREATE, user, "Added candidate to " + demand.getCode()));
        return viewBuilder.build(demand, added);
    }

    // ---------------------------------------------------------------- candidate notes (N-05 to N-07, M-02c)

    public CandidateDto addNote(UUID demandId, UUID candidateId, CandidateNoteRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertAddNote(user);
        Demand demand = findDemandForChange(demandId, user);
        Candidate candidate = candidateRepository.findByIdAndDemandIdAndRemovedFalse(candidateId, demandId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));
        String text = CandidateFormat.trimToNull(request.text());
        if (text == null) {
            throw new IllegalArgumentException("Write the note first.");
        }
        String kind = CandidateFormat.trimToNull(request.kind());
        if (kind != null && !BUDGET_EXCEPTION.equals(kind)) {
            throw new IllegalArgumentException("Unknown note kind.");
        }
        if (kind != null && !isOverBudget(demand, candidate)) {
            throw new IllegalStateException("This candidate is not above the budget of the demand.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        saveNote(demand, candidate, null, user, actorName, text, kind, now);
        historyRecorder.record(demand, DemandHistoryAction.NOTE_ADDED, "candidate", null,
                CandidateViewBuilder.personName(candidate), null, kind != null ? "Budget exception." : null,
                user, actorName, now);
        audit(candidate, AuditAction.CREATE, user, "Added a candidate note on " + demand.getCode());
        return viewBuilder.build(demand, candidate);
    }

    // ---------------------------------------------------------------- withdraw (C-06)

    public CandidateDto withdraw(UUID demandId, UUID candidateId, String reason) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        Demand demand = lockDemandForChange(demandId, user);
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate not found.");
        String trimmed = CandidateFormat.trimToNull(reason);
        if (trimmed == null) {
            throw new IllegalArgumentException("Enter the reason for the withdrawal.");
        }
        if (!candidate.isOpen()) {
            throw new IllegalStateException("Only a candidate In process can be withdrawn.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        close(candidate, CandidateStatus.WITHDRAWN, trimmed, user, actorName, now);
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_WITHDRAWN, "candidates", null,
                CandidateViewBuilder.personName(candidate), null, trimmed, user, actorName, now);
        audit(candidate, AuditAction.UPDATE, user, "Withdrew candidate on " + demand.getCode());
        return viewBuilder.build(demand, candidate);
    }

    // ---------------------------------------------------------------- move to another demand

    public CandidateDto move(UUID demandId, UUID candidateId, UUID targetDemandId) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        if (demandId.equals(targetDemandId)) {
            throw new IllegalArgumentException("Choose a different demand.");
        }
        // Lock in a fixed order so two opposite moves cannot deadlock.
        boolean sourceFirst = demandId.compareTo(targetDemandId) < 0;
        Demand first = lockDemandForChange(sourceFirst ? demandId : targetDemandId, user);
        Demand second = lockDemandForChange(sourceFirst ? targetDemandId : demandId, user);
        Demand source = sourceFirst ? first : second;
        Demand target = sourceFirst ? second : first;
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate not found.");
        boolean placed = candidate.getStatus() == CandidateStatus.PLACED;
        if (placed && target.getOpenPositions() <= 0) {
            throw new IllegalStateException(target.getCode() + " has no open position for a placed candidate.");
        }
        boolean duplicate = candidate.getType() == CandidateType.INTERNAL
                ? candidateRepository.existsByDemandIdAndEmployeeIdAndRemovedFalse(targetDemandId, candidate.getEmployee().getId())
                : candidateRepository.existsByDemandIdAndExternalPersonIdAndRemovedFalse(targetDemandId, candidate.getExternalPerson().getId());
        if (duplicate) {
            throw new IllegalStateException(CandidateViewBuilder.personName(candidate) + " is already a candidate on " + target.getCode() + ".");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        candidate.setDemand(target);
        candidate.setLastChangeAt(now);
        candidateRepository.save(candidate);
        String name = CandidateViewBuilder.personName(candidate);
        historyRecorder.record(source, DemandHistoryAction.CANDIDATE_MOVED, "candidates", source.getCode(), target.getCode(),
                null, name, user, actorName, now);
        historyRecorder.record(target, DemandHistoryAction.CANDIDATE_MOVED, "candidates", source.getCode(), target.getCode(),
                null, name, user, actorName, now.plus(1, ChronoUnit.MICROS));
        if (placed) {
            source.setFilledPositions(Math.max(0, source.getFilledPositions() - 1));
            target.setFilledPositions(target.getFilledPositions() + 1);
            historyRecorder.recalculateStatus(source, user, actorName, now.plus(2, ChronoUnit.MICROS));
            historyRecorder.recalculateStatus(target, user, actorName, now.plus(3, ChronoUnit.MICROS));
            demandRepository.save(source);
            demandRepository.save(target);
        }
        audit(candidate, AuditAction.UPDATE, user, "Moved candidate from " + source.getCode() + " to " + target.getCode());
        return viewBuilder.build(target, candidate);
    }

    // ---------------------------------------------------------------- manual candidate status

    public CandidateDto setPipelineStatus(UUID demandId, UUID candidateId, CandidatePipelineStatus status) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        Demand demand = lockDemandForChange(demandId, user);
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate not found.");
        CandidatePipelineStatus old = candidate.getPipelineStatus();
        if (old == status) {
            return viewBuilder.build(demand, candidate);
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        candidate.setPipelineStatus(status);
        candidate.setLastChangeAt(now);
        candidateRepository.save(candidate);
        historyRecorder.record(demand, DemandHistoryAction.FIELD_CHANGED,
                "Status of " + CandidateViewBuilder.personName(candidate), old.label(), status.label(), null, null, user,
                actorName, now);
        audit(candidate, AuditAction.UPDATE, user, "Changed candidate status to " + status.label() + " on " + demand.getCode());
        return viewBuilder.build(demand, candidate);
    }

    // ---------------------------------------------------------------- manual removal (candidate added by mistake)

    /**
     * Removes a candidacy that was added to the demand by mistake. This is not a recruitment outcome: no reason is
     * asked, the status is not changed and the withdrawal flow is not used. The candidacy row, its steps, feedback and
     * notes are kept (marked removed and hidden), the person's master record and their other demands are untouched.
     * Removing a placed candidate frees the position it filled.
     */
    public void removeFromDemand(UUID demandId, UUID candidateId) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        Demand demand = lockDemandForChange(demandId, user);
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate not found.");
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        candidate.setRemoved(true);
        candidate.setRemovedAt(now);
        candidate.setRemovedBy(user);
        candidate.setRemovedByName(actorName);
        candidateRepository.save(candidate);
        String type = candidate.getType() == CandidateType.INTERNAL ? "Internal" : "External";
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_REMOVED_FROM_DEMAND, "candidates",
                CandidateViewBuilder.personName(candidate), null, null,
                type + " candidate added by mistake. Status before removal: " + candidate.getStatus().name()
                        + ". Candidate record " + candidate.getId() + ".",
                user, actorName, now);
        if (candidate.getStatus() == CandidateStatus.PLACED) {
            int oldFilled = demand.getFilledPositions();
            demand.setFilledPositions(Math.max(0, oldFilled - 1));
            historyRecorder.record(demand, DemandHistoryAction.FIELD_CHANGED, "filledPositions", String.valueOf(oldFilled),
                    String.valueOf(demand.getFilledPositions()), null,
                    "A placed candidate was removed, so the position is open again.", user, actorName,
                    now.plus(1, ChronoUnit.MICROS));
            historyRecorder.recalculateStatus(demand, user, actorName, now.plus(2, ChronoUnit.MICROS));
            demandRepository.save(demand);
        }
        audit(candidate, AuditAction.DELETE, user, "Removed candidate added by mistake from " + demand.getCode());
    }

    // ---------------------------------------------------------------- steps (F-01, F-02, F-05 to F-07, N-01)

    public CandidateDto addStep(UUID demandId, UUID candidateId, CandidateStepRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        Demand demand = lockDemandForChange(demandId, user);
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate not found.");
        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        String name = CandidateViewBuilder.personName(candidate);
        CandidateStepType type = request.type();
        if (type == null) {
            throw new IllegalArgumentException("Unsupported step type.");
        }

        CandidateStep step;
        String historyNote = "for " + name;
        List<User> invited = List.of();
        String allocationWarning = null;
        switch (type) {
            case MEETING -> {
                String kind = CandidateFormat.trimToNull(request.kind());
                if (kind == null || !MEETING_KINDS.contains(kind)) {
                    throw new IllegalArgumentException("Choose the kind of meeting.");
                }
                if (request.when() == null) {
                    throw new IllegalArgumentException("Enter the date and time.");
                }
                LocalDateTime when = request.when().truncatedTo(ChronoUnit.MINUTES);
                invited = participants(request.participantUserIds());
                List<String> guests = guests(request.externalParticipants());
                if (invited.size() + guests.size() == 0) {
                    throw new IllegalArgumentException("Add at least one participant.");
                }
                assertOpen(candidate);
                step = newStep(candidate, CandidateStepType.MEETING, kind, CandidateStepStatus.SCHEDULED, user, actorName, now);
                step.setMeetingAt(when);
                int order = 0;
                for (User invitedUser : invited) {
                    MeetingParticipant participant = new MeetingParticipant();
                    participant.setStep(step);
                    participant.setUser(invitedUser);
                    participant.setName(accessPolicy.displayName(invitedUser));
                    participant.setRoleLabel(roleLabel(invitedUser.getRole()));
                    participant.setExternal(false);
                    participant.setSortOrder(order++);
                    step.getParticipants().add(participant);
                }
                for (String guest : guests) {
                    MeetingParticipant participant = new MeetingParticipant();
                    participant.setStep(step);
                    participant.setName(guest);
                    participant.setExternal(true);
                    participant.setSortOrder(order++);
                    step.getParticipants().add(participant);
                }
                historyNote = "for " + name + ", scheduled " + CandidateFormat.dateTime(when);
            }
            case START -> {
                if (request.startDate() == null) {
                    throw new IllegalArgumentException("Enter the start date.");
                }
                Integer pct = request.allocationPct();
                if (pct == null || pct < 1 || pct > 100) {
                    throw new IllegalArgumentException("Allocation % must be between 1 and 100.");
                }
                String blocker = placementBlocker(candidate, demand);
                if (blocker != null) {
                    throw new IllegalStateException(blocker);
                }
                step = newStep(candidate, CandidateStepType.START, "Start date confirmed", CandidateStepStatus.CONFIRMED,
                        user, actorName, now);
                step.setStartDate(request.startDate());
                step.setAllocationPct(pct);
            }
            case OFFER, CUSTOM -> {
                String title = type == CandidateStepType.OFFER ? "Offer sent" : CandidateFormat.trimToNull(request.title());
                if (title == null) {
                    throw new IllegalArgumentException("Enter the step name.");
                }
                if (request.date() == null) {
                    throw new IllegalArgumentException("Enter the date.");
                }
                if (type == CandidateStepType.OFFER) {
                    assertCanOffer(candidate);
                } else {
                    assertOpen(candidate);
                }
                step = newStep(candidate, type, title,
                        type == CandidateStepType.OFFER ? CandidateStepStatus.SENT : CandidateStepStatus.TO_DO,
                        user, actorName, now);
                step.setStepDate(request.date());
            }
            case CV -> {
                if (request.date() == null) {
                    throw new IllegalArgumentException("Enter the date sent.");
                }
                assertOpen(candidate);
                if (hasStep(candidate, CandidateStepType.CV)) {
                    throw new IllegalStateException("CV sent is already recorded for this candidate.");
                }
                String sentTo = CandidateFormat.trimToNull(request.sentTo());
                step = newStep(candidate, CandidateStepType.CV, "CV sent", CandidateStepStatus.WAITING_FOR_FEEDBACK,
                        user, actorName, now);
                step.setStepDate(request.date());
                step.setSentTo(sentTo);
                if (sentTo != null) {
                    historyNote = historyNote + ", sent to " + sentTo;
                }
            }
            default -> throw new IllegalArgumentException("Unsupported step type.");
        }

        candidate.getSteps().add(step);
        candidate.setLastChangeAt(now);
        stepRepository.save(step);
        String note = CandidateFormat.trimToNull(request.note());
        if (note != null) {
            saveNote(demand, candidate, step, user, actorName, note, null, now);
        }
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_STEP_ADDED, "candidateSteps", null,
                step.getTitle(), null, historyNote, user, actorName, now);

        if (type == CandidateStepType.START) {
            allocationWarning = place(demand, candidate, step, user, actorName, now);
        }
        audit(candidate, AuditAction.CREATE, user, "Added a " + type + " step on " + demand.getCode());
        notifyInvited(demand, step, invited);

        CandidateDto view = viewBuilder.build(demand, candidate);
        return allocationWarning == null ? view : view.withAllocationWarning(allocationWarning);
    }

    // ---------------------------------------------------------------- outcomes (F-03, F-04)

    public CandidateDto recordOutcome(UUID demandId, UUID candidateId, UUID stepId, CandidateOutcomeRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManageFlow(user);
        Demand demand = lockDemandForChange(demandId, user);
        Candidate candidate = lockCandidate(candidateId, demandId, "Candidate step not found.");
        CandidateStep step = candidate.getSteps().stream()
                .filter(item -> item.getId().equals(stepId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Candidate step not found."));

        OutcomeRule rule = OUTCOME_RULES.get(step.getType());
        CandidateStepStatus outcome = CandidateStepStatus.fromLabel(step.getType(), request.outcome()).orElse(null);
        if (rule == null || outcome == null || !rule.options().contains(outcome)) {
            throw new IllegalArgumentException("Choose a valid outcome for this step.");
        }
        String reason = CandidateFormat.trimToNull(request.reason());
        String note = CandidateFormat.trimToNull(request.note());
        boolean negative = outcome == rule.negative();
        // A cancelled meeting or a withdrawn offer ends only the step. It needs a reason but never closes the candidate.
        boolean stopped = outcome == rule.stopped();
        if ((negative || stopped) && reason == null) {
            throw new IllegalArgumentException("Write the reason.");
        }
        String decision = CandidateFormat.trimToNull(request.decision());
        if (negative && !"CONTINUE".equals(decision) && !"CLOSE".equals(decision)) {
            throw new IllegalArgumentException("Choose to continue the process or close the candidate.");
        }
        String blocker = outcomeBlocker(candidate, step, rule);
        if (blocker == null) {
            blocker = outcomeTimingBlocker(step, outcome);
        }
        if (blocker != null) {
            throw new IllegalStateException(blocker);
        }

        String actorName = accessPolicy.displayName(user);
        Instant now = DemandHistoryRecorder.now();
        String name = CandidateViewBuilder.personName(candidate);
        CandidateStepStatus previous = step.getStatus();
        step.setStatus(outcome);
        addChange(step, previous, outcome, user, actorName, now);
        String noteText = negative || stopped ? "Reason: " + reason : note;
        if (noteText != null) {
            saveNote(demand, candidate, step, user, actorName, noteText, null, now);
        }
        candidate.setLastChangeAt(now);
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_STEP_STATUS_CHANGED, "candidateSteps",
                previous.label(), "\"" + step.getTitle() + "\" for " + name + " changed to " + outcome.label(),
                null, noteText, user, actorName, now);
        if (negative && "CLOSE".equals(decision)) {
            close(candidate, CandidateStatus.REJECTED, reason, user, actorName, now);
            historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_REJECTED, "candidates", null, name,
                    null, reason, user, actorName, now);
            audit(candidate, AuditAction.REJECT, user, "Rejected candidate on " + demand.getCode());
        }
        // Step and candidate are managed (locked above); the new change is persisted by cascade at flush. No merge:
        // merging would not copy the state of the immutable change row.
        audit(candidate, AuditAction.UPDATE, user, "Recorded a " + step.getType() + " outcome on " + demand.getCode());
        return viewBuilder.build(demand, candidate);
    }

    // ---------------------------------------------------------------- placement (F-06, F-07, H-02, M-04)

    /**
     * Fills one open position with the candidate (the demand row is locked by the caller, so two placements cannot
     * fill the same position). Returns a warning when the person is now allocated over 100% (M-04: warn, do not block).
     */
    private String place(Demand demand, Candidate candidate, CandidateStep start, User user, String actorName, Instant now) {
        String name = CandidateViewBuilder.personName(candidate);
        int oldFilled = demand.getFilledPositions();
        candidate.setStatus(CandidateStatus.PLACED);
        demand.setFilledPositions(oldFilled + 1);
        historyRecorder.record(demand, DemandHistoryAction.CANDIDATE_PLACED, "filledPositions", String.valueOf(oldFilled),
                name, null, "Start date " + CandidateFormat.date(start.getStartDate()) + ", " + start.getAllocationPct()
                        + "%. Filled " + oldFilled + " ? " + demand.getFilledPositions() + ", "
                        + demand.getOpenPositions() + " still open.",
                user, actorName, now);
        historyRecorder.recalculateStatus(demand, user, actorName, now.plus(1, ChronoUnit.MICROS));
        demandRepository.save(demand);
        audit(candidate, AuditAction.APPROVE, user, "Placed candidate on " + demand.getCode());

        if (candidate.getType() != CandidateType.INTERNAL) {
            return null;
        }
        int total = allocationReader.read().totalPct(candidate.getEmployee().getId(), candidate.getId())
                + start.getAllocationPct();
        return total > 100
                ? name + " is now allocated " + total + "% in total. Check the allocations in Module 2."
                : null;
    }

    static String placementBlocker(Candidate candidate, Demand demand) {
        if (candidate.getStatus() == CandidateStatus.PLACED || hasStep(candidate, CandidateStepType.START)) {
            return "This candidate is already placed.";
        }
        if (!candidate.isOpen()) {
            return CLOSED_STEPS;
        }
        if (candidate.getType() == CandidateType.INTERNAL) {
            if (!hasStepWithStatus(candidate, CandidateStepType.MEETING, CandidateStepStatus.DONE_POSITIVE)) {
                return "Needs a meeting with the status \"Done: positive\".";
            }
        } else if (!hasStepWithStatus(candidate, CandidateStepType.OFFER, CandidateStepStatus.ACCEPTED)) {
            return "Needs an offer with the status \"Accepted\".";
        }
        if (demand.getOpenPositions() <= 0) {
            return "No open position on this demand. A placement must fill an open position. Add a position first.";
        }
        return null;
    }

    // ---------------------------------------------------------------- rules

    private static String outcomeBlocker(Candidate candidate, CandidateStep step, OutcomeRule rule) {
        if (!candidate.isOpen()) {
            return "This candidate is closed. No decisions can be recorded.";
        }
        if (step.getType() == CandidateStepType.OFFER && candidate.getType() != CandidateType.EXTERNAL) {
            return "An offer is only for external candidates.";
        }
        if (rule.stopped() != null && step.getStatus() == rule.stopped()) {
            return "This step is already " + rule.stopped().label().toLowerCase(Locale.ROOT) + ".";
        }
        if (step.getStatus() != rule.from()) {
            return "The outcome of this step is already recorded.";
        }
        return null;
    }

    /** The outcome is recorded now, so it cannot be dated before the meeting it completes or the offer it answers. */
    private static String outcomeTimingBlocker(CandidateStep step, CandidateStepStatus outcome) {
        if (step.getType() == CandidateStepType.MEETING
                && (outcome == CandidateStepStatus.DONE_POSITIVE || outcome == CandidateStepStatus.DONE_NEGATIVE)
                && step.getMeetingAt() != null && step.getMeetingAt().isAfter(LocalDateTime.now())) {
            return "This meeting is scheduled for " + CandidateFormat.date(step.getMeetingAt().toLocalDate()) + ", "
                    + CandidateFormat.when(step.getMeetingAt()).substring(11) + ". It cannot be completed before that.";
        }
        if (step.getType() == CandidateStepType.OFFER
                && (outcome == CandidateStepStatus.ACCEPTED || outcome == CandidateStepStatus.DECLINED)
                && step.getStepDate() != null && step.getStepDate().isAfter(LocalDate.now())) {
            return "The offer is dated " + CandidateFormat.date(step.getStepDate())
                    + ". The answer cannot be recorded before the offer was sent.";
        }
        return null;
    }

    private static void assertOpen(Candidate candidate) {
        if (!candidate.isOpen()) {
            throw new IllegalStateException(CLOSED_STEPS);
        }
    }

    /** An offer is only for external candidates, and only one offer can be open (Sent or Accepted) at a time. */
    private static void assertCanOffer(Candidate candidate) {
        assertOpen(candidate);
        if (candidate.getType() != CandidateType.EXTERNAL) {
            throw new IllegalStateException("An offer is only for external candidates.");
        }
        if (hasStepWithStatus(candidate, CandidateStepType.OFFER, CandidateStepStatus.SENT)
                || hasStepWithStatus(candidate, CandidateStepType.OFFER, CandidateStepStatus.ACCEPTED)) {
            throw new IllegalStateException("An offer is already sent or accepted.");
        }
    }

    private static boolean hasStep(Candidate candidate, CandidateStepType type) {
        return candidate.getSteps().stream().anyMatch(step -> step.getType() == type);
    }

    private static boolean hasStepWithStatus(Candidate candidate, CandidateStepType type, CandidateStepStatus status) {
        return candidate.getSteps().stream().anyMatch(step -> step.getType() == type && step.getStatus() == status);
    }

    private boolean isOverBudget(Demand demand, Candidate candidate) {
        // Internal cost range codes do not exist in Module 2 yet, so only external rates can be over budget today.
        CandidateBudgetDto budget = CandidateViewBuilder.budget(demand, candidate.getType(), null, candidate.getExpectedDailyRate());
        return budget != null && budget.over();
    }

    // ---------------------------------------------------------------- availability (M-01, C-03)

    record Availability(String text, int rank, boolean show) {
    }

    /** Bench, free capacity now, or an allocation that ends within 3 months. Module 3 placements have no end date. */
    static Availability availability(Employee employee, CandidateAllocationReader.Snapshot allocations, LocalDate today) {
        int capacity = employee.getContractFte() == null ? 100
                : employee.getContractFte().multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValue();
        int placed = allocations.placedPct(employee.getId(), null);
        int allocated = allocations.module2Pct(employee.getId()) + placed;
        if (allocated <= 0) {
            return new Availability("Bench, " + capacity + "% free now", 0, true);
        }
        if (allocated < capacity) {
            return new Availability((capacity - allocated) + "% free now (" + allocated + "% allocated)", 1, true);
        }
        LocalDate freeFrom = placed > 0 ? null : allocations.module2FreeFrom(employee.getId());
        if (freeFrom != null && !freeFrom.isAfter(today.plusDays(FREE_FROM_HORIZON_DAYS))) {
            return new Availability("Free from " + CandidateFormat.date(freeFrom), 2, true);
        }
        return new Availability("Fully allocated", 3, false);
    }

    private static Specification<Employee> poolSpecification() {
        return (root, query, cb) -> {
            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("manager", JoinType.LEFT);
            }
            return cb.and(
                    cb.equal(root.get("employmentStatus"), EmploymentStatus.ACTIVE),
                    root.get("workforceType").in(POOL_TYPES));
        };
    }

    // ---------------------------------------------------------------- people

    /** Recruiters by display name: active HR BP / Recruiter users (M-02b). */
    private Map<String, User> recruiters() {
        Map<String, User> byName = new TreeMap<>();
        for (User user : userRepository.findByRole(UserRole.HR_BUSINESS_PARTNER)) {
            if (user.isActive()) {
                byName.putIfAbsent(accessPolicy.displayName(user), user);
            }
        }
        return byName;
    }

    private List<User> participants(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = new ArrayList<>(new LinkedHashSet<>(userIds));
        if (ids.contains(null)) {
            throw new IllegalArgumentException("Unknown participant.");
        }
        Map<UUID, User> found = new HashMap<>();
        userRepository.findAllById(ids).forEach(user -> found.put(user.getId(), user));
        List<User> users = new ArrayList<>();
        for (UUID id : ids) {
            User user = found.get(id);
            if (user == null || !user.isActive()) {
                throw new IllegalArgumentException("Unknown participant.");
            }
            users.add(user);
        }
        return users;
    }

    private static List<String> guests(List<String> names) {
        if (names == null) {
            return List.of();
        }
        return names.stream()
                .map(CandidateFormat::trimToNull)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    /** Role shown next to a meeting participant. */
    static String roleLabel(UserRole role) {
        return switch (role) {
            case LINE_MANAGER -> "Line manager";
            case HR_BUSINESS_PARTNER -> "HR BP / Recruiter";
            case HR -> "HR";
            case PMO -> "Demand manager";
            case ADMIN -> "Administrator";
            case EMPLOYEE -> "Employee";
        };
    }

    private void notifyInvited(Demand demand, CandidateStep meeting, List<User> invited) {
        for (User user : invited) {
            notificationService.send(user.getId(), user, NotificationType.WORKFLOW,
                    "Meeting on " + demand.getCode(),
                    meeting.getTitle() + " on " + CandidateFormat.dateTime(meeting.getMeetingAt())
                            + ". Open \"My meetings\" to see it and add your feedback after the meeting.",
                    NotificationPriority.MEDIUM);
        }
    }

    // ---------------------------------------------------------------- persistence helpers

    private static Candidate newCandidate(Demand demand, CandidateType type, CandidateSource source, User user, Instant now) {
        Candidate candidate = new Candidate();
        candidate.setDemand(demand);
        candidate.setType(type);
        candidate.setSource(source);
        candidate.setStatus(CandidateStatus.IN_PROCESS);
        candidate.setLastChangeAt(now);
        candidate.setCreatedBy(user);
        return candidate;
    }

    private static CandidateStep newStep(Candidate candidate, CandidateStepType type, String title,
            CandidateStepStatus status, User user, String actorName, Instant now) {
        CandidateStep step = new CandidateStep();
        step.setCandidate(candidate);
        step.setType(type);
        step.setTitle(title);
        step.setStatus(status);
        step.setSortOrder(candidate.getSteps().stream().mapToInt(CandidateStep::getSortOrder).max().orElse(-1) + 1);
        step.setResponsible(user);
        step.setResponsibleName(actorName);
        addChange(step, null, status, user, actorName, now);
        return step;
    }

    private static void addChange(CandidateStep step, CandidateStepStatus oldStatus, CandidateStepStatus newStatus,
            User user, String actorName, Instant now) {
        CandidateStepChange change = new CandidateStepChange();
        change.setStep(step);
        change.setOldStatus(oldStatus);
        change.setNewStatus(newStatus);
        change.setChangedBy(user);
        change.setChangedByName(actorName);
        change.setChangedAt(now);
        step.getChanges().add(change);
    }

    private static void close(Candidate candidate, CandidateStatus status, String reason, User user, String actorName,
            Instant now) {
        candidate.setStatus(status);
        candidate.setCloseReason(reason);
        candidate.setClosedBy(user);
        candidate.setClosedByName(actorName);
        candidate.setClosedAt(now);
        candidate.setLastChangeAt(now);
    }

    /** Append-only candidate or step note (N-05 to N-07). Joins the caller's transaction. */
    public DemandNote saveNote(Demand demand, Candidate candidate, CandidateStep step, User author, String authorName,
            String text, String kind, Instant at) {
        DemandNote note = new DemandNote();
        note.setDemand(demand);
        note.setCandidate(candidate);
        note.setStep(step);
        note.setKind(kind);
        note.setAuthor(author);
        note.setAuthorName(authorName);
        note.setText(text);
        note.setCreatedAt(at);
        return noteRepository.save(note);
    }

    private void audit(Candidate candidate, AuditAction action, User user, String comment) {
        auditService.log(AUDIT_ENTITY, candidate.getId(), action, user, null, null, comment);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    // ---------------------------------------------------------------- lookups

    /** Readers see demands that are not deleted; the demand manager also sees deleted ones (D-07). */
    private Demand findVisibleDemand(UUID demandId, User user) {
        Demand demand = demandRepository.findById(demandId).orElseThrow(() -> demandNotFound(demandId));
        if (demand.isDeleted() && !accessPolicy.canManage(user)) {
            throw demandNotFound(demandId);
        }
        return demand;
    }

    private Demand findDemandForChange(UUID demandId, User user) {
        Demand demand = findVisibleDemand(demandId, user);
        if (demand.isDeleted()) {
            throw new IllegalStateException(DELETED_MESSAGE);
        }
        return demand;
    }

    /** Locks the demand row first, so position and candidate changes on one demand run one after the other. */
    private Demand lockDemandForChange(UUID demandId, User user) {
        Demand demand = demandRepository.findByIdForUpdate(demandId).orElseThrow(() -> demandNotFound(demandId));
        if (demand.isDeleted()) {
            if (!accessPolicy.canManage(user)) {
                throw demandNotFound(demandId);
            }
            throw new IllegalStateException(DELETED_MESSAGE);
        }
        return demand;
    }

    private Candidate lockCandidate(UUID candidateId, UUID demandId, String notFoundMessage) {
        return candidateRepository.findByIdAndDemandIdForUpdate(candidateId, demandId)
                .orElseThrow(() -> new ResourceNotFoundException(notFoundMessage));
    }

    private static ResourceNotFoundException demandNotFound(UUID demandId) {
        return new ResourceNotFoundException("Demand not found: " + demandId);
    }
}



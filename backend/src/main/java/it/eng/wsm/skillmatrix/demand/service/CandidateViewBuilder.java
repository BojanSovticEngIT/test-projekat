package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.dto.response.CandidateBudgetDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateFullAllocationDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateNoteDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateOtherDemandDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateParticipantDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateStepChangeDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateStepDto;
import it.eng.wsm.skillmatrix.demand.dto.response.MeetingSummaryDto;
import it.eng.wsm.skillmatrix.demand.entity.Candidate;
import it.eng.wsm.skillmatrix.demand.entity.CandidateStep;
import it.eng.wsm.skillmatrix.demand.entity.CandidateStepChange;
import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandNote;
import it.eng.wsm.skillmatrix.demand.entity.MeetingParticipant;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import it.eng.wsm.skillmatrix.demand.repository.CandidateRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandNoteRepository;
import it.eng.wsm.skillmatrix.entity.Employee;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Builds the candidate views of the API ({@code DemandCandidate}, {@code MeetingSummary}). The other demands of the
 * person, the budget check and the allocation values are derived when read; nothing is written back.
 */
@Component
@RequiredArgsConstructor
public class CandidateViewBuilder {

    static final String NO_STEPS = "No steps yet";

    private static final Map<CandidateStatus, Integer> CROSS_RANK = Map.of(
            CandidateStatus.IN_PROCESS, 0,
            CandidateStatus.PLACED, 1,
            CandidateStatus.REJECTED, 2,
            CandidateStatus.WITHDRAWN, 3);

    private final CandidateRepository candidateRepository;
    private final DemandNoteRepository noteRepository;
    private final CandidateAllocationReader allocationReader;

    // ---------------------------------------------------------------- full views

    public CandidateDto build(Demand demand, Candidate candidate) {
        return build(demand, List.of(candidate)).get(0);
    }

    public List<CandidateDto> build(Demand demand, List<Candidate> candidates) {
        if (candidates.isEmpty()) {
            return List.of();
        }
        NotesIndex notes = loadNotes(candidates.stream().map(Candidate::getId).toList());
        CandidateAllocationReader.Snapshot allocations = allocationReader.read();
        OtherDemandsIndex others = loadOtherDemands(candidates);

        List<CandidateDto> result = new ArrayList<>();
        for (Candidate candidate : candidates) {
            List<CandidateOtherDemandDto> otherDemands = others.of(candidate, demand.getId());
            Integer currentPct = null;
            CandidateFullAllocationDto fullAllocation = null;
            if (candidate.getType() == CandidateType.INTERNAL) {
                UUID employeeId = candidate.getEmployee().getId();
                int total = allocations.totalPct(employeeId, candidate.getId());
                currentPct = total;
                // M-05: only for a candidate in process, once a placement elsewhere makes the person fully allocated.
                List<String> placedOn = otherDemands.stream()
                        .filter(link -> link.candidateStatus() == CandidateStatus.PLACED)
                        .map(CandidateOtherDemandDto::demandCode)
                        .toList();
                if (candidate.isOpen() && !placedOn.isEmpty() && total >= 100) {
                    fullAllocation = new CandidateFullAllocationDto(total, placedOn);
                }
            }
            result.add(toDto(demand, candidate, notes, otherDemands, currentPct, fullAllocation));
        }
        return result;
    }

    /**
     * What a meeting participant without demand access gets back (R-03, N-03): the candidate summary and that meeting
     * only. No other steps, notes, budget or other demands.
     */
    public CandidateDto participantView(Candidate candidate, CandidateStep meeting) {
        NotesIndex notes = loadNotes(List.of(candidate.getId()));
        return new CandidateDto(candidate.getId(), candidate.getType(), personName(candidate), detail(candidate),
                null, null, null, null, null, null, null, candidate.getSource().label(), null,
                currentStep(candidate), candidate.getStatus(), candidate.getPipelineStatus(), null, null, null, candidate.getLastChangeAt(),
                List.of(toStepDto(meeting, notes.ofStep(meeting.getId()))), List.of(), null, null, null, null);
    }

    public List<MeetingSummaryDto> meetingSummaries(List<CandidateStep> meetings) {
        if (meetings.isEmpty()) {
            return List.of();
        }
        NotesIndex notes = loadNotes(meetings.stream().map(step -> step.getCandidate().getId()).distinct().toList());
        return meetings.stream()
                .map(step -> {
                    Candidate candidate = step.getCandidate();
                    Demand demand = candidate.getDemand();
                    return new MeetingSummaryDto(demand.getId(), demand.getCode(), demand.getTitle(),
                            new MeetingSummaryDto.CandidateSummary(candidate.getId(), personName(candidate),
                                    candidate.getType(), detail(candidate), candidate.getStatus()),
                            toStepDto(step, notes.ofStep(step.getId())));
                })
                .toList();
    }

    // ---------------------------------------------------------------- derived values

    /** The step that changed last: "Title: Status", or "Starts 5 Mar 2027" for a confirmed start. */
    public static String currentStep(Candidate candidate) {
        CandidateStep latest = candidate.getSteps().stream()
                .max(Comparator.comparing(CandidateViewBuilder::lastChangeAt)
                        .thenComparingInt(CandidateStep::getSortOrder))
                .orElse(null);
        if (latest == null) {
            return NO_STEPS;
        }
        if (latest.getType() == CandidateStepType.START) {
            return "Starts " + CandidateFormat.date(latest.getStartDate());
        }
        return latest.getTitle() + ": " + latest.getStatus().label();
    }

    /**
     * M-02c. Internal: cost range code against the max range code. External: expected daily rate against the max
     * daily rate. Null when the demand has no limit or the candidate has no cost data, so no comparison is invented.
     */
    public static CandidateBudgetDto budget(Demand demand, CandidateType type, String costRange, Integer dailyRate) {
        if (type == CandidateType.INTERNAL) {
            Integer actual = rangeNumber(costRange);
            Integer max = rangeNumber(demand.getMaxRangeCode());
            if (actual == null || max == null) {
                return null;
            }
            return new CandidateBudgetDto(actual > max, costRange, demand.getMaxRangeCode());
        }
        Integer max = demand.getMaxDailyRate();
        if (dailyRate == null || dailyRate <= 0 || max == null || max <= 0) {
            return null;
        }
        return new CandidateBudgetDto(dailyRate > max, dailyRate + " EUR/day", max + " EUR/day");
    }

    public static String personName(Candidate candidate) {
        if (candidate.getType() == CandidateType.INTERNAL) {
            return employeeName(candidate.getEmployee());
        }
        return candidate.getExternalPerson().getFullName();
    }

    public static String detail(Candidate candidate) {
        if (candidate.getType() == CandidateType.INTERNAL) {
            String title = candidate.getEmployee().getJobTitle();
            return title == null || title.isBlank() ? "Employee" : title;
        }
        return "Recruiter " + Objects.requireNonNullElse(candidate.getRecruiterName(), "not set");
    }

    public static String employeeName(Employee employee) {
        if (employee == null) {
            return null;
        }
        return (employee.getFirstName() + " " + employee.getLastName()).trim();
    }

    public static Integer placedAllocationPct(Candidate candidate) {
        if (candidate.getStatus() != CandidateStatus.PLACED) {
            return null;
        }
        return candidate.getSteps().stream()
                .filter(step -> step.getType() == CandidateStepType.START)
                .map(CandidateStep::getAllocationPct)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    // ---------------------------------------------------------------- mapping

    private CandidateDto toDto(Demand demand, Candidate candidate, NotesIndex notes,
            List<CandidateOtherDemandDto> otherDemands, Integer currentPct, CandidateFullAllocationDto fullAllocation) {
        boolean internal = candidate.getType() == CandidateType.INTERNAL;
        Employee employee = candidate.getEmployee();
        String costRange = null; // No cost range code exists in Module 2 yet (M2 OQ-06); the budget check stays unknown.
        List<CandidateStepDto> steps = candidate.getSteps().stream()
                .map(step -> toStepDto(step, notes.ofStep(step.getId())))
                .toList();
        return new CandidateDto(
                candidate.getId(),
                candidate.getType(),
                personName(candidate),
                detail(candidate),
                internal ? employee.getId() : null,
                currentPct,
                costRange,
                internal ? employeeName(employee.getManager()) : null,
                internal ? null : candidate.getExternalPerson().getId(),
                internal ? null : candidate.getExternalPerson().getEmail(),
                candidate.getRecruiterName(),
                candidate.getSource().label(),
                candidate.getExpectedDailyRate(),
                currentStep(candidate),
                candidate.getStatus(),
                candidate.getPipelineStatus(),
                candidate.getCloseReason(),
                candidate.getClosedByName(),
                candidate.getClosedAt(),
                candidate.getLastChangeAt(),
                steps,
                notes.ofCandidate(candidate.getId()),
                otherDemands,
                budget(demand, candidate.getType(), costRange, candidate.getExpectedDailyRate()),
                fullAllocation,
                null);
    }

    CandidateStepDto toStepDto(CandidateStep step, List<CandidateNoteDto> notes) {
        List<CandidateStepChangeDto> changes = step.getChanges().stream()
                .map(change -> new CandidateStepChangeDto(
                        change.getNewStatus().label(), change.getChangedAt(), change.getChangedByName()))
                .toList();
        List<CandidateParticipantDto> participants = step.getType() == CandidateStepType.MEETING
                ? step.getParticipants().stream().map(participant -> toParticipantDto(step, participant)).toList()
                : null;
        return new CandidateStepDto(
                step.getId(),
                step.getType(),
                step.getTitle(),
                step.getStatus().label(),
                step.getStepDate(),
                CandidateFormat.when(step.getMeetingAt()),
                step.getSentTo(),
                step.getStartDate(),
                step.getAllocationPct(),
                step.getResponsibleName(),
                changes,
                notes,
                participants);
    }

    private static CandidateParticipantDto toParticipantDto(CandidateStep step, MeetingParticipant participant) {
        boolean hasFeedback = participant.getVerdict() != null;
        return new CandidateParticipantDto(
                participant.getUser() != null ? participant.getUser().getId() : null,
                participant.getName(),
                participant.getRoleLabel(),
                participant.isExternal(),
                hasFeedback ? participant.getVerdict().apiValue() : null,
                participant.getFeedback(),
                participant.getFeedbackAt(),
                hasFeedback ? participant.getName() : null,
                hasFeedback ? step.getId() : null);
    }

    static CandidateNoteDto toNoteDto(DemandNote note) {
        return new CandidateNoteDto(note.getId(), note.getAuthorName(), note.getAuthor().getId(), note.getCreatedAt(),
                note.getText(), note.getKind());
    }

    private static Instant lastChangeAt(CandidateStep step) {
        List<CandidateStepChange> changes = step.getChanges();
        if (!changes.isEmpty() && changes.get(changes.size() - 1).getChangedAt() != null) {
            return changes.get(changes.size() - 1).getChangedAt();
        }
        return step.getCreatedAt() != null ? step.getCreatedAt() : Instant.EPOCH;
    }

    private static Integer rangeNumber(String code) {
        if (code == null) {
            return null;
        }
        String digits = code.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // ---------------------------------------------------------------- notes and other demands

    private NotesIndex loadNotes(Collection<UUID> candidateIds) {
        Map<UUID, List<CandidateNoteDto>> byCandidate = new HashMap<>();
        Map<UUID, List<CandidateNoteDto>> byStep = new HashMap<>();
        if (!candidateIds.isEmpty()) {
            for (DemandNote note : noteRepository.findCandidateNotes(candidateIds)) {
                if (note.getStep() != null) {
                    byStep.computeIfAbsent(note.getStep().getId(), key -> new ArrayList<>()).add(toNoteDto(note));
                } else {
                    byCandidate.computeIfAbsent(note.getCandidate().getId(), key -> new ArrayList<>()).add(toNoteDto(note));
                }
            }
        }
        return new NotesIndex(byCandidate, byStep);
    }

    private record NotesIndex(Map<UUID, List<CandidateNoteDto>> byCandidate, Map<UUID, List<CandidateNoteDto>> byStep) {

        List<CandidateNoteDto> ofCandidate(UUID candidateId) {
            return byCandidate.getOrDefault(candidateId, List.of());
        }

        List<CandidateNoteDto> ofStep(UUID stepId) {
            return byStep.getOrDefault(stepId, List.of());
        }
    }

    /** Every candidacy of the same people (by employee id or external person id, never by name), read once. */
    OtherDemandsIndex loadOtherDemands(Collection<Candidate> candidates) {
        List<UUID> employeeIds = candidates.stream()
                .filter(candidate -> candidate.getEmployee() != null)
                .map(candidate -> candidate.getEmployee().getId())
                .distinct()
                .toList();
        List<UUID> personIds = candidates.stream()
                .filter(candidate -> candidate.getExternalPerson() != null)
                .map(candidate -> candidate.getExternalPerson().getId())
                .distinct()
                .toList();
        return new OtherDemandsIndex(
                employeeIds.isEmpty() ? List.of() : candidateRepository.findByEmployeeIds(employeeIds),
                personIds.isEmpty() ? List.of() : candidateRepository.findByExternalPersonIds(personIds));
    }

    static final class OtherDemandsIndex {

        private final Map<UUID, List<Candidate>> byEmployee = new HashMap<>();
        private final Map<UUID, List<Candidate>> byPerson = new HashMap<>();

        OtherDemandsIndex(List<Candidate> internal, List<Candidate> external) {
            internal.forEach(item -> byEmployee.computeIfAbsent(item.getEmployee().getId(), key -> new ArrayList<>()).add(item));
            external.forEach(item -> byPerson.computeIfAbsent(item.getExternalPerson().getId(), key -> new ArrayList<>()).add(item));
        }

        List<CandidateOtherDemandDto> of(Candidate candidate, UUID exceptDemandId) {
            List<Candidate> same = candidate.getEmployee() != null
                    ? byEmployee.getOrDefault(candidate.getEmployee().getId(), List.of())
                    : byPerson.getOrDefault(candidate.getExternalPerson().getId(), List.of());
            return toLinks(same, exceptDemandId);
        }

        List<CandidateOtherDemandDto> ofEmployee(UUID employeeId, UUID exceptDemandId) {
            return toLinks(byEmployee.getOrDefault(employeeId, List.of()), exceptDemandId);
        }

        List<CandidateOtherDemandDto> ofPerson(UUID personId, UUID exceptDemandId) {
            return toLinks(byPerson.getOrDefault(personId, List.of()), exceptDemandId);
        }

        private static List<CandidateOtherDemandDto> toLinks(List<Candidate> same, UUID exceptDemandId) {
            return same.stream()
                    .filter(other -> !other.getDemand().getId().equals(exceptDemandId))
                    .map(CandidateViewBuilder::toOtherDemand)
                    .sorted(Comparator.comparing((CandidateOtherDemandDto link) -> CROSS_RANK.get(link.candidateStatus()))
                            .thenComparing(CandidateOtherDemandDto::demandCode))
                    .toList();
        }
    }

    static CandidateOtherDemandDto toOtherDemand(Candidate other) {
        Demand demand = other.getDemand();
        return new CandidateOtherDemandDto(
                demand.getId(),
                demand.getCode(),
                demand.getTitle(),
                demand.getStatus(),
                other.getStatus(),
                currentStep(other),
                other.getCloseReason(),
                placedAllocationPct(other));
    }
}


package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.dto.request.DemandAddPositionsRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandCancelPositionsRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandCountryRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandCreateRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandFields;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandNoteRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandSkillRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandUpdateRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandDetailDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandNoteDto;
import it.eng.wsm.skillmatrix.demand.dto.response.HrBusinessPartnerDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandSummaryDto;
import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandCountry;
import it.eng.wsm.skillmatrix.demand.entity.DemandHistory;
import it.eng.wsm.skillmatrix.demand.entity.DemandNote;
import it.eng.wsm.skillmatrix.demand.entity.DemandRequestedSkill;
import it.eng.wsm.skillmatrix.demand.entity.DemandSkill;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import it.eng.wsm.skillmatrix.demand.mapper.DemandMapper;
import it.eng.wsm.skillmatrix.demand.repository.CandidateRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandHistoryRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandNoteRepository;
import it.eng.wsm.skillmatrix.demand.repository.DemandRepository;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.DuplicateExternalIdException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Module 3 demand management: list, details, create, edit, soft delete and restore, positions, hold and resume,
 * notes and history (spec 4.3 to 4.5, 4.8 N-05 to N-07, 4.10).
 * <p>
 * Every change writes the demand history (shown in the UI) and the shared audit log in the same transaction.
 * The audit log gets the demand code and the changed field names only, no field values.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DemandService {

    /** H-03: the fixed list of cancel reasons. "Other" needs a note. */
    public static final List<String> CANCEL_REASONS = List.of(
            "Wrong planning",
            "Budget",
            "Search takes too long",
            "No such people on the market",
            "Client changed scope",
            "Other");

    static final String LANGUAGE_CATEGORY = "Languages";
    static final int MAX_PAGE_SIZE = 100;
    private static final String ENTITY_NAME = "Demand";
    private static final String OTHER_REASON = "Other";
    private static final String DELETED_MESSAGE = "A deleted demand cannot be changed. Restore it first.";

    private final DemandRepository demandRepository;
    private final DemandHistoryRepository historyRepository;
    private final DemandNoteRepository noteRepository;
    private final CandidateRepository candidateRepository;
    private final DemandHistoryRecorder historyRecorder;
    private final SkillRepository skillRepository;
    private final EmployeeRepository employeeRepository;
    private final DemandMapper demandMapper;
    private final DemandAccessPolicy accessPolicy;
    private final AuditService auditService;

    // ---------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public Page<DemandSummaryDto> findAll(String search, DemandStatus status, boolean deleted, Pageable pageable) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertRead(user);
        // D-07: only the demand manager sees the "Deleted" tab.
        if (deleted && !accessPolicy.canManage(user)) {
            throw new AccessDeniedException("You do not have permission to view deleted demands");
        }
        Page<Demand> page = demandRepository.findAll(buildSpecification(search, status, deleted), normalize(pageable));
        Map<UUID, Integer> active = activeCandidateCounts(page.getContent().stream().map(Demand::getId).toList());
        return page.map(demand -> demandMapper.toSummaryDto(demand, active.getOrDefault(demand.getId(), 0)));
    }

    /** All demands that are not deleted, by code. Used by the Excel export. */
    @Transactional(readOnly = true)
    public List<DemandDetailDto> findAllForExport() {
        accessPolicy.assertRead(accessPolicy.currentUser());
        return demandRepository.findAll(Sort.by("code")).stream()
                .filter(demand -> !demand.isDeleted())
                .map(this::toDetail)
                .toList();
    }

    @Transactional(readOnly = true)
    public DemandDetailDto findById(UUID id) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertRead(user);
        Demand demand = findOrThrow(id);
        if (demand.isDeleted() && !accessPolicy.canManage(user)) {
            throw notFound(id);
        }
        return toDetail(demand);
    }

    // ---------------------------------------------------------------- create and edit

    public DemandDetailDto create(DemandCreateRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        validateFields(request);
        String externalId = trimToNull(request.externalId());
        checkDuplicateExternalId(externalId, null, request.force());

        String actorName = accessPolicy.displayName(user);
        Demand demand = new Demand();
        demand.setCode("DEM-%04d".formatted(demandRepository.nextCodeNumber()));
        applyFields(demand, request);
        demand.setRequestedPositions(request.requestedPositions());
        demand.setFilledPositions(0);
        demand.setCancelledPositions(0);
        demand.setStatus(DemandStatus.IN_PROGRESS);
        demand.setOwner(user);
        demand.setOwnerName(actorName);
        // D-15: the original request is kept exactly as received.
        String original = request.originalRequest();
        demand.setOriginalRequest(original != null && !original.isBlank() ? original : null);
        Demand saved = demandRepository.save(demand);

        Instant now = now();
        String noteText = trimToNull(request.notes());
        if (noteText != null) {
            saveNote(saved, user, actorName, noteText, now);
        }
        boolean fromEmail = saved.getOriginalRequest() != null;
        String autofillNote = null;
        if (fromEmail) {
            int filled = request.autofilledFields() != null ? request.autofilledFields() : 0;
            autofillNote = "Autofill filled " + filled + " field" + (filled == 1 ? "" : "s") + ".";
        }
        history(saved, DemandHistoryAction.CREATED, "source", null, fromEmail ? "EMAIL" : "MANUAL",
                null, autofillNote, user, actorName, now);
        audit(saved, AuditAction.CREATE, user, "Created " + saved.getCode());
        return toDetail(saved);
    }

    public DemandDetailDto update(UUID id, DemandUpdateRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        Demand demand = findForUpdateOrThrow(id);
        assertNotDeleted(demand);
        validateFields(request);
        checkDuplicateExternalId(trimToNull(request.externalId()), demand.getId(), request.force());

        DemandFieldSnapshot before = DemandFieldSnapshot.of(demand);
        applyFields(demand, request);
        List<DemandFieldSnapshot.FieldChange> changes = before.changesTo(DemandFieldSnapshot.of(demand));

        // One history entry for each changed field. Nothing is written when nothing changed (D-06, H-06).
        if (!changes.isEmpty()) {
            String actorName = accessPolicy.displayName(user);
            Instant at = now();
            for (DemandFieldSnapshot.FieldChange change : changes) {
                history(demand, DemandHistoryAction.FIELD_CHANGED, change.label(), change.oldText(), change.newText(),
                        null, null, user, actorName, at);
                at = at.plus(1, ChronoUnit.MICROS);
            }
            demandRepository.save(demand);
            audit(demand, AuditAction.UPDATE, user, "Updated " + demand.getCode() + ": "
                    + changes.stream().map(DemandFieldSnapshot.FieldChange::label).collect(Collectors.joining(", ")));
        }
        return toDetail(demand);
    }

    // ---------------------------------------------------------------- delete and restore (D-07, X-02)

    public void delete(UUID id, String reason) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        String trimmedReason = requireText(reason, "A reason is required.");
        Demand demand = findForUpdateOrThrow(id);
        if (demand.isDeleted()) {
            throw new IllegalStateException("The demand is already deleted.");
        }
        Instant now = now();
        demand.setDeleted(true);
        demand.setDeletedAt(now);
        demandRepository.save(demand);
        history(demand, DemandHistoryAction.DELETED, null, null, null, trimmedReason, null,
                user, accessPolicy.displayName(user), now);
        audit(demand, AuditAction.DELETE, user, "Soft-deleted " + demand.getCode());
    }

    public void restore(UUID id) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        Demand demand = findForUpdateOrThrow(id);
        if (!demand.isDeleted()) {
            throw new IllegalStateException("The demand is not deleted.");
        }
        demand.setDeleted(false);
        demand.setDeletedAt(null);
        demandRepository.save(demand);
        history(demand, DemandHistoryAction.RESTORED, null, null, null, null, null,
                user, accessPolicy.displayName(user), now());
        audit(demand, AuditAction.UPDATE, user, "Restored " + demand.getCode());
    }

    // ---------------------------------------------------------------- positions (H-02 to H-05)

    public DemandDetailDto addPositions(UUID id, DemandAddPositionsRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        String reason = requireText(request.reason(), "A reason is required.");
        int count = request.count();
        if (count < 1 || count > 20) {
            throw new IllegalArgumentException("Enter a number from 1 to 20.");
        }
        Demand demand = findForUpdateOrThrow(id);
        assertNotDeleted(demand);

        String actorName = accessPolicy.displayName(user);
        Instant now = now();
        int previousRequested = demand.getRequestedPositions();
        demand.setRequestedPositions(previousRequested + count);
        history(demand, DemandHistoryAction.POSITIONS_ADDED, "requested positions",
                String.valueOf(previousRequested), String.valueOf(demand.getRequestedPositions()),
                reason, null, user, actorName, now);
        recalculateStatus(demand, user, actorName, now.plus(1, ChronoUnit.MICROS));
        demandRepository.save(demand);
        audit(demand, AuditAction.UPDATE, user, "Added " + count + " position(s) to " + demand.getCode());
        return toDetail(demand);
    }

    public DemandDetailDto cancelPositions(UUID id, DemandCancelPositionsRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        Demand demand = findForUpdateOrThrow(id);
        assertNotDeleted(demand);

        int open = demand.getOpenPositions();
        int count = request.count();
        if (open < 1) {
            throw new IllegalStateException("The demand has no open positions.");
        }
        if (count < 1 || count > open) {
            throw new IllegalArgumentException("Enter a number from 1 to " + open + ".");
        }
        if (!CANCEL_REASONS.contains(request.reason())) {
            throw new IllegalArgumentException("Select a reason.");
        }
        String note = trimToNull(request.note());
        if (OTHER_REASON.equals(request.reason()) && note == null) {
            throw new IllegalArgumentException("Write a note for the reason \"Other\".");
        }

        String actorName = accessPolicy.displayName(user);
        Instant now = now();
        demand.setCancelledPositions(demand.getCancelledPositions() + count);
        history(demand, DemandHistoryAction.POSITIONS_CANCELLED, "positions", null, String.valueOf(count),
                request.reason(), note, user, actorName, now);
        recalculateStatus(demand, user, actorName, now.plus(1, ChronoUnit.MICROS));
        demandRepository.save(demand);
        audit(demand, AuditAction.UPDATE, user,
                "Cancelled " + count + " position(s) on " + demand.getCode() + " (" + request.reason() + ")");
        return toDetail(demand);
    }

    // ---------------------------------------------------------------- hold and resume (H-05, OQ-04)

    public DemandDetailDto hold(UUID id, String reason) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        String trimmedReason = requireText(reason, "A reason is required.");
        Demand demand = findForUpdateOrThrow(id);
        assertNotDeleted(demand);
        if (demand.getStatus() != DemandStatus.IN_PROGRESS) {
            throw new IllegalStateException("Only a demand in progress can be put on hold.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = now();
        history(demand, DemandHistoryAction.PUT_ON_HOLD, null, null, null, trimmedReason, null, user, actorName, now);
        history(demand, DemandHistoryAction.STATUS_CHANGED, "status", demand.getStatus().name(),
                DemandStatus.ON_HOLD.name(), null, null, user, actorName, now.plus(1, ChronoUnit.MICROS));
        demand.setStatus(DemandStatus.ON_HOLD);
        demandRepository.save(demand);
        audit(demand, AuditAction.UPDATE, user, "Put " + demand.getCode() + " on hold");
        return toDetail(demand);
    }

    public DemandDetailDto resume(UUID id) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertManage(user);
        Demand demand = findForUpdateOrThrow(id);
        assertNotDeleted(demand);
        if (demand.getStatus() != DemandStatus.ON_HOLD) {
            throw new IllegalStateException("The demand is not on hold.");
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = now();
        history(demand, DemandHistoryAction.RESUMED, null, null, null, null, null, user, actorName, now);
        DemandStatus next = DemandStatusCalculator.fromPositions(
                demand.getRequestedPositions(), demand.getFilledPositions(), demand.getCancelledPositions());
        history(demand, DemandHistoryAction.STATUS_CHANGED, "status", DemandStatus.ON_HOLD.name(), next.name(),
                null, null, user, actorName, now.plus(1, ChronoUnit.MICROS));
        demand.setStatus(next);
        demandRepository.save(demand);
        audit(demand, AuditAction.UPDATE, user, "Resumed " + demand.getCode());
        return toDetail(demand);
    }

    // ---------------------------------------------------------------- notes (N-05 to N-07)

    public DemandNoteDto addNote(UUID id, DemandNoteRequestDto request) {
        User user = accessPolicy.currentUser();
        accessPolicy.assertAddNote(user);
        String text = requireText(request.text(), "Write the note first.");
        Demand demand = findOrThrow(id);
        if (demand.isDeleted()) {
            if (!accessPolicy.canManage(user)) {
                throw notFound(id);
            }
            throw new IllegalStateException(DELETED_MESSAGE);
        }
        String actorName = accessPolicy.displayName(user);
        Instant now = now();
        DemandNote note = saveNote(demand, user, actorName, text, now);
        history(demand, DemandHistoryAction.NOTE_ADDED, "demand", null, null, null, null, user, actorName, now);
        audit(demand, AuditAction.CREATE, user, "Added a note to " + demand.getCode());
        return demandMapper.toNoteDto(note);
    }

    // ---------------------------------------------------------------- helpers

    private DemandDetailDto toDetail(Demand demand) {
        List<DemandNote> notes = noteRepository.findByDemandIdAndCandidateIsNullOrderByCreatedAtAsc(demand.getId());
        List<DemandHistory> history = historyRepository.findByDemandIdOrderByChangedAtAsc(demand.getId());
        int active = activeCandidateCounts(List.of(demand.getId())).getOrDefault(demand.getId(), 0);
        return demandMapper.toDetailDto(demand, notes, history, active);
    }

    /** Candidates in process per demand (the "active candidates" column). */
    private Map<UUID, Integer> activeCandidateCounts(Collection<UUID> demandIds) {
        Map<UUID, Integer> counts = new HashMap<>();
        if (demandIds.isEmpty()) {
            return counts;
        }
        for (Object[] row : candidateRepository.countInProcessByDemandIds(demandIds)) {
            counts.put((UUID) row[0], ((Number) row[1]).intValue());
        }
        return counts;
    }

    private void recalculateStatus(Demand demand, User user, String actorName, Instant at) {
        historyRecorder.recalculateStatus(demand, user, actorName, at);
    }

    private void validateFields(DemandFields request) {
        List<DemandSkillRequestDto> skills = request.skills() != null ? request.skills() : List.of();
        boolean hasSkill = skills.stream()
                .anyMatch(skill -> !LANGUAGE_CATEGORY.equalsIgnoreCase(trimToEmpty(skill.category())));
        if (!hasSkill) {
            throw new IllegalArgumentException("At least one required skill is needed.");
        }
        Set<String> names = new HashSet<>();
        for (DemandSkillRequestDto skill : skills) {
            if (!names.add(skill.name().trim().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("The skill \"" + skill.name().trim() + "\" is listed twice.");
            }
        }
        // Optional skills are free (may be empty); a name may appear only once across required and optional skills.
        for (DemandSkillRequestDto skill : request.optionalSkills() != null ? request.optionalSkills()
                : List.<DemandSkillRequestDto>of()) {
            if (!names.add(skill.name().trim().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("The skill \"" + skill.name().trim() + "\" is listed twice.");
            }
        }
        if (request.wantedEndDate() != null && request.wantedEndDate().isBefore(request.wantedStartDate())) {
            throw new IllegalArgumentException("The end date is before the start date.");
        }
    }

    private void checkDuplicateExternalId(String externalId, UUID excludeId, boolean force) {
        if (externalId == null || force) {
            return;
        }
        Optional<Demand> duplicate = excludeId == null
                ? demandRepository.findFirstByExternalIdIgnoreCase(externalId)
                : demandRepository.findFirstByExternalIdIgnoreCaseAndIdNot(externalId, excludeId);
        duplicate.ifPresent(other -> {
            throw new DuplicateExternalIdException(other.getCode());
        });
    }

    private void applyFields(Demand demand, DemandFields request) {
        demand.setExternalId(trimToNull(request.externalId()));
        demand.setTitle(request.title().trim());
        demand.setSeniority(trimToNull(request.seniority()));
        demand.setAllocationPct(request.allocationPct());
        demand.setMaxRangeCode(trimToNull(request.maxRangeCode()));
        // The frontend sends no value for an empty rate; 0 is treated the same way.
        demand.setMaxDailyRate(request.maxDailyRate() != null && request.maxDailyRate() > 0 ? request.maxDailyRate() : null);
        demand.setRequestedBy(request.requestedBy().trim());
        replaceNames(demand.getInterviewers(), request.interviewers(), null);
        demand.setReceivedDate(request.receivedDate());
        demand.setWantedStartDate(request.wantedStartDate());
        demand.setWantedEndDate(request.wantedEndDate());
        replaceNames(demand.getHorizontals(), request.horizontals(), "horizontal");
        replaceNames(demand.getVerticals(), request.verticals(), "vertical");
        demand.setClientName(trimToNull(request.clientName()));
        demand.setProjectName(trimToNull(request.projectName()));
        demand.setProjectDescription(trimToNull(request.projectDescription()));
        applyCountries(demand, request.countries());
        applySkills(demand, demand.getSkills(), request.skills(), false);
        applySkills(demand, demand.getOptionalSkills(), request.optionalSkills(), true);
        applyMissingSkills(demand, request.missingSkills());
    }

    /** Each country needs one HR Business Partner. Repeated countries (ignoring case) are dropped. */
    private void applyCountries(Demand demand, List<DemandCountryRequestDto> requested) {
        Map<UUID, Employee> partners = new HashMap<>();
        employeeRepository.findHrBusinessPartners().forEach(partner -> partners.put(partner.getId(), partner));
        List<DemandCountry> next = new ArrayList<>();
        for (DemandCountryRequestDto item : requested != null ? requested : List.<DemandCountryRequestDto>of()) {
            String country = trimToNull(item.country());
            if (country == null || next.stream().anyMatch(existing -> existing.getCountry().equalsIgnoreCase(country))) {
                continue;
            }
            if (item.hrBusinessPartnerId() == null) {
                throw new IllegalArgumentException("Select an HR Business Partner for " + country + ".");
            }
            Employee partner = partners.get(item.hrBusinessPartnerId());
            if (partner == null) {
                throw new IllegalArgumentException("The HR Business Partner for " + country + " was not found.");
            }
            next.add(new DemandCountry(country, partner));
        }
        if (!next.equals(demand.getCountries())) {
            demand.getCountries().clear();
            demand.getCountries().addAll(next);
        }
    }

    @Transactional(readOnly = true)
    public List<HrBusinessPartnerDto> hrBusinessPartners() {
        return employeeRepository.findHrBusinessPartners().stream()
                .map(partner -> new HrBusinessPartnerDto(partner.getId(), (partner.getFirstName() + " " + partner.getLastName()).trim()))
                .toList();
    }

    /** Trims, drops blanks and repeated names (ignoring case) and keeps the order. */
    private void replaceNames(List<String> target, List<String> requested, String requiredLabel) {
        List<String> next = new ArrayList<>();
        for (String name : requested != null ? requested : List.<String>of()) {
            String country = trimToNull(name);
            if (country != null && next.stream().noneMatch(country::equalsIgnoreCase)) {
                next.add(country);
            }
        }
        if (requiredLabel != null && next.isEmpty()) {
            throw new IllegalArgumentException("Select at least one " + requiredLabel + ".");
        }
        if (!next.equals(target)) {
            target.clear();
            target.addAll(next);
        }
    }

    /** Replaces the required ({@code optional = false}) or the optional skills when they changed. */
    private void applySkills(Demand demand, List<DemandSkill> current, List<DemandSkillRequestDto> requested, boolean optional) {
        List<DemandSkill> next = new ArrayList<>();
        int order = 0;
        for (DemandSkillRequestDto item : requested != null ? requested : List.<DemandSkillRequestDto>of()) {
            DemandSkill skill = new DemandSkill();
            skill.setDemand(demand);
            skill.setSkillName(item.name().trim());
            skill.setCategory(trimToNull(item.category()));
            skill.setRequiredLevel(item.level());
            // Optional skills are never must-have; required skills keep the must-have / nice-to-have choice.
            skill.setMustHave(!optional && (item.mustHave() == null || item.mustHave()));
            skill.setOptional(optional);
            skill.setSortOrder(order++);
            // Link to the Module 1 catalog when the name matches. Names that do not match are kept as text.
            skillRepository.findByNameIgnoreCase(skill.getSkillName()).ifPresent(skill::setSkill);
            next.add(skill);
        }
        if (DemandFieldSnapshot.skillsKey(next).equals(DemandFieldSnapshot.skillsKey(current))) {
            return;
        }
        current.clear();
        current.addAll(next);
    }

    private void applyMissingSkills(Demand demand, List<String> requested) {
        List<DemandRequestedSkill> next = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int order = 0;
        for (String raw : requested != null ? requested : List.<String>of()) {
            String name = trimToNull(raw);
            if (name == null || !seen.add(name.toLowerCase(Locale.ROOT))) {
                continue;
            }
            DemandRequestedSkill skill = new DemandRequestedSkill();
            skill.setDemand(demand);
            skill.setName(name);
            skill.setSortOrder(order++);
            next.add(skill);
        }
        if (DemandFieldSnapshot.missingSkillsKey(next).equals(DemandFieldSnapshot.missingSkillsKey(demand.getRequestedSkills()))) {
            return;
        }
        demand.getRequestedSkills().clear();
        demand.getRequestedSkills().addAll(next);
    }

    private DemandNote saveNote(Demand demand, User author, String authorName, String text, Instant at) {
        DemandNote note = new DemandNote();
        note.setDemand(demand);
        note.setAuthor(author);
        note.setAuthorName(authorName);
        note.setText(text);
        note.setCreatedAt(at);
        return noteRepository.save(note);
    }

    private void history(Demand demand, DemandHistoryAction action, String field, String oldValue, String newValue,
            String reason, String note, User user, String actorName, Instant at) {
        historyRecorder.record(demand, action, field, oldValue, newValue, reason, note, user, actorName, at);
    }

    private void audit(Demand demand, AuditAction action, User user, String comment) {
        auditService.log(ENTITY_NAME, demand.getId(), action, user, null, null, comment);
    }

    private Demand findOrThrow(UUID id) {
        return demandRepository.findById(id).orElseThrow(() -> notFound(id));
    }

    private Demand findForUpdateOrThrow(UUID id) {
        return demandRepository.findByIdForUpdate(id).orElseThrow(() -> notFound(id));
    }

    private static ResourceNotFoundException notFound(UUID id) {
        return new ResourceNotFoundException("Demand not found: " + id);
    }

    private static void assertNotDeleted(Demand demand) {
        if (demand.isDeleted()) {
            throw new IllegalStateException(DELETED_MESSAGE);
        }
    }

    private static Pageable normalize(Pageable pageable) {
        int size = Math.min(Math.max(pageable.getPageSize(), 1), MAX_PAGE_SIZE);
        Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : Sort.by(Sort.Direction.DESC, "createdAt");
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }

    /** Microsecond precision, the same as PostgreSQL TIMESTAMP, so the history order survives the round trip. */
    private static Instant now() {
        return DemandHistoryRecorder.now();
    }

    private static String requireText(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new IllegalArgumentException(message);
        }
        return trimmed;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    /** D-02: filter by status and deleted flag; search by code, external ID, title, client, project or skill. */
    private Specification<Demand> buildSpecification(String search, DemandStatus status, boolean deleted) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("deleted"), deleted));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";

                Subquery<UUID> skillMatch = query.subquery(UUID.class);
                Root<DemandSkill> skill = skillMatch.from(DemandSkill.class);
                skillMatch.select(skill.get("demand").get("id")).where(
                        cb.equal(skill.get("demand"), root),
                        cb.like(cb.lower(skill.get("skillName")), pattern));

                Subquery<UUID> requestedMatch = query.subquery(UUID.class);
                Root<DemandRequestedSkill> requested = requestedMatch.from(DemandRequestedSkill.class);
                requestedMatch.select(requested.get("demand").get("id")).where(
                        cb.equal(requested.get("demand"), root),
                        cb.like(cb.lower(requested.get("name")), pattern));

                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("code")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("externalId"), "")), pattern),
                        cb.like(cb.lower(root.<String>get("title")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("clientName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("projectName"), "")), pattern),
                        cb.exists(skillMatch),
                        cb.exists(requestedMatch)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}



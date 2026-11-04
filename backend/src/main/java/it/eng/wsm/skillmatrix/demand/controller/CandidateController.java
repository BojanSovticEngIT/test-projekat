package it.eng.wsm.skillmatrix.demand.controller;

import it.eng.wsm.skillmatrix.demand.dto.request.CandidateAddRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateMoveRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateNoteRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateOutcomeRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidatePipelineStatusRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.CandidateStepRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandReasonRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.MeetingFeedbackRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateDto;
import it.eng.wsm.skillmatrix.demand.dto.response.CandidateOptionsDto;
import it.eng.wsm.skillmatrix.demand.dto.response.MeetingSummaryDto;
import it.eng.wsm.skillmatrix.demand.dto.response.MeetingUserDto;
import it.eng.wsm.skillmatrix.demand.service.CandidateService;
import it.eng.wsm.skillmatrix.demand.service.MeetingService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Module 3 candidates, flow steps and meetings. Paths and payloads match the frontend ({@code features/demand/demandApi.ts}).
 * Demand manager = ADMIN, PMO. Readers = demand manager + HR_BUSINESS_PARTNER (read, add candidates, notes).
 * Meeting participants (any signed-in user) reach only their own meetings; the service checks each meeting.
 */
@RestController
@RequestMapping("/api/demands")
@RequiredArgsConstructor
public class CandidateController {

    private static final String READERS = "hasAnyRole('ADMIN','PMO','HR_BUSINESS_PARTNER')";
    private static final String MANAGERS = "hasAnyRole('ADMIN','PMO')";

    private final CandidateService candidateService;
    private final MeetingService meetingService;

    @GetMapping("/{id}/candidates")
    @PreAuthorize(READERS)
    public ResponseEntity<List<CandidateDto>> list(@PathVariable UUID id) {
        return ResponseEntity.ok(candidateService.list(id));
    }

    @GetMapping("/{id}/candidate-options")
    @PreAuthorize(READERS)
    public ResponseEntity<CandidateOptionsDto> options(@PathVariable UUID id) {
        return ResponseEntity.ok(candidateService.options(id));
    }

    @PostMapping("/{id}/candidates")
    @PreAuthorize(READERS)
    public ResponseEntity<List<CandidateDto>> add(@PathVariable UUID id, @Valid @RequestBody CandidateAddRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(candidateService.add(id, request));
    }

    @PostMapping("/{id}/candidates/{candidateId}/notes")
    @PreAuthorize(READERS)
    public ResponseEntity<CandidateDto> addNote(@PathVariable UUID id, @PathVariable UUID candidateId,
            @Valid @RequestBody CandidateNoteRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(candidateService.addNote(id, candidateId, request));
    }

    @PostMapping("/{id}/candidates/{candidateId}/withdraw")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<CandidateDto> withdraw(@PathVariable UUID id, @PathVariable UUID candidateId,
            @RequestBody(required = false) DemandReasonRequestDto request) {
        return ResponseEntity.ok(candidateService.withdraw(id, candidateId, request != null ? request.reason() : null));
    }

    /** Moves a candidate in process to another demand. Steps, notes and the status go with the candidate. */
    @PostMapping("/{id}/candidates/{candidateId}/move")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<CandidateDto> move(@PathVariable UUID id, @PathVariable UUID candidateId,
            @Valid @RequestBody CandidateMoveRequestDto request) {
        return ResponseEntity.ok(candidateService.move(id, candidateId, request.targetDemandId()));
    }

    /** Sets the candidate status by hand. It does not depend on the steps. */
    @PutMapping("/{id}/candidates/{candidateId}/pipeline-status")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<CandidateDto> setPipelineStatus(@PathVariable UUID id, @PathVariable UUID candidateId,
            @Valid @RequestBody CandidatePipelineStatusRequestDto request) {
        return ResponseEntity.ok(candidateService.setPipelineStatus(id, candidateId, request.pipelineStatus()));
    }

    /** Removes a candidate added by mistake. Not a withdrawal: no reason, no outcome (distinct history event). */
    @DeleteMapping("/{id}/candidates/{candidateId}")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<Void> removeFromDemand(@PathVariable UUID id, @PathVariable UUID candidateId) {
        candidateService.removeFromDemand(id, candidateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/candidates/{candidateId}/steps")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<CandidateDto> addStep(@PathVariable UUID id, @PathVariable UUID candidateId,
            @Valid @RequestBody CandidateStepRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(candidateService.addStep(id, candidateId, request));
    }

    @PostMapping("/{id}/candidates/{candidateId}/steps/{stepId}/outcome")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<CandidateDto> recordOutcome(@PathVariable UUID id, @PathVariable UUID candidateId,
            @PathVariable UUID stepId, @Valid @RequestBody CandidateOutcomeRequestDto request) {
        return ResponseEntity.ok(candidateService.recordOutcome(id, candidateId, stepId, request));
    }

    @PostMapping("/{id}/candidates/{candidateId}/steps/{stepId}/feedback")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CandidateDto> addFeedback(@PathVariable UUID id, @PathVariable UUID candidateId,
            @PathVariable UUID stepId, @Valid @RequestBody MeetingFeedbackRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(meetingService.addFeedback(id, candidateId, stepId, request));
    }

    @PostMapping("/{id}/candidates/{candidateId}/steps/{stepId}/notes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CandidateDto> addStepNote(@PathVariable UUID id, @PathVariable UUID candidateId,
            @PathVariable UUID stepId, @Valid @RequestBody CandidateNoteRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(meetingService.addStepNote(id, candidateId, stepId, request.text()));
    }

    @GetMapping("/my-meetings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MeetingSummaryDto>> myMeetings() {
        return ResponseEntity.ok(meetingService.myMeetings());
    }

    @GetMapping("/meeting-users")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<List<MeetingUserDto>> meetingUsers() {
        return ResponseEntity.ok(meetingService.meetingUsers());
    }
}


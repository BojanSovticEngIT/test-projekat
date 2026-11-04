package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationCommentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationEndRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.EngagementSkillRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationCommentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationHistoryResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EngagementSkillResponseDto;
import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import it.eng.wsm.skillmatrix.workforce.service.AllocationService;
import it.eng.wsm.skillmatrix.workforce.service.EngagementSkillService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/allocations")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;
    private final EngagementSkillService engagementSkillService;

    @GetMapping
    public ResponseEntity<List<AllocationResponseDto>> findAll(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) AllocationLifecycleStatus lifecycleStatus) {
        return ResponseEntity.ok(allocationService.findAll(employeeId, projectId, lifecycleStatus));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AllocationResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(allocationService.findById(id));
    }

    @PostMapping
    public ResponseEntity<AllocationResponseDto> create(@Valid @RequestBody AllocationRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(allocationService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AllocationResponseDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody AllocationRequestDto dto) {
        return ResponseEntity.ok(allocationService.update(id, dto));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<AllocationResponseDto> end(
            @PathVariable UUID id,
            @Valid @RequestBody AllocationEndRequestDto dto) {
        return ResponseEntity.ok(allocationService.end(id, dto));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<AllocationCommentResponseDto> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody AllocationCommentRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(allocationService.addComment(id, dto));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<AllocationHistoryResponseDto>> findHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(allocationService.findHistoryByAllocationId(id));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<AllocationCommentResponseDto>> findComments(@PathVariable UUID id) {
        return ResponseEntity.ok(allocationService.findComments(id));
    }

    @GetMapping("/{id}/skills")
    public ResponseEntity<List<EngagementSkillResponseDto>> findSkills(@PathVariable UUID id) {
        return ResponseEntity.ok(engagementSkillService.findByAllocationId(id));
    }

    @PostMapping("/{id}/skills")
    public ResponseEntity<EngagementSkillResponseDto> addSkill(
            @PathVariable UUID id,
            @Valid @RequestBody EngagementSkillRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(engagementSkillService.addSkill(id, dto));
    }

    @PutMapping("/{id}/skills/{skillId}")
    public ResponseEntity<EngagementSkillResponseDto> updateSkill(
            @PathVariable UUID id,
            @PathVariable UUID skillId,
            @Valid @RequestBody EngagementSkillRequestDto dto) {
        return ResponseEntity.ok(engagementSkillService.updateSkill(id, skillId, dto));
    }
}

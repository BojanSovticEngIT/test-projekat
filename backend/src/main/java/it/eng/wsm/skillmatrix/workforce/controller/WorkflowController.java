package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.WorkflowDecisionRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.WorkflowRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkflowResponseDto;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowStatus;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowType;
import it.eng.wsm.skillmatrix.workforce.service.WorkflowService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    public ResponseEntity<List<WorkflowResponseDto>> findAll(
            @RequestParam(required = false) WorkflowStatus status,
            @RequestParam(required = false) WorkflowType type) {
        return ResponseEntity.ok(workflowService.findAll(status, type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.findById(id));
    }

    @PostMapping
    public ResponseEntity<WorkflowResponseDto> submit(@Valid @RequestBody WorkflowRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowService.submit(dto));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<WorkflowResponseDto> approve(
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowDecisionRequestDto dto) {
        return ResponseEntity.ok(workflowService.approve(id, dto));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<WorkflowResponseDto> reject(
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowDecisionRequestDto dto) {
        return ResponseEntity.ok(workflowService.reject(id, dto));
    }
}

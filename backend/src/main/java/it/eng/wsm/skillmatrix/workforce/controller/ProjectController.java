package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.ProjectRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectResponseDto;
import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import it.eng.wsm.skillmatrix.workforce.service.AllocationService;
import it.eng.wsm.skillmatrix.workforce.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final AllocationService allocationService;

    @GetMapping
    public ResponseEntity<Page<ProjectResponseDto>> findAll(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) UUID clientId,
            @RequestParam(required = false) UUID horizontalNodeId,
            @RequestParam(required = false) UUID projectManagerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String client,
            @RequestParam(required = false) String projectManager,
            @RequestParam(required = false) String horizontal,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(projectService.findAll(
                status, clientId, horizontalNodeId, projectManagerId, search, client, projectManager, horizontal,
                pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.findById(id));
    }

    @GetMapping("/{id}/allocations")
    public ResponseEntity<List<AllocationResponseDto>> findAllocations(@PathVariable UUID id) {
        return ResponseEntity.ok(allocationService.findByProjectId(id));
    }

    @PostMapping
    public ResponseEntity<ProjectResponseDto> create(@Valid @RequestBody ProjectRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponseDto> update(@PathVariable UUID id, @Valid @RequestBody ProjectRequestDto dto) {
        return ResponseEntity.ok(projectService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

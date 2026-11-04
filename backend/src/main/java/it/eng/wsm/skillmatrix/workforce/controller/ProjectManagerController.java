package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.ProjectManagerRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectManagerResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.ProjectManagerService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/project-managers")
@RequiredArgsConstructor
public class ProjectManagerController {

    private final ProjectManagerService projectManagerService;

    @GetMapping
    public ResponseEntity<List<ProjectManagerResponseDto>> findAll() {
        return ResponseEntity.ok(projectManagerService.findAllActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectManagerResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectManagerService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ProjectManagerResponseDto> create(@Valid @RequestBody ProjectManagerRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectManagerService.create(dto));
    }
}

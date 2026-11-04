package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.ClientRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ClientResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectResponseDto;
import it.eng.wsm.skillmatrix.workforce.enums.ClientStatus;
import it.eng.wsm.skillmatrix.workforce.service.ClientService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<Page<ClientResponseDto>> findAll(
            @RequestParam(required = false) ClientStatus status,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(clientService.findAll(status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(clientService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ClientResponseDto> create(@Valid @RequestBody ClientRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientResponseDto> update(@PathVariable UUID id, @Valid @RequestBody ClientRequestDto dto) {
        return ResponseEntity.ok(clientService.update(id, dto));
    }

    @GetMapping("/{id}/projects")
    public ResponseEntity<List<ProjectResponseDto>> findProjects(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.findByClientId(id));
    }
}

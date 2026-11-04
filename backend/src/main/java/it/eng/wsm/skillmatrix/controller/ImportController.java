package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.response.ImportJobResponseDto;
import it.eng.wsm.skillmatrix.service.ImportService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/skill-matrix/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportJobResponseDto> validate(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(importService.validateImport(file));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/skill-matrix/confirm/{importJobId}")
    public ResponseEntity<ImportJobResponseDto> confirm(
            @PathVariable UUID importJobId) {
        return ResponseEntity.ok(importService.confirmImport(importJobId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/jobs")
    public ResponseEntity<Page<ImportJobResponseDto>> listJobs(@ParameterObject Pageable pageable) {
        return ResponseEntity.ok(importService.listJobs(pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/jobs/{id}")
    public ResponseEntity<ImportJobResponseDto> getJob(@PathVariable UUID id) {
        return ResponseEntity.ok(importService.getJob(id));
    }
}

package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.dto.response.ImportJobResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkforceImportMappingResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.WorkforceImportService;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/import/workforce")
@RequiredArgsConstructor
public class WorkforceImportController {

    private final WorkforceImportService workforceImportService;

    @PostMapping(value = "/mapping", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkforceImportMappingResponseDto> mapColumns(@RequestPart("file") MultipartFile file)
            throws IOException {
        return ResponseEntity.ok(workforceImportService.mapColumns(file));
    }

    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportJobResponseDto> validate(@RequestPart("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(workforceImportService.validateImport(file));
    }

    @PostMapping("/confirm/{jobId}")
    public ResponseEntity<ImportJobResponseDto> confirm(@PathVariable UUID jobId) {
        return ResponseEntity.ok(workforceImportService.confirmImport(jobId));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<ImportJobResponseDto>> listJobs() {
        return ResponseEntity.ok(workforceImportService.listJobs());
    }
}

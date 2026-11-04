package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.HorizontalNodeRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HorizontalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.StructureImportResultDto;
import it.eng.wsm.skillmatrix.workforce.service.HorizontalNodeService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/horizontal-nodes")
@RequiredArgsConstructor
public class HorizontalNodeController {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final HorizontalNodeService horizontalNodeService;

    @GetMapping
    public ResponseEntity<List<HorizontalNodeResponseDto>> findAll(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(horizontalNodeService.findAll(includeInactive));
    }

    @GetMapping("/export.xlsx")
    public ResponseEntity<byte[]> exportExcel() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"corporate-structure.xlsx\"")
                .body(horizontalNodeService.exportExcel());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StructureImportResultDto> importExcel(@RequestParam("file") MultipartFile file)
            throws IOException {
        try (InputStream input = file.getInputStream()) {
            return ResponseEntity.ok(horizontalNodeService.importExcel(input));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<HorizontalNodeResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(horizontalNodeService.findById(id));
    }

    @PostMapping
    public ResponseEntity<HorizontalNodeResponseDto> create(@Valid @RequestBody HorizontalNodeRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(horizontalNodeService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HorizontalNodeResponseDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody HorizontalNodeRequestDto dto) {
        return ResponseEntity.ok(horizontalNodeService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        horizontalNodeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

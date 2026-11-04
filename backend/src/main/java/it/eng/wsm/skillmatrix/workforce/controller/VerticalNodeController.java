package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.VerticalNodeRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.StructureImportResultDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.VerticalNodeService;
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
@RequestMapping("/api/vertical-nodes")
@RequiredArgsConstructor
public class VerticalNodeController {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final VerticalNodeService verticalNodeService;

    @GetMapping
    public ResponseEntity<List<VerticalNodeResponseDto>> findAll(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(verticalNodeService.findAll(includeInactive));
    }

    @GetMapping("/export.xlsx")
    public ResponseEntity<byte[]> exportExcel() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"market-structure.xlsx\"")
                .body(verticalNodeService.exportExcel());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StructureImportResultDto> importExcel(@RequestParam("file") MultipartFile file)
            throws IOException {
        try (InputStream input = file.getInputStream()) {
            return ResponseEntity.ok(verticalNodeService.importExcel(input));
        }
    }

    @PostMapping
    public ResponseEntity<VerticalNodeResponseDto> create(@Valid @RequestBody VerticalNodeRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(verticalNodeService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VerticalNodeResponseDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody VerticalNodeRequestDto dto) {
        return ResponseEntity.ok(verticalNodeService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        verticalNodeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

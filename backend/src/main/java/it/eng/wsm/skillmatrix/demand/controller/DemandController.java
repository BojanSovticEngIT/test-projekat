package it.eng.wsm.skillmatrix.demand.controller;

import it.eng.wsm.skillmatrix.demand.dto.request.DemandAddPositionsRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandCancelPositionsRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandCreateRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandNoteRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandReasonRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandUpdateRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandDetailDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandNoteDto;
import it.eng.wsm.skillmatrix.demand.dto.response.HrBusinessPartnerDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandSummaryDto;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandImportResultDto;
import it.eng.wsm.skillmatrix.demand.service.DemandExcelService;
import it.eng.wsm.skillmatrix.demand.service.DemandService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

/**
 * Module 3 demand management API. Paths and payloads match the existing frontend ({@code features/demand/demandApi.ts}).
 * Demand manager = ADMIN, PMO. Readers = demand manager + HR_BUSINESS_PARTNER.
 */
@RestController
@RequestMapping("/api/demands")
@RequiredArgsConstructor
public class DemandController {

    private static final String READERS = "hasAnyRole('ADMIN','PMO','HR_BUSINESS_PARTNER')";
    private static final String MANAGERS = "hasAnyRole('ADMIN','PMO')";

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final DemandService demandService;
    private final DemandExcelService excelService;

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<Page<DemandSummaryDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) DemandStatus status,
            @RequestParam(defaultValue = "false") boolean deleted,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(demandService.findAll(search, status, deleted, pageable));
    }

    @GetMapping("/hr-business-partners")
    @PreAuthorize(READERS)
    public ResponseEntity<List<HrBusinessPartnerDto>> hrBusinessPartners() {
        return ResponseEntity.ok(demandService.hrBusinessPartners());
    }

    @GetMapping("/export.xlsx")
    @PreAuthorize(READERS)
    public ResponseEntity<byte[]> export() {
        return xlsx(excelService.export(), "demands.xlsx");
    }

    @GetMapping("/import-template.xlsx")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<byte[]> importTemplate() {
        return xlsx(excelService.template(), "demands-import-template.xlsx");
    }

    /** Creates one demand per row; nothing is imported when any row has an error. */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandImportResultDto> importDemands(@RequestParam("file") MultipartFile file)
            throws IOException {
        try (InputStream input = file.getInputStream()) {
            return ResponseEntity.ok(excelService.importDemands(input));
        }
    }

    private static ResponseEntity<byte[]> xlsx(byte[] content, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    @GetMapping("/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<DemandDetailDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(demandService.findById(id));
    }

    @PostMapping
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> create(@Valid @RequestBody DemandCreateRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(demandService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> update(@PathVariable UUID id, @Valid @RequestBody DemandUpdateRequestDto request) {
        return ResponseEntity.ok(demandService.update(id, request));
    }

    /** Soft delete with a mandatory reason (D-07). The record, its notes and its history are kept. */
    @DeleteMapping("/{id}")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<Void> delete(@PathVariable UUID id, @RequestBody(required = false) DemandReasonRequestDto request) {
        demandService.delete(id, request != null ? request.reason() : null);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<Void> restore(@PathVariable UUID id) {
        demandService.restore(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/positions")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> addPositions(
            @PathVariable UUID id, @Valid @RequestBody DemandAddPositionsRequestDto request) {
        return ResponseEntity.ok(demandService.addPositions(id, request));
    }

    @PostMapping("/{id}/positions/cancel")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> cancelPositions(
            @PathVariable UUID id, @Valid @RequestBody DemandCancelPositionsRequestDto request) {
        return ResponseEntity.ok(demandService.cancelPositions(id, request));
    }

    @PostMapping("/{id}/hold")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> hold(@PathVariable UUID id, @RequestBody(required = false) DemandReasonRequestDto request) {
        return ResponseEntity.ok(demandService.hold(id, request != null ? request.reason() : null));
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<DemandDetailDto> resume(@PathVariable UUID id) {
        return ResponseEntity.ok(demandService.resume(id));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize(READERS)
    public ResponseEntity<DemandNoteDto> addNote(@PathVariable UUID id, @Valid @RequestBody DemandNoteRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(demandService.addNote(id, request));
    }
}


package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.response.AuditLogResponseDto;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.service.AuditLogQueryService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogQueryService auditLogQueryService;

    @GetMapping
    public ResponseEntity<Page<AuditLogResponseDto>> findAll(
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) String changedByEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(auditLogQueryService.findAll(
                entityName, entityId, action, changedByEmail, dateFrom, dateTo, pageable));
    }

    @GetMapping("/entity/{entityName}/{entityId}")
    public ResponseEntity<Page<AuditLogResponseDto>> findByEntity(
            @PathVariable String entityName,
            @PathVariable String entityId,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(auditLogQueryService.findByEntity(entityName, entityId, pageable));
    }
}

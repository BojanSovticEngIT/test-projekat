package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.service.CertificateService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only certificates of an employee, for users who may view that employee's detail page. */
@RestController
@RequestMapping("/api/employees/{employeeId}/certifications")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class EmployeeCertificateController {

    private final CertificateService certificateService;

    @GetMapping
    public ResponseEntity<Page<CertificateResponseDto>> list(
            @PathVariable UUID employeeId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(certificateService.listForEmployee(employeeId, CertificateController.cap(pageable)));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID employeeId, @PathVariable UUID id) {
        return CertificateController.pdfResponse(certificateService.getDocumentForEmployee(employeeId, id));
    }
}

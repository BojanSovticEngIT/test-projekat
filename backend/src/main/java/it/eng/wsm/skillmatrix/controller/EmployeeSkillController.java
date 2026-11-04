package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.EmployeeSkillRequestDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillRevisionResponseDto;
import it.eng.wsm.skillmatrix.service.CertificateService;
import it.eng.wsm.skillmatrix.service.EmployeeSkillService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class EmployeeSkillController {

    private final EmployeeSkillService employeeSkillService;
    private final CertificateService certificateService;

    /**
     * GET /api/employees/{employeeId}/skills
     * Accessible by ADMIN, HR, LINE_MANAGER (direct reports only).
     */
    @GetMapping("/api/employees/{employeeId}/skills")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<List<EmployeeSkillResponseDto>> getEmployeeSkills(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(employeeSkillService.getEmployeeSkills(employeeId));
    }

    /**
     * POST /api/employees/{employeeId}/skills
     * Accessible by ADMIN, HR, LINE_MANAGER.
     */
    @PostMapping("/api/employees/{employeeId}/skills")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<EmployeeSkillResponseDto> addSkillForEmployee(
            @PathVariable UUID employeeId,
            @Valid @RequestBody EmployeeSkillRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeSkillService.addSkillForEmployee(employeeId, dto));
    }

    /**
     * PUT /api/employee-skills/{employeeSkillId}
     * Accessible by ADMIN, HR, LINE_MANAGER.
     */
    @PutMapping("/api/employee-skills/{employeeSkillId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<EmployeeSkillResponseDto> updateSkillByAdmin(
            @PathVariable UUID employeeSkillId,
            @Valid @RequestBody EmployeeSkillRequestDto dto) {
        return ResponseEntity.ok(employeeSkillService.updateSkillByAdmin(employeeSkillId, dto));
    }

    /**
     * DELETE /api/employee-skills/{employeeSkillId}
     * Accessible by ADMIN, HR, LINE_MANAGER.
     */
    @DeleteMapping("/api/employee-skills/{employeeSkillId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<Void> deleteSkillByAdmin(@PathVariable UUID employeeSkillId) {
        employeeSkillService.deleteSkillByAdmin(employeeSkillId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/employee-skills/{employeeSkillId}/latest-validated-revision
     * Accessible by ADMIN, HR, LINE_MANAGER (direct reports only).
     */
    @GetMapping("/api/employee-skills/{employeeSkillId}/latest-validated-revision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<EmployeeSkillRevisionResponseDto> getLatestValidatedRevision(
            @PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.getLatestValidatedRevision(employeeSkillId));
    }

    /**
     * GET /api/employee-skills/{employeeSkillId}/history
     * Accessible by ADMIN, HR, LINE_MANAGER (direct reports only).
     */
    @GetMapping("/api/employee-skills/{employeeSkillId}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<List<EmployeeSkillRevisionResponseDto>> getRevisionHistory(
            @PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.getRevisionHistory(employeeSkillId));
    }

    /**
     * GET /api/employee-skills/{employeeSkillId}/certifications
     * Certificates of the skill owner that are linked to this skill. Same scope as the history endpoint.
     */
    @GetMapping("/api/employee-skills/{employeeSkillId}/certifications")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<List<CertificateResponseDto>> getSkillCertificates(@PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(certificateService.listForEmployeeSkill(employeeSkillId));
    }

    /** GET /api/employee-skills/{employeeSkillId}/certifications/{id}/document — PDF of a linked certificate. */
    @GetMapping("/api/employee-skills/{employeeSkillId}/certifications/{id}/document")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<byte[]> downloadSkillCertificate(
            @PathVariable UUID employeeSkillId, @PathVariable UUID id) {
        return CertificateController.pdfResponse(certificateService.getDocumentForEmployeeSkill(employeeSkillId, id));
    }

    /**
     * POST /api/employee-skills/{employeeSkillId}/restore-latest-validated
     * Accessible by ADMIN, LINE_MANAGER (direct reports only).
     */
    @PostMapping("/api/employee-skills/{employeeSkillId}/restore-latest-validated")
    @PreAuthorize("hasAnyRole('ADMIN', 'LINE_MANAGER')")
    public ResponseEntity<EmployeeSkillResponseDto> restoreLatestValidated(@PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.restoreLatestValidatedByAdmin(employeeSkillId));
    }
}

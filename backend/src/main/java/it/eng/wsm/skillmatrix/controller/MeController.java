package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.DeletionRequestDto;
import it.eng.wsm.skillmatrix.dto.request.EmployeeSkillRequestDto;
import it.eng.wsm.skillmatrix.dto.request.SubmitValidationRequestDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillRevisionResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationRequestResponseDto;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.service.CertificateService;
import it.eng.wsm.skillmatrix.service.EmployeeService;
import it.eng.wsm.skillmatrix.service.EmployeeSkillService;
import it.eng.wsm.skillmatrix.service.ValidationRequestService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final EmployeeService employeeService;
    private final EmployeeSkillService employeeSkillService;
    private final ValidationRequestService validationRequestService;
    private final CertificateService certificateService;

    @GetMapping("/employee-profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeResponseDto> getOwnProfile() {
        return ResponseEntity.ok(employeeService.findOwnProfile());
    }

    @GetMapping("/skills")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EmployeeSkillResponseDto>> getMySkills() {
        return ResponseEntity.ok(employeeSkillService.getMySkills());
    }

    @PostMapping("/skills")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeSkillResponseDto> addSkill(@Valid @RequestBody EmployeeSkillRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeSkillService.addSkill(dto));
    }

    @PutMapping("/skills/{employeeSkillId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeSkillResponseDto> updateSkill(
            @PathVariable UUID employeeSkillId,
            @Valid @RequestBody EmployeeSkillRequestDto dto) {
        return ResponseEntity.ok(employeeSkillService.updateSkill(employeeSkillId, dto));
    }

    /** Direct deletion is limited to the owner's own DRAFT skills; everything else needs a deletion request. */
    @DeleteMapping("/skills/{employeeSkillId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteSkill(@PathVariable UUID employeeSkillId) {
        employeeSkillService.deleteMyDraftSkill(employeeSkillId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/skills/{employeeSkillId}/request-deletion")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ValidationRequestResponseDto> requestDeletion(
            @PathVariable UUID employeeSkillId, @Valid @RequestBody DeletionRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(validationRequestService.requestDeletion(employeeSkillId, dto.getReason().trim()));
    }

    @PostMapping("/skills/submit-validation")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ValidationRequestResponseDto> submitForValidation(
            @Valid @RequestBody SubmitValidationRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(validationRequestService.submitForValidation(dto));
    }

    @GetMapping("/skills/{employeeSkillId}/latest-validated-revision")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeSkillRevisionResponseDto> getLatestValidatedRevision(
            @PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.getMyLatestValidatedRevision(employeeSkillId));
    }

    @GetMapping("/skills/{employeeSkillId}/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EmployeeSkillRevisionResponseDto>> getSkillHistory(@PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.getMyRevisionHistory(employeeSkillId));
    }

    @GetMapping("/skills/certificate-counts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<UUID, Long>> getSkillCertificateCounts() {
        return ResponseEntity.ok(certificateService.countForMySkills());
    }

    @GetMapping("/skills/{employeeSkillId}/certifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CertificateResponseDto>> getSkillCertificates(@PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(certificateService.listForMySkill(employeeSkillId));
    }

    @PostMapping("/skills/{employeeSkillId}/restore-latest-validated")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeSkillResponseDto> restoreLatestValidated(@PathVariable UUID employeeSkillId) {
        return ResponseEntity.ok(employeeSkillService.restoreMyLatestValidated(employeeSkillId));
    }

    @GetMapping("/validation-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ValidationRequestResponseDto>> getMyValidationRequests(
            @RequestParam(required = false) ValidationRequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(validationRequestService.getMyValidationRequests(status, pageable));
    }
}

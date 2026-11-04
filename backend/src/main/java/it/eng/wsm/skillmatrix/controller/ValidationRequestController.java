package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.ApproveItemRequestDto;
import it.eng.wsm.skillmatrix.dto.request.RejectItemRequestDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationRequestResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationSkillReviewResponseDto;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.service.ValidationRequestService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/validation-requests")
@RequiredArgsConstructor
public class ValidationRequestController {

    private final ValidationRequestService validationRequestService;

    /**
     * GET /api/validation-requests
     * Accessible by ADMIN, HR, LINE_MANAGER.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<Page<ValidationRequestResponseDto>> getValidationRequests(
            @RequestParam(required = false) String employeeSearch,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) ValidationRequestStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(
                validationRequestService.getValidationRequests(employeeSearch, managerId, status, dateFrom, dateTo, pageable));
    }

    /**
     * GET /api/validation-requests/skills
     * One row per employee skill with its latest validation request item. ADMIN, HR, LINE_MANAGER (direct reports).
     */
    @GetMapping("/skills")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'LINE_MANAGER')")
    public ResponseEntity<Page<ValidationSkillReviewResponseDto>> getLatestSkillReviews(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) ValidationRequestStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(validationRequestService.getLatestSkillReviews(
                search, managerId, category, status, dateFrom, dateTo, pageable));
    }

    /**
     * GET /api/validation-requests/{id}
     * Accessible by ADMIN, HR, LINE_MANAGER, EMPLOYEE (own requests only).
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ValidationRequestResponseDto> getValidationRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(validationRequestService.getValidationRequestById(id));
    }

    /**
     * POST /api/validation-requests/{id}/items/{itemId}/approve
     * Accessible by LINE_MANAGER and ADMIN.
     */
    @PostMapping("/{id}/items/{itemId}/approve")
    @PreAuthorize("hasAnyRole('LINE_MANAGER', 'ADMIN')")
    public ResponseEntity<ValidationRequestResponseDto> approveItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody(required = false) ApproveItemRequestDto dto) {
        return ResponseEntity.ok(validationRequestService.approveItem(id, itemId, dto));
    }

    /**
     * POST /api/validation-requests/{id}/items/{itemId}/reject
     * Accessible by LINE_MANAGER and ADMIN.
     */
    @PostMapping("/{id}/items/{itemId}/reject")
    @PreAuthorize("hasAnyRole('LINE_MANAGER', 'ADMIN')")
    public ResponseEntity<ValidationRequestResponseDto> rejectItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody RejectItemRequestDto dto) {
        return ResponseEntity.ok(validationRequestService.rejectItem(id, itemId, dto));
    }

    /**
     * POST /api/validation-requests/{id}/revoke
     * Requester only, while the request is SUBMITTED and no item has been decided.
     */
    @PostMapping("/{id}/revoke")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ValidationRequestResponseDto> revokeRequest(@PathVariable UUID id) {
        return ResponseEntity.ok(validationRequestService.revokeRequest(id));
    }
}

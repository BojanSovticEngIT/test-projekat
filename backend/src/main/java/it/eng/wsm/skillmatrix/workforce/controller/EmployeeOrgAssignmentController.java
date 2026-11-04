package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.request.EmployeeHorizontalAssignmentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.request.EmployeeVerticalAssignmentRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeHorizontalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeVerticalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.EmployeeOrgAssignmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class EmployeeOrgAssignmentController {

    private final EmployeeOrgAssignmentService employeeOrgAssignmentService;

    @GetMapping("/api/employees/{employeeId}/horizontal-assignments")
    public ResponseEntity<List<EmployeeHorizontalAssignmentResponseDto>> findHorizontalAssignments(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(employeeOrgAssignmentService.findHorizontalAssignments(employeeId));
    }

    @PostMapping("/api/employees/{employeeId}/horizontal-assignments")
    public ResponseEntity<EmployeeHorizontalAssignmentResponseDto> createHorizontalAssignment(
            @PathVariable UUID employeeId,
            @Valid @RequestBody EmployeeHorizontalAssignmentRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeOrgAssignmentService.createHorizontalAssignment(employeeId, dto));
    }

    @GetMapping("/api/employees/{employeeId}/vertical-assignments")
    public ResponseEntity<List<EmployeeVerticalAssignmentResponseDto>> findVerticalAssignments(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(employeeOrgAssignmentService.findVerticalAssignments(employeeId));
    }

    @PostMapping("/api/employees/{employeeId}/vertical-assignments")
    public ResponseEntity<EmployeeVerticalAssignmentResponseDto> createVerticalAssignment(
            @PathVariable UUID employeeId,
            @Valid @RequestBody EmployeeVerticalAssignmentRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeOrgAssignmentService.createVerticalAssignment(employeeId, dto));
    }
}

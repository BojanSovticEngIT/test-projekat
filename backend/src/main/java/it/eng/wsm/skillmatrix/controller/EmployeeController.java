package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.EmployeeRequestDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeResponseDto;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import it.eng.wsm.skillmatrix.service.EmployeeService;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationHistoryResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.AllocationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final AllocationService allocationService;

    @GetMapping
    public ResponseEntity<Page<EmployeeResponseDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) UUID horizontalNodeId,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) EmploymentStatus employmentStatus,
            @RequestParam(required = false) WorkforceType workforceType,
            @RequestParam(required = false) UUID skillId,
            @RequestParam(required = false) Integer skillLevelMin,
            @RequestParam(required = false) ValidationStatus validationStatus,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(employeeService.findAll(
                search, managerId, horizontalNodeId, location, employmentStatus, workforceType,
                skillId, skillLevelMin, validationStatus, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(employeeService.findById(id));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponseDto> create(@Valid @RequestBody EmployeeRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody EmployeeRequestDto dto) {
        return ResponseEntity.ok(employeeService.update(id, dto));
    }

    @GetMapping("/{id}/allocation-history")
    public ResponseEntity<List<AllocationHistoryResponseDto>> findAllocationHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(allocationService.findHistoryByEmployeeId(id));
    }

}


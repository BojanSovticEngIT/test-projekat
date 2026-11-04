package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.response.AvailabilityResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.BenchEntryResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkforceSummaryResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.AvailabilityService;
import it.eng.wsm.skillmatrix.workforce.service.BenchService;
import it.eng.wsm.skillmatrix.workforce.service.HcViewService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workforce")
@RequiredArgsConstructor
public class WorkforceController {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final AvailabilityService availabilityService;
    private final BenchService benchService;
    private final HcViewService hcViewService;

    @GetMapping("/availability")
    public ResponseEntity<List<AvailabilityResponseDto>> getAvailability(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID horizontalNodeId,
            @RequestParam(required = false) Integer minAvailablePct) {
        LocalDate asOfDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(availabilityService.computeForAllEmployees(asOfDate, horizontalNodeId, minAvailablePct));
    }

    @GetMapping("/bench")
    public ResponseEntity<List<BenchEntryResponseDto>> getBench(
            @RequestParam(defaultValue = "0") int horizon,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
            @RequestParam(required = false) Integer minAvailablePct) {
        return ResponseEntity.ok(benchService.getBench(horizon, asOfDate, minAvailablePct));
    }

    @GetMapping("/summary")
    public ResponseEntity<WorkforceSummaryResponseDto> getSummary() {
        return ResponseEntity.ok(benchService.getSummary());
    }

    @GetMapping("/hc-view")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO', 'HR', 'HR_BUSINESS_PARTNER')")
    public ResponseEntity<HcViewResponseDto> getHeadcountView(@RequestParam(required = false) List<String> countries) {
        return ResponseEntity.ok(hcViewService.getHeadcountView(countries));
    }

    @GetMapping("/hc-view/default-countries")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO', 'HR', 'HR_BUSINESS_PARTNER')")
    public ResponseEntity<List<String>> getDefaultCountries() {
        return ResponseEntity.ok(hcViewService.getDefaultCountries());
    }

    @GetMapping("/hc-view/export.xlsx")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO', 'HR', 'HR_BUSINESS_PARTNER')")
    public ResponseEntity<byte[]> exportHeadcountView(@RequestParam(required = false) List<String> countries) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"headcount-view.xlsx\"")
                .body(hcViewService.exportExcel(countries));
    }
}

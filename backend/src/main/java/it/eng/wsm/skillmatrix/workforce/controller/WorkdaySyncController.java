package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.response.WorkdaySyncResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.WorkdaySyncService;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integration/workday")
@RequiredArgsConstructor
public class WorkdaySyncController {

    private final WorkdaySyncService workdaySyncService;

    @PostMapping("/sync")
    public ResponseEntity<WorkdaySyncResponseDto> sync(@RequestBody Map<String, Boolean> body) throws IOException {
        boolean dryRun = body.getOrDefault("dryRun", true);
        return ResponseEntity.ok(workdaySyncService.sync(dryRun));
    }
}

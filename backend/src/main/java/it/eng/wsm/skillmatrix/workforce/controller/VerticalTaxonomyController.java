package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalTaxonomyResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.VerticalTaxonomyService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vertical-taxonomy")
@RequiredArgsConstructor
public class VerticalTaxonomyController {

    private final VerticalTaxonomyService verticalTaxonomyService;

    @GetMapping
    public ResponseEntity<List<VerticalTaxonomyResponseDto>> findAll() {
        return ResponseEntity.ok(verticalTaxonomyService.findAll());
    }
}

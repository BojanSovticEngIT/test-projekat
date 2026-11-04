package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.SkillRequestDto;
import it.eng.wsm.skillmatrix.dto.response.SkillResponseDto;
import it.eng.wsm.skillmatrix.enums.SkillStatus;
import it.eng.wsm.skillmatrix.service.SkillService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping
    public ResponseEntity<Page<SkillResponseDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) SkillStatus status,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(skillService.findAll(search, categoryId, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SkillResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(skillService.findById(id));
    }

    @PostMapping
    public ResponseEntity<SkillResponseDto> create(@Valid @RequestBody SkillRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkillResponseDto> update(@PathVariable UUID id, @Valid @RequestBody SkillRequestDto dto) {
        return ResponseEntity.ok(skillService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<SkillResponseDto> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(skillService.deactivate(id));
    }
}

package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.SkillCategoryRequestDto;
import it.eng.wsm.skillmatrix.dto.response.SkillCategoryResponseDto;
import it.eng.wsm.skillmatrix.service.SkillCategoryService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/skill-categories")
@RequiredArgsConstructor
public class SkillCategoryController {

    private final SkillCategoryService skillCategoryService;

    @GetMapping
    public ResponseEntity<List<SkillCategoryResponseDto>> findAll() {
        return ResponseEntity.ok(skillCategoryService.findAll());
    }

    @PostMapping
    public ResponseEntity<SkillCategoryResponseDto> create(@Valid @RequestBody SkillCategoryRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillCategoryService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkillCategoryResponseDto> update(
            @PathVariable UUID id,
            @Valid @RequestBody SkillCategoryRequestDto dto) {
        return ResponseEntity.ok(skillCategoryService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        skillCategoryService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}

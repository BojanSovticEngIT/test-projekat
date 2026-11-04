package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.dto.request.SkillCategoryRequestDto;
import it.eng.wsm.skillmatrix.dto.response.SkillCategoryResponseDto;
import it.eng.wsm.skillmatrix.entity.SkillCategory;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.SkillCategoryMapper;
import it.eng.wsm.skillmatrix.repository.SkillCategoryRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SkillCategoryService {

    private final SkillCategoryRepository skillCategoryRepository;
    private final SkillCategoryMapper skillCategoryMapper;
    private final AuditService auditService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SkillCategoryResponseDto> findAll() {
        return skillCategoryRepository.findAllByActiveTrue().stream()
                .sorted(Comparator.comparing(SkillCategory::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponseDtoWithCount)
                .toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public SkillCategoryResponseDto create(SkillCategoryRequestDto dto) {
        User currentUser = resolveCurrentUser();
        String name = normalizeName(dto.getName());
        if (skillCategoryRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("Skill category with name '" + name + "' already exists");
        }

        SkillCategory skillCategory = skillCategoryMapper.toEntity(dto);
        skillCategory.setName(name);
        skillCategory.setDescription(normalizeDescription(dto.getDescription()));

        SkillCategory savedSkillCategory = skillCategoryRepository.save(skillCategory);
        SkillCategoryResponseDto responseDto = toResponseDtoWithCount(savedSkillCategory);
        auditService.log("SkillCategory", savedSkillCategory.getId(), AuditAction.CREATE, currentUser, null, responseDto, null);
        return responseDto;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public SkillCategoryResponseDto update(UUID id, SkillCategoryRequestDto dto) {
        User currentUser = resolveCurrentUser();
        SkillCategory skillCategory = findCategoryOrThrow(id);
        String name = normalizeName(dto.getName());
        if (skillCategoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("Skill category with name '" + name + "' already exists");
        }

        SkillCategoryResponseDto oldDto = toResponseDtoWithCount(skillCategory);

        skillCategory.setName(name);
        skillCategory.setDescription(normalizeDescription(dto.getDescription()));

        SkillCategory updatedSkillCategory = skillCategoryRepository.save(skillCategory);
        SkillCategoryResponseDto newDto = toResponseDtoWithCount(updatedSkillCategory);
        auditService.log("SkillCategory", id, AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deactivate(UUID id) {
        User currentUser = resolveCurrentUser();
        SkillCategory skillCategory = findCategoryOrThrow(id);
        if (skillCategoryRepository.hasActiveSkills(id)) {
            throw new IllegalStateException("Cannot deactivate category with active skills");
        }

        SkillCategoryResponseDto oldDto = toResponseDtoWithCount(skillCategory);
        skillCategory.setActive(false);
        skillCategoryRepository.save(skillCategory);
        auditService.log("SkillCategory", id, AuditAction.DELETE, currentUser, oldDto, null, null);
    }

    private SkillCategoryResponseDto toResponseDtoWithCount(SkillCategory entity) {
        SkillCategoryResponseDto dto = skillCategoryMapper.toResponseDto(entity);
        dto.setSkillCount(skillCategoryRepository.countSkillsByCategoryId(entity.getId()));
        return dto;
    }

    private SkillCategory findCategoryOrThrow(UUID id) {
        return skillCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill category not found with id: " + id));
    }

    private String normalizeName(String name) {
        return name == null ? null : name.trim();
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }

        String normalized = description.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}

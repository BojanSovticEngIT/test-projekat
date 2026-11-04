package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.dto.request.SkillRequestDto;
import it.eng.wsm.skillmatrix.dto.response.SkillResponseDto;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.SkillCategory;
import it.eng.wsm.skillmatrix.entity.SkillTag;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.SkillStatus;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.SkillMapper;
import it.eng.wsm.skillmatrix.repository.SkillCategoryRepository;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.repository.SkillTagRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SkillService {

    private final SkillRepository skillRepository;
    private final SkillCategoryRepository skillCategoryRepository;
    private final SkillTagRepository skillTagRepository;
    private final SkillMapper skillMapper;
    private final AuditService auditService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<SkillResponseDto> findAll(String search, UUID categoryId, SkillStatus status, Pageable pageable) {
        return skillRepository.findAll(buildSpecification(search, categoryId, status), pageable)
                .map(skillMapper::toResponseDto);
    }

    @Transactional(readOnly = true)
    public SkillResponseDto findById(UUID id) {
        return skillMapper.toResponseDto(findSkillOrThrow(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public SkillResponseDto create(SkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        String name = normalizeName(dto.getName());
        if (skillRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("Skill with name '" + name + "' already exists");
        }

        Skill skill = new Skill();
        skill.setName(name);
        skill.setDescription(normalizeDescription(dto.getDescription()));
        skill.setCategory(findCategoryOrThrow(dto.getCategoryId()));
        skill.setTags(resolveTags(dto.getTags()));
        skill.setStatus(SkillStatus.ACTIVE);

        Skill savedSkill = skillRepository.save(skill);
        SkillResponseDto responseDto = skillMapper.toResponseDto(savedSkill);
        auditService.log("Skill", savedSkill.getId(), AuditAction.CREATE, currentUser, null, responseDto, null);
        return responseDto;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public SkillResponseDto update(UUID id, SkillRequestDto dto) {
        User currentUser = resolveCurrentUser();
        Skill skill = findSkillOrThrow(id);
        String name = normalizeName(dto.getName());
        if (skillRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("Skill with name '" + name + "' already exists");
        }

        SkillResponseDto oldDto = skillMapper.toResponseDto(skill);

        skill.setName(name);
        skill.setDescription(normalizeDescription(dto.getDescription()));
        skill.setCategory(findCategoryOrThrow(dto.getCategoryId()));
        skill.setTags(resolveTags(dto.getTags()));

        Skill updatedSkill = skillRepository.save(skill);
        SkillResponseDto newDto = skillMapper.toResponseDto(updatedSkill);
        auditService.log("Skill", id, AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public SkillResponseDto deactivate(UUID id) {
        User currentUser = resolveCurrentUser();
        Skill skill = findSkillOrThrow(id);
        SkillResponseDto oldDto = skillMapper.toResponseDto(skill);
        if (skillRepository.isUsedInEmployeeSkill(id)) {
            skill.setStatus(SkillStatus.DEPRECATED);
        } else {
            skill.setStatus(SkillStatus.INACTIVE);
        }

        Skill saved = skillRepository.save(skill);
        auditService.log("Skill", id, AuditAction.DELETE, currentUser, oldDto, skillMapper.toResponseDto(saved), null);
        return skillMapper.toResponseDto(saved);
    }

    private Specification<Skill> buildSpecification(String search, UUID categoryId, SkillStatus status) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        "%" + search.trim().toLowerCase(Locale.ROOT) + "%"));
            }

            if (categoryId != null) {
                predicates.add(criteriaBuilder.equal(root.get("category").get("id"), categoryId));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (predicates.isEmpty()) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Skill findSkillOrThrow(UUID id) {
        return skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + id));
    }

    private SkillCategory findCategoryOrThrow(UUID id) {
        return skillCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill category not found with id: " + id));
    }

    private Set<SkillTag> resolveTags(List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return new LinkedHashSet<>();
        }

        LinkedHashMap<String, String> normalizedTags = new LinkedHashMap<>();
        for (String tagName : tagNames) {
            if (tagName == null) {
                continue;
            }

            String normalized = tagName.trim();
            if (normalized.isEmpty()) {
                continue;
            }

            normalizedTags.putIfAbsent(normalized.toLowerCase(Locale.ROOT), normalized);
        }

        Set<SkillTag> resolvedTags = new LinkedHashSet<>();
        for (String normalizedTag : normalizedTags.values()) {
            SkillTag skillTag = skillTagRepository.findByNameIgnoreCase(normalizedTag)
                    .orElseGet(() -> skillTagRepository.save(SkillTag.builder()
                            .name(normalizedTag)
                            .build()));
            resolvedTags.add(skillTag);
        }

        return resolvedTags;
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

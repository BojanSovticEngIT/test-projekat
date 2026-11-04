package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.SkillStatus;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.workforce.dto.request.EngagementSkillRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EngagementSkillResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.entity.EngagementSkill;
import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import it.eng.wsm.skillmatrix.workforce.mapper.EngagementSkillMapper;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EngagementSkillRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EngagementSkillService {

    private final EngagementSkillRepository engagementSkillRepository;
    private final AllocationRepository allocationRepository;
    private final SkillRepository skillRepository;
    private final EngagementSkillMapper engagementSkillMapper;
    private final EngagementSkillEventPublisher eventPublisher;
    private final ScopeService scopeService;
    private final WorkforceSecuritySupport securitySupport;

    @Transactional(readOnly = true)
    public List<EngagementSkillResponseDto> findByAllocationId(UUID allocationId) {
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanRead(securitySupport.resolveCurrentUser(), allocation);
        return engagementSkillRepository.findByAllocationIdOrderByRecordedAtAsc(allocationId).stream()
                .map(engagementSkillMapper::toResponseDto)
                .toList();
    }

    public EngagementSkillResponseDto addSkill(UUID allocationId, EngagementSkillRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanWrite(currentUser, allocation);
        assertWritableLifecycle(allocation);

        Skill skill = skillRepository.findById(dto.getSkillId())
                .orElseThrow(() -> new IllegalArgumentException("Skill not found in catalog: " + dto.getSkillId()));
        if (skill.getStatus() != SkillStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active catalog skills can be recorded on engagements");
        }

        if (engagementSkillRepository.existsByAllocationIdAndSkillId(allocationId, dto.getSkillId())) {
            throw new DuplicateResourceException("Skill already recorded on this allocation");
        }

        EngagementSkill engagementSkill = EngagementSkill.builder()
                .allocation(allocation)
                .skill(skill)
                .levelUsed(dto.getLevelUsed())
                .primarySkill(dto.isPrimarySkill())
                .recordedBy(currentUser)
                .build();

        EngagementSkill saved = engagementSkillRepository.save(engagementSkill);
        eventPublisher.publish(allocationId);
        return engagementSkillMapper.toResponseDto(saved);
    }

    public EngagementSkillResponseDto updateSkill(UUID allocationId, UUID skillId, EngagementSkillRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        Allocation allocation = getAllocationOrThrow(allocationId);
        assertCanWrite(currentUser, allocation);
        assertWritableLifecycle(allocation);

        if (!skillId.equals(dto.getSkillId())) {
            throw new IllegalArgumentException("Path skillId must match request body skillId");
        }

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Skill not found in catalog: " + skillId));
        if (skill.getStatus() != SkillStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active catalog skills can be recorded on engagements");
        }

        EngagementSkill engagementSkill = engagementSkillRepository.findByAllocationIdAndSkillId(allocationId, skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Engagement skill not found for allocation"));

        engagementSkill.setLevelUsed(dto.getLevelUsed());
        engagementSkill.setPrimarySkill(dto.isPrimarySkill());
        engagementSkill.setRecordedBy(currentUser);

        EngagementSkill saved = engagementSkillRepository.save(engagementSkill);
        eventPublisher.publish(allocationId);
        return engagementSkillMapper.toResponseDto(saved);
    }

    private void assertWritableLifecycle(Allocation allocation) {
        AllocationLifecycleStatus lifecycle =
                AllocationLifecycleSupport.getLifecycleStatus(allocation, LocalDate.now());
        if (lifecycle == AllocationLifecycleStatus.PIPELINE) {
            throw new IllegalArgumentException("Engagement skills cannot be recorded before allocation starts");
        }
        if (lifecycle == AllocationLifecycleStatus.TERMINATED) {
            throw new IllegalArgumentException("Engagement skills are read-only after allocation ends");
        }
    }

    private void assertCanWrite(User currentUser, Allocation allocation) {
        if (currentUser.getRole() == UserRole.ADMIN || currentUser.getRole() == UserRole.PMO) {
            return;
        }
        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            if (!scopeService.getDirectReportIds(currentUser).contains(allocation.getEmployee().getId())) {
                throw new AccessDeniedException("Line managers can only record skills for direct reports");
            }
            return;
        }
        throw new AccessDeniedException("You do not have permission to modify engagement skills");
    }

    private void assertCanRead(User currentUser, Allocation allocation) {
        if (currentUser.getRole() == UserRole.EMPLOYEE) {
            if (!scopeService.canAccessEmployee(currentUser, allocation.getEmployee().getId())) {
                throw new AccessDeniedException("You do not have permission to view these engagement skills");
            }
            return;
        }
        if (scopeService.isOrgWide(currentUser) || currentUser.getRole() == UserRole.HR) {
            return;
        }
        if (!scopeService.canAccessEmployee(currentUser, allocation.getEmployee().getId())) {
            throw new AccessDeniedException("You do not have permission to view these engagement skills");
        }
    }

    private Allocation getAllocationOrThrow(UUID allocationId) {
        return allocationRepository.findById(allocationId)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));
    }
}

package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.ProjectRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Client;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.entity.Project;
import it.eng.wsm.skillmatrix.workforce.entity.ProjectManager;
import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.ProjectRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private static final String ENTITY_NAME = "Project";

    private final ProjectRepository projectRepository;
    private final AllocationRepository allocationRepository;
    private final ClientService clientService;
    private final ProjectManagerService projectManagerService;
    private final HorizontalNodeService horizontalNodeService;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    public Page<ProjectResponseDto> findAll(
            ProjectStatus status,
            UUID clientId,
            UUID horizontalNodeId,
            UUID projectManagerId,
            String search,
            String client,
            String projectManager,
            String horizontal,
            Pageable pageable) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        syncStatuses();

        return projectRepository.findAll(
                        buildSpecification(
                                status, clientId, horizontalNodeId, projectManagerId, search,
                                client, projectManager, horizontal),
                        pageable)
                .map(workforceMapper::toProjectResponseDto);
    }

    public ProjectResponseDto findById(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        syncStatuses();
        return workforceMapper.toProjectResponseDto(findProjectOrThrow(id));
    }

    public List<ProjectResponseDto> findByClientId(UUID clientId) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        clientService.findById(clientId);
        syncStatuses();
        return projectRepository.findByClientId(clientId).stream()
                .map(workforceMapper::toProjectResponseDto)
                .toList();
    }

    /** PIPELINE -> ACTIVE once the start date is reached, then ACTIVE -> CLOSED once the end date has passed. */
    public void syncStatuses() {
        LocalDate today = LocalDate.now();
        List<Project> started = projectRepository.findByStatusAndStartDateLessThanEqual(ProjectStatus.PIPELINE, today);
        started.forEach(project -> project.setStatus(ProjectStatus.ACTIVE));
        projectRepository.saveAll(started);

        List<Project> ended = projectRepository.findByStatusAndEndDateLessThan(ProjectStatus.ACTIVE, today);
        ended.forEach(project -> project.setStatus(ProjectStatus.CLOSED));
        projectRepository.saveAll(ended);
    }

    public ProjectResponseDto create(ProjectRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);
        validateDates(dto);
        validateUniqueCode(dto.getCode(), null);

        Project project = new Project();
        applyRequest(dto, project);
        Project saved = projectRepository.save(project);

        ProjectResponseDto response = workforceMapper.toProjectResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    public ProjectResponseDto update(UUID id, ProjectRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);
        validateDates(dto);
        validateUniqueCode(dto.getCode(), id);

        Project project = findProjectOrThrow(id);
        ProjectResponseDto oldDto = workforceMapper.toProjectResponseDto(project);
        applyRequest(dto, project);
        Project saved = projectRepository.save(project);

        ProjectResponseDto newDto = workforceMapper.toProjectResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    public void delete(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        Project project = findProjectOrThrow(id);
        if (allocationRepository.existsByProjectId(id)) {
            throw new IllegalStateException("Cannot delete a project that has allocations");
        }
        ProjectResponseDto oldDto = workforceMapper.toProjectResponseDto(project);
        projectRepository.delete(project);
        auditService.logWorkforceAction(ENTITY_NAME, id, AuditAction.DELETE, currentUser, oldDto, null, null);
    }

    Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private void applyRequest(ProjectRequestDto dto, Project project) {
        Client client = dto.getClientId() != null ? clientService.findClientOrThrow(dto.getClientId()) : null;
        project.setClient(client);
        project.setProjectManager(resolveProjectManager(dto.getProjectManagerId()));
        project.setProjectManagerName(trimToNull(dto.getProjectManagerName()));
        project.setHorizontalNode(resolveHorizontalNode(dto.getHorizontalNodeId()));
        project.setName(dto.getName().trim());
        project.setCode(dto.getCode().trim().toUpperCase(Locale.ROOT));
        project.setStatus(dto.getStatus());
        project.setStartDate(dto.getStartDate());
        project.setEndDate(dto.getEndDate());
        project.setNotes(trimToNull(dto.getNotes()));
    }

    private ProjectManager resolveProjectManager(UUID projectManagerId) {
        if (projectManagerId == null) {
            return null;
        }
        return projectManagerService.findProjectManagerOrThrow(projectManagerId);
    }

    private HorizontalNode resolveHorizontalNode(UUID horizontalNodeId) {
        if (horizontalNodeId == null) {
            return null;
        }
        return horizontalNodeService.findNodeOrThrow(horizontalNodeId);
    }

    private void validateUniqueCode(String code, UUID excludeId) {
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        boolean exists = excludeId == null
                ? projectRepository.existsByCode(normalized)
                : projectRepository.existsByCodeAndIdNot(normalized, excludeId);
        if (exists) {
            throw new DuplicateResourceException("Project with code '" + normalized + "' already exists");
        }
    }

    private void validateDates(ProjectRequestDto dto) {
        if (dto.getStartDate() != null && dto.getEndDate() != null && dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("start_date must be on or before end_date");
        }
    }

    private Specification<Project> buildSpecification(
            ProjectStatus status,
            UUID clientId,
            UUID horizontalNodeId,
            UUID projectManagerId,
            String search,
            String client,
            String projectManager,
            String horizontal) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("client").get("id"), clientId));
            }
            if (horizontalNodeId != null) {
                predicates.add(cb.equal(root.get("horizontalNode").get("id"), horizontalNodeId));
            }
            if (projectManagerId != null) {
                predicates.add(cb.equal(root.get("projectManager").get("id"), projectManagerId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern)));
            }

            if (client != null && !client.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.join("client", JoinType.LEFT).get("name")), likePattern(client)));
            }
            if (projectManager != null && !projectManager.isBlank()) {
                Join<Object, Object> employee = root.join("projectManager", JoinType.LEFT).join("employee", JoinType.LEFT);
                String pattern = likePattern(projectManager);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("projectManagerName")), pattern),
                        cb.like(cb.lower(cb.concat(cb.concat(employee.get("firstName"), " "), employee.get("lastName"))),
                                pattern)));
            }
            if (horizontal != null && !horizontal.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.join("horizontalNode", JoinType.LEFT).get("name")), likePattern(horizontal)));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static String likePattern(String value) {
        return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

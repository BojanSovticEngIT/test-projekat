package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.DuplicateResourceException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.ProjectManagerRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectManagerResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.ProjectManager;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.ProjectManagerRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectManagerService {

    private static final String ENTITY_NAME = "ProjectManager";

    private final ProjectManagerRepository projectManagerRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    @Transactional(readOnly = true)
    public List<ProjectManagerResponseDto> findAllActive() {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        return projectManagerRepository.findByActiveTrueOrderByEmployee_LastNameAscEmployee_FirstNameAsc().stream()
                .map(workforceMapper::toProjectManagerResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectManagerResponseDto findById(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        return workforceMapper.toProjectManagerResponseDto(findProjectManagerOrThrow(id));
    }

    public ProjectManagerResponseDto create(ProjectManagerRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        if (projectManagerRepository.existsByEmployeeId(dto.getEmployeeId())) {
            throw new DuplicateResourceException("A project manager profile already exists for this employee");
        }

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + dto.getEmployeeId()));

        ProjectManager projectManager = ProjectManager.builder()
                .employee(employee)
                .notes(trimToNull(dto.getNotes()))
                .active(dto.getActive() == null || dto.getActive())
                .build();

        ProjectManager saved = projectManagerRepository.save(projectManager);
        ProjectManagerResponseDto response = workforceMapper.toProjectManagerResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    ProjectManager findProjectManagerOrThrow(UUID id) {
        return projectManagerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project manager not found with id: " + id));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

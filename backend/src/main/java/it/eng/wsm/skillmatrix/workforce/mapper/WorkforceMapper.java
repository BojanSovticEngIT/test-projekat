package it.eng.wsm.skillmatrix.workforce.mapper;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.workforce.dto.response.ClientResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeHorizontalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.EmployeeVerticalAssignmentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HorizontalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectManagerResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ProjectResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalTaxonomyResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Client;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeHorizontalAssignment;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeVerticalAssignment;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.entity.Project;
import it.eng.wsm.skillmatrix.workforce.entity.ProjectManager;
import it.eng.wsm.skillmatrix.workforce.entity.VerticalTaxonomy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface WorkforceMapper {

    ClientResponseDto toClientResponseDto(Client entity);

    @Mapping(target = "parentId", source = "parent.id")
    HorizontalNodeResponseDto toHorizontalNodeResponseDto(HorizontalNode entity);

    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeName", source = "employee", qualifiedByName = "employeeName")
    ProjectManagerResponseDto toProjectManagerResponseDto(ProjectManager entity);

    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", source = "client.name")
    @Mapping(target = "verticalN1", source = "client.verticalN1")
    @Mapping(target = "verticalN2", source = "client.verticalN2")
    @Mapping(target = "projectManagerId", source = "projectManager.id")
    @Mapping(target = "projectManagerName", expression = "java(resolveProjectManagerName(entity))")
    @Mapping(target = "horizontalNodeId", source = "horizontalNode.id")
    @Mapping(target = "horizontalNodeName", source = "horizontalNode.name")
    ProjectResponseDto toProjectResponseDto(Project entity);

    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "horizontalNodeId", source = "horizontalNode.id")
    @Mapping(target = "horizontalNodeName", source = "horizontalNode.name")
    EmployeeHorizontalAssignmentResponseDto toHorizontalAssignmentResponseDto(EmployeeHorizontalAssignment entity);

    @Mapping(target = "employeeId", source = "employee.id")
    EmployeeVerticalAssignmentResponseDto toVerticalAssignmentResponseDto(EmployeeVerticalAssignment entity);

    @Mapping(target = "parentId", source = "parent.id")
    VerticalNodeResponseDto toVerticalNodeResponseDto(VerticalTaxonomy entity);

    VerticalTaxonomyResponseDto toVerticalTaxonomyResponseDto(VerticalTaxonomy entity);

    @Named("employeeName")
    default String employeeName(Employee employee) {
        if (employee == null) {
            return null;
        }
        return employee.getFirstName() + " " + employee.getLastName();
    }

    @Named("projectManagerName")
    default String projectManagerName(ProjectManager projectManager) {
        return projectManager == null ? null : employeeName(projectManager.getEmployee());
    }

    default String resolveProjectManagerName(Project project) {
        return project.getProjectManagerName() != null
                ? project.getProjectManagerName()
                : projectManagerName(project.getProjectManager());
    }
}

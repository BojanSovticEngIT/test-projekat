package it.eng.wsm.skillmatrix.workforce.mapper;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationCommentResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationHistoryResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.AllocationResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.entity.AllocationComment;
import it.eng.wsm.skillmatrix.workforce.entity.AllocationHistory;
import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import it.eng.wsm.skillmatrix.workforce.service.AllocationLifecycleSupport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface AllocationMapper {

    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeName", source = "employee", qualifiedByName = "employeeName")
    @Mapping(target = "projectId", source = "project.id")
    @Mapping(target = "projectName", source = "project.name")
    @Mapping(target = "projectCode", source = "project.code")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "updatedById", source = "updatedBy.id")
    @Mapping(target = "lifecycleStatus", source = "entity", qualifiedByName = "lifecycleStatus")
    AllocationResponseDto toResponseDto(Allocation entity);

    @Mapping(target = "allocationId", source = "allocation.id")
    @Mapping(target = "changedById", source = "changedBy.id")
    @Mapping(target = "changedByName", source = "changedBy", qualifiedByName = "userName")
    AllocationHistoryResponseDto toHistoryResponseDto(AllocationHistory entity);

    @Mapping(target = "allocationId", source = "allocation.id")
    @Mapping(target = "authorId", source = "author.id")
    @Mapping(target = "authorName", source = "author", qualifiedByName = "userName")
    AllocationCommentResponseDto toCommentResponseDto(AllocationComment entity);

    @Named("employeeName")
    default String employeeName(Employee employee) {
        if (employee == null) {
            return null;
        }
        return employee.getFirstName() + " " + employee.getLastName();
    }

    @Named("userName")
    default String userName(User user) {
        if (user == null) {
            return null;
        }
        return user.getUsername();
    }

    @Named("lifecycleStatus")
    default AllocationLifecycleStatus lifecycleStatus(Allocation allocation) {
        return AllocationLifecycleSupport.getLifecycleStatus(allocation, java.time.LocalDate.now());
    }
}

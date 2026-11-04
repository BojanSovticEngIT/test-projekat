package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.EmployeeResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSummaryDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.enums.CostCode;
import it.eng.wsm.skillmatrix.enums.Seniority;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(target = "managerId", source = "manager.id")
    @Mapping(target = "managerName", source = "manager", qualifiedByName = "toManagerName")
    @Mapping(target = "seniority", source = "costCode", qualifiedByName = "toSeniority")
    @Mapping(target = "organizationUnit", ignore = true)
    EmployeeResponseDto toResponseDto(Employee entity);

    EmployeeSummaryDto toSummaryDto(Employee entity);

    @Named("toSeniority")
    default Seniority toSeniority(CostCode costCode) {
        return costCode == null ? null : costCode.getSeniority();
    }

    @Named("toManagerName")
    default String toManagerName(Employee manager) {
        if (manager == null) {
            return null;
        }
        return manager.getFirstName() + " " + manager.getLastName();
    }
}


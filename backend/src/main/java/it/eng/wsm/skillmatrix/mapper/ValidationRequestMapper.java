package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.ValidationRequestItemResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ValidationRequestResponseDto;
import it.eng.wsm.skillmatrix.entity.ValidationRequest;
import it.eng.wsm.skillmatrix.entity.ValidationRequestItem;
import it.eng.wsm.skillmatrix.enums.KnowledgeLevel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface ValidationRequestMapper {

    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeName", expression = "java(entity.getEmployee().getFirstName() + \" \" + entity.getEmployee().getLastName())")
    @Mapping(target = "submittedById", source = "submittedBy.id")
    @Mapping(target = "reviewedById", source = "reviewedBy.id")
    @Mapping(target = "itemCount", expression = "java(entity.getItems().size())")
    ValidationRequestResponseDto toResponseDto(ValidationRequest entity);

    @Mapping(target = "selfAssessedLevelCode", source = "selfAssessedLevel", qualifiedByName = "levelCode")
    @Mapping(target = "managerValidatedLevelCode", source = "managerValidatedLevel", qualifiedByName = "nullableLevelCode")
    ValidationRequestItemResponseDto toItemResponseDto(ValidationRequestItem entity);

    @Named("levelCode")
    default String mapLevelCode(Integer level) {
        if (level == null) return null;
        return KnowledgeLevel.fromValue(level).name();
    }

    @Named("nullableLevelCode")
    default String mapNullableLevelCode(Integer level) {
        if (level == null) return null;
        return KnowledgeLevel.fromValue(level).name();
    }
}

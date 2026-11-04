package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillRevisionResponseDto;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.EmployeeSkillHistory;
import it.eng.wsm.skillmatrix.enums.KnowledgeLevel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface EmployeeSkillMapper {

    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "skillId", source = "skill.id")
    @Mapping(target = "skillName", source = "skill.name")
    @Mapping(target = "categoryId", source = "skill.category.id")
    @Mapping(target = "categoryName", source = "skill.category.name")
    @Mapping(target = "selfAssessedLevelCode", source = "selfAssessedLevel", qualifiedByName = "levelCode")
    @Mapping(target = "managerValidatedLevelCode", source = "managerValidatedLevel", qualifiedByName = "nullableLevelCode")
    EmployeeSkillResponseDto toResponseDto(EmployeeSkill entity);

    @Mapping(target = "selfAssessedLevelCode", source = "selfAssessedLevel", qualifiedByName = "levelCode")
    @Mapping(target = "managerValidatedLevelCode", source = "managerValidatedLevel", qualifiedByName = "nullableLevelCode")
    @Mapping(target = "changedByUserId", source = "changedByUser.id")
    EmployeeSkillRevisionResponseDto toRevisionDto(EmployeeSkillHistory entity);

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

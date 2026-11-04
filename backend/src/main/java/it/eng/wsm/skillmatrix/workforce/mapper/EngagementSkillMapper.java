package it.eng.wsm.skillmatrix.workforce.mapper;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.workforce.dto.response.EngagementSkillResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.EngagementSkill;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface EngagementSkillMapper {

    @Mapping(target = "allocationId", source = "allocation.id")
    @Mapping(target = "skillId", source = "skill.id")
    @Mapping(target = "skillName", source = "skill.name")
    @Mapping(target = "recordedById", source = "recordedBy.id")
    @Mapping(target = "recordedByName", source = "recordedBy", qualifiedByName = "userName")
    EngagementSkillResponseDto toResponseDto(EngagementSkill entity);

    @Named("userName")
    default String userName(User user) {
        return user == null ? null : user.getUsername();
    }
}

package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.SkillResponseDto;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.SkillTag;
import java.util.List;
import java.util.Set;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SkillMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "tags", source = "tags")
    SkillResponseDto toResponseDto(Skill entity);

    default List<String> mapTags(Set<SkillTag> tags) {
        if (tags == null) {
            return List.of();
        }

        return tags.stream()
                .map(SkillTag::getName)
                .toList();
    }
}

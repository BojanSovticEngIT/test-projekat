package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.request.SkillCategoryRequestDto;
import it.eng.wsm.skillmatrix.dto.response.SkillCategoryResponseDto;
import it.eng.wsm.skillmatrix.entity.SkillCategory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SkillCategoryMapper {

    SkillCategoryResponseDto toResponseDto(SkillCategory entity);

    SkillCategory toEntity(SkillCategoryRequestDto dto);
}

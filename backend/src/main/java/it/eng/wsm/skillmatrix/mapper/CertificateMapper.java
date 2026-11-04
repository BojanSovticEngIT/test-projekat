package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.entity.Certificate;
import it.eng.wsm.skillmatrix.entity.Skill;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CertificateMapper {

    @Mapping(target = "documentFileName", source = "fileName")
    @Mapping(target = "documentSize", source = "fileSize")
    CertificateResponseDto toResponseDto(Certificate entity);

    CertificateResponseDto.Skill toSkillDto(Skill skill);

    default List<CertificateResponseDto.Skill> mapSkills(Set<Skill> skills) {
        if (skills == null) {
            return List.of();
        }
        return skills.stream()
                .sorted(Comparator.comparing(Skill::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toSkillDto)
                .toList();
    }
}

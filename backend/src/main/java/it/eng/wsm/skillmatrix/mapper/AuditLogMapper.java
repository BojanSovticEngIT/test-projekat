package it.eng.wsm.skillmatrix.mapper;

import it.eng.wsm.skillmatrix.dto.response.AuditLogResponseDto;
import it.eng.wsm.skillmatrix.entity.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuditLogMapper {

    @Mapping(target = "changedById", source = "changedBy.id")
    AuditLogResponseDto toResponseDto(AuditLog auditLog);
}

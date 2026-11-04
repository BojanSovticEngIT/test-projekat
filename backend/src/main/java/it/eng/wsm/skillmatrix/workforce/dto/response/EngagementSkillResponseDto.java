package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.enums.EngagementSkillLevel;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EngagementSkillResponseDto {

    private UUID id;
    private UUID allocationId;
    private UUID skillId;
    private String skillName;
    private EngagementSkillLevel levelUsed;
    private boolean primarySkill;
    private UUID recordedById;
    private String recordedByName;
    private Instant recordedAt;
}

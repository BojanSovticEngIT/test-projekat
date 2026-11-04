package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.enums.EngagementSkillLevel;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

@Data
public class EngagementSkillRequestDto {

    @NotNull
    private UUID skillId;

    @NotNull
    private EngagementSkillLevel levelUsed;

    private boolean primarySkill;
}

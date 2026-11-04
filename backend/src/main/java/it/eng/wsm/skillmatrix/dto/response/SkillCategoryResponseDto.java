package it.eng.wsm.skillmatrix.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillCategoryResponseDto {

    private UUID id;
    private String name;
    private String description;
    private boolean active;
    private int skillCount;
    private Instant createdAt;
}

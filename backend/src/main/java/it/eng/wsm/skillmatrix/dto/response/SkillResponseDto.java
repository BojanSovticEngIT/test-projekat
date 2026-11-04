package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.SkillStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponseDto {

    private UUID id;
    private String name;
    private String description;
    private UUID categoryId;
    private String categoryName;
    private SkillStatus status;
    private List<String> tags;
    private Instant createdAt;
    private Instant updatedAt;
}

package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillRequestDto {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private UUID categoryId;

    private List<String> tags = new ArrayList<>();
}

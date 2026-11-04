package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillCategoryRequestDto {

    @NotBlank
    private String name;

    private String description;
}

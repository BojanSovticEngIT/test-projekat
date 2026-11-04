package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.Data;

@Data
public class VerticalNodeRequestDto {

    private UUID parentId;

    @NotNull
    private Short level;

    @NotBlank
    private String name;

    private String code;

    @Size(max = 200)
    private String leader;

    private Boolean active;
}

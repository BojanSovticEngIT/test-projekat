package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AllocationCommentRequestDto {

    @NotBlank
    private String commentText;
}

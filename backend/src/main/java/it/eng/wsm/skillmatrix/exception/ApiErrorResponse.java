package it.eng.wsm.skillmatrix.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiErrorResponse {

    private Instant timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    @Builder.Default
    private List<FieldError> fieldErrors = List.of();
    /** Only set for a duplicate demand external ID (Module 3, D-16). Omitted otherwise. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String duplicateCode;

    public record FieldError(String field, String message) {
    }
}

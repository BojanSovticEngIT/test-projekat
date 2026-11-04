package it.eng.wsm.skillmatrix.exception;

import java.util.List;
import lombok.Getter;

@Getter
public class ImportValidationException extends RuntimeException {

    private final List<String> errors;

    public ImportValidationException(String message, List<String> errors) {
        super(message);
        this.errors = List.copyOf(errors);
    }
}

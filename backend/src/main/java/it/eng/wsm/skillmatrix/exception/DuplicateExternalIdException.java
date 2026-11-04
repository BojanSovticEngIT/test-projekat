package it.eng.wsm.skillmatrix.exception;

import lombok.Getter;

/**
 * Another demand already uses the external ID (D-16). Returned as 409 with {@code duplicateCode}, so the user can
 * confirm and save again with {@code force=true}.
 */
@Getter
public class DuplicateExternalIdException extends DuplicateResourceException {

    private final String duplicateCode;

    public DuplicateExternalIdException(String duplicateCode) {
        super(duplicateCode + " already uses this external ID.");
        this.duplicateCode = duplicateCode;
    }
}


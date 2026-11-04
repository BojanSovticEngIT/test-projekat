package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.UserRole;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserInfoDto {

    private UUID id;
    private String username;
    private String email;
    private UserRole role;
    private UUID employeeId;
}

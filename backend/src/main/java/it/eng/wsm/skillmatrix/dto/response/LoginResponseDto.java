package it.eng.wsm.skillmatrix.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponseDto {

    private String token;
    private UserInfoDto user;
}

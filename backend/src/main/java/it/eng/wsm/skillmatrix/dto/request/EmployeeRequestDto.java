package it.eng.wsm.skillmatrix.dto.request;

import it.eng.wsm.skillmatrix.enums.CostCode;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequestDto {

    private String employeeNumber;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    private String jobTitle;

    private String jobProfile;

    @NotBlank
    private String location;

    private UUID managerId;

    private EmploymentStatus employmentStatus;

    private WorkforceType workforceType;

    private CostCode costCode;
}


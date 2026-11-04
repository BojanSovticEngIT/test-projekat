package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.CostCode;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.Seniority;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDto {

    private UUID id;
    private String employeeNumber;
    private String firstName;
    private String lastName;
    private String email;
    private String jobTitle;
    private String jobProfile;
    private String organizationUnit;
    private String location;
    private UUID managerId;
    private String managerName;
    private EmploymentStatus employmentStatus;
    private BigDecimal contractFte;
    private WorkforceType workforceType;
    private CostCode costCode;
    private Seniority seniority;
    private Instant createdAt;
    private Instant updatedAt;
}


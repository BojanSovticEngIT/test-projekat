package it.eng.wsm.skillmatrix.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSummaryDto {

    private UUID id;
    private String employeeNumber;
    private String firstName;
    private String lastName;
    private String email;
}


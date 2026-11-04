package it.eng.wsm.skillmatrix.workforce.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

/** Read-only mapping of the employee_current_horizontal view: the horizontal node of an employee's latest allocation. */
@Entity
@Immutable
@Table(name = "employee_current_horizontal")
@Getter
@NoArgsConstructor
public class EmployeeCurrentHorizontal {

    @Id
    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "horizontal_node_id", nullable = false)
    private UUID horizontalNodeId;
}

package it.eng.wsm.skillmatrix.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "hr_bp_org_unit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HrBpOrgUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "horizontal_node_id")
    private UUID horizontalNodeId;

    // Legacy free-text unit, kept only for rows that could not be mapped to a horizontal node.
    @Column(name = "organization_unit", length = 200)
    private String organizationUnit;
}

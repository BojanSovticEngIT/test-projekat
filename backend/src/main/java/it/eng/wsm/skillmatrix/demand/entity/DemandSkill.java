package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.entity.Skill;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "demand_skill")
@Getter
@Setter
@NoArgsConstructor
public class DemandSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demand_id", nullable = false)
    private Demand demand;

    /** Module 1 catalog skill, when the name matches a catalog entry. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id")
    private Skill skill;

    @Column(name = "skill_name", nullable = false)
    private String skillName;

    private String category;

    /** Module 1 knowledge level 1-5; null means any level. */
    @Column(name = "required_level")
    private Integer requiredLevel;

    @Column(name = "must_have", nullable = false)
    private boolean mustHave = true;

    /** True for an optional skill; false (default) for a required skill. */
    @Column(nullable = false)
    private boolean optional;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}


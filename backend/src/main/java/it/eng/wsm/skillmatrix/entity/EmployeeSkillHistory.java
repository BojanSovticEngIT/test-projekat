package it.eng.wsm.skillmatrix.entity;

import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

/**
 * Immutable revision of an EmployeeSkill, written on every change of the live row (create, edit, submit,
 * validation decision, restore, import, delete). Revisions are numbered per skill ({@link #version}, 1..n) and
 * must never be updated or deleted. The skill id is a plain value (no FK) so revisions outlive a deleted skill.
 */
@Entity
@Immutable
@Table(name = "employee_skill_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSkillHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "employee_skill_id", nullable = false, updatable = false)
    private UUID employeeSkillId;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(nullable = false, updatable = false)
    private Integer version;

    /** FK → knowledge_level.id stored as plain INT (1–5). */
    @Column(name = "self_assessed_level", nullable = false)
    private Integer selfAssessedLevel;

    @Column(name = "manager_validated_level")
    private Integer managerValidatedLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 30)
    private ValidationStatus validationStatus;

    @Column(name = "years_of_experience", precision = 4, scale = 1)
    private BigDecimal yearsOfExperience;

    @Column(name = "last_used_date")
    private LocalDate lastUsedDate;

    @Column(name = "employee_comment", columnDefinition = "TEXT")
    private String employeeComment;

    @Column(name = "manager_comment", columnDefinition = "TEXT")
    private String managerComment;

    @Column(name = "last_updated_date", nullable = false)
    private Instant lastUpdatedDate;

    @Column(name = "last_validated_date")
    private Instant lastValidatedDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_user_id", nullable = false)
    private User changedByUser;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;
}

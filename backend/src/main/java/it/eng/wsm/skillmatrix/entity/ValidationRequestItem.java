package it.eng.wsm.skillmatrix.entity;

import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
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
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "validation_request_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "validation_request_id", nullable = false)
    private ValidationRequest validationRequest;

    /** Plain id (no FK): the item must outlive the live skill when a deletion request is approved. */
    @Column(name = "employee_skill_id", nullable = false)
    private UUID employeeSkillId;

    /** Display snapshots taken at request time, so the record stays readable after the skill is deleted. */
    @Column(name = "skill_name", nullable = false, length = 200)
    private String skillName;

    @Column(name = "category_name", nullable = false, length = 200)
    private String categoryName;

    /** FK → knowledge_level.id stored as plain INT (1–5). */
    @Column(name = "self_assessed_level", nullable = false)
    private Integer selfAssessedLevel;

    @Column(name = "employee_comment", columnDefinition = "TEXT")
    private String employeeComment;

    @Column(name = "manager_validated_level")
    private Integer managerValidatedLevel;

    @Column(name = "manager_comment", columnDefinition = "TEXT")
    private String managerComment;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ValidationRequestStatus status = ValidationRequestStatus.SUBMITTED;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Immutable revision of the skill taken right before submission; the restore source when the request is revoked. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pre_submission_history_id")
    private EmployeeSkillHistory preSubmissionRevision;
}

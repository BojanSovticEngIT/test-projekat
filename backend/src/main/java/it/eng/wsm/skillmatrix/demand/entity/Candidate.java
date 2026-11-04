package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.demand.enums.CandidateSource;
import it.eng.wsm.skillmatrix.demand.enums.CandidatePipelineStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * One person's candidacy on one demand. The person is an {@link Employee} (internal) or an {@link ExternalPerson}
 * (external); the flow ({@link #steps}) belongs to this candidacy only. Never deleted (no cascade remove); a candidacy
 * added by mistake is only marked {@link #removed}.
 */
@Entity
@Table(name = "candidate")
@Getter
@Setter
@NoArgsConstructor
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demand_id", nullable = false)
    private Demand demand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private CandidateType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", updatable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "external_person_id", updatable = false)
    private ExternalPerson externalPerson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CandidateSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_user_id")
    private User recruiterUser;

    @Column(name = "recruiter_name")
    private String recruiterName;

    @Column(name = "expected_daily_rate")
    private Integer expectedDailyRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CandidateStatus status = CandidateStatus.IN_PROCESS;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_status", nullable = false, length = 40)
    private CandidatePipelineStatus pipelineStatus = CandidatePipelineStatus.CV_IN_REVIEW;

    @Column(name = "close_reason", columnDefinition = "TEXT")
    private String closeReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closed_by_name")
    private String closedByName;

    @Column(name = "closed_at")
    private Instant closedAt;

    /** True when the candidacy was removed from the demand because it was added by mistake. Hidden everywhere. */
    @Column(nullable = false)
    private boolean removed;

    @Column(name = "removed_at")
    private Instant removedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "removed_by")
    private User removedBy;

    @Column(name = "removed_by_name")
    private String removedByName;

    @Column(name = "last_change_at", nullable = false)
    private Instant lastChangeAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "candidate", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 100)
    private List<CandidateStep> steps = new ArrayList<>();

    public boolean isOpen() {
        return status == CandidateStatus.IN_PROCESS;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (lastChangeAt == null) {
            lastChangeAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}


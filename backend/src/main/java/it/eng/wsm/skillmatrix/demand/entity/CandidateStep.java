package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.demand.enums.CandidateStepStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** One step of a candidate flow (F-01). The status only changes through the flow service, never directly. */
@Entity
@Table(name = "candidate_step")
@Getter
@Setter
@NoArgsConstructor
public class CandidateStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false, updatable = false)
    private Candidate candidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private CandidateStepType type;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CandidateStepStatus status;

    @Column(name = "step_date")
    private LocalDate stepDate;

    /** Local date and time of a meeting, as entered (no time zone). */
    @Column(name = "meeting_at")
    private LocalDateTime meetingAt;

    @Column(name = "sent_to")
    private String sentTo;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "allocation_pct")
    private Integer allocationPct;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsible_id", nullable = false)
    private User responsible;

    @Column(name = "responsible_name", nullable = false)
    private String responsibleName;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "step", cascade = CascadeType.PERSIST)
    @OrderBy("changedAt ASC")
    @BatchSize(size = 100)
    private List<CandidateStepChange> changes = new ArrayList<>();

    @OneToMany(mappedBy = "step", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 100)
    private List<MeetingParticipant> participants = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}


package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/** Append-only note on a demand, a candidate or a step (N-05 to N-07). Never updated or deleted. */
@Entity
@Immutable
@Table(name = "demand_note")
@Getter
@Setter
@NoArgsConstructor
public class DemandNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demand_id", nullable = false, updatable = false)
    private Demand demand;

    /** Set for candidate and step notes; null for demand notes (N-07). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", updatable = false)
    private Candidate candidate;

    /** Set for step notes only. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id", updatable = false)
    private CandidateStep step;

    /** {@code BUDGET_EXCEPTION} marks the note that explains an above-budget candidate (M-02c). */
    @Column(length = 30, updatable = false)
    private String kind;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false, updatable = false)
    private User author;

    @Column(name = "author_name", nullable = false, updatable = false)
    private String authorName;

    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}


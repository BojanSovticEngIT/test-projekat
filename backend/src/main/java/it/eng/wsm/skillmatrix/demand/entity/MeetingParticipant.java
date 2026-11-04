package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.demand.enums.MeetingVerdict;
import it.eng.wsm.skillmatrix.entity.User;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A meeting participant (N-01): a system user, or an external person known only by name.
 * Feedback (N-02) is written once by the participant and never changed afterwards.
 */
@Entity
@Table(name = "meeting_participant")
@Getter
@Setter
@NoArgsConstructor
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "step_id", nullable = false, updatable = false)
    private CandidateStep step;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", updatable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private String name;

    @Column(name = "role_label", updatable = false, length = 100)
    private String roleLabel;

    @Column(nullable = false, updatable = false)
    private boolean external;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MeetingVerdict verdict;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "feedback_at")
    private Instant feedbackAt;

    @Column(name = "sort_order", nullable = false, updatable = false)
    private int sortOrder;
}


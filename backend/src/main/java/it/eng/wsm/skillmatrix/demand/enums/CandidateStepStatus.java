package it.eng.wsm.skillmatrix.demand.enums;

import java.util.Optional;

/**
 * Step statuses. Each status belongs to one step type. The label is the exact text the frontend uses
 * ({@code candidateRules.ts STEP_OUTCOMES}), so requests and responses carry the label.
 */
public enum CandidateStepStatus {
    WAITING_FOR_FEEDBACK(CandidateStepType.CV, "Waiting for feedback"),
    APPROVED(CandidateStepType.CV, "Approved"),
    REJECTED(CandidateStepType.CV, "Rejected"),

    SCHEDULED(CandidateStepType.MEETING, "Scheduled"),
    DONE_POSITIVE(CandidateStepType.MEETING, "Done: positive"),
    DONE_NEGATIVE(CandidateStepType.MEETING, "Done: negative"),
    CANCELLED(CandidateStepType.MEETING, "Cancelled"),

    SENT(CandidateStepType.OFFER, "Sent"),
    ACCEPTED(CandidateStepType.OFFER, "Accepted"),
    DECLINED(CandidateStepType.OFFER, "Declined"),
    WITHDRAWN(CandidateStepType.OFFER, "Withdrawn"),

    TO_DO(CandidateStepType.CUSTOM, "To do"),
    DONE(CandidateStepType.CUSTOM, "Done"),
    FAILED(CandidateStepType.CUSTOM, "Failed"),

    CONFIRMED(CandidateStepType.START, "Confirmed");

    private final CandidateStepType type;
    private final String label;

    CandidateStepStatus(CandidateStepType type, String label) {
        this.type = type;
        this.label = label;
    }

    public CandidateStepType type() {
        return type;
    }

    public String label() {
        return label;
    }

    /** Status of the given step type with the given label. */
    public static Optional<CandidateStepStatus> fromLabel(CandidateStepType type, String label) {
        if (label == null) {
            return Optional.empty();
        }
        for (CandidateStepStatus status : values()) {
            if (status.type == type && status.label.equals(label.trim())) {
                return Optional.of(status);
            }
        }
        return Optional.empty();
    }
}


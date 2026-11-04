package it.eng.wsm.skillmatrix.demand.enums;

/** Manually set status of a candidate on a demand. Independent of the steps and of {@link CandidateStatus}. */
public enum CandidatePipelineStatus {
    CV_IN_REVIEW,
    WAITING_FOR_INTERVIEW,
    INTERVIEW_SCHEDULED,
    WAITING_FOR_INTERVIEW_FEEDBACK,
    IN_PROGRESS,
    IN_PIPELINE,
    ONBOARDED;

    public String label() {
        return switch (this) {
            case CV_IN_REVIEW -> "CV in review";
            case WAITING_FOR_INTERVIEW -> "Waiting for interview";
            case INTERVIEW_SCHEDULED -> "Interview scheduled";
            case WAITING_FOR_INTERVIEW_FEEDBACK -> "Waiting for Interview feedback";
            case IN_PROGRESS -> "In progress";
            case IN_PIPELINE -> "In pipeline";
            case ONBOARDED -> "Onboarded";
        };
    }
}

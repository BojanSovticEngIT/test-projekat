package it.eng.wsm.skillmatrix.demand.enums;

/** Where the candidate came from. The label is the text the frontend shows. */
public enum CandidateSource {
    BENCH_SEARCH("Bench search (Module 4)"),
    RECRUITER("Recruiter");

    private final String label;

    CandidateSource(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}


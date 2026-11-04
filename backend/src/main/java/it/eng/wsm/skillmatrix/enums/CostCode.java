package it.eng.wsm.skillmatrix.enums;

/** Predefined cost (range) codes. A higher number means a higher cost; seniority is derived from the code. */
public enum CostCode {
    R1(Seniority.JUNIOR),
    R2(Seniority.MEDIOR),
    R3(Seniority.SENIOR),
    R4(Seniority.LEAD),
    R5(Seniority.LEAD),
    R6(Seniority.PRINCIPAL);

    private final Seniority seniority;

    CostCode(Seniority seniority) {
        this.seniority = seniority;
    }

    public Seniority getSeniority() {
        return seniority;
    }
}

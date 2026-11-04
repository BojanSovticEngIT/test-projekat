package it.eng.wsm.skillmatrix.demand.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The editable demand fields shared by create and update (D-06). */
public interface DemandFields {

    String externalId();

    String title();

    List<DemandSkillRequestDto> skills();

    /** Optional skills; may be null or empty. */
    List<DemandSkillRequestDto> optionalSkills();

    List<String> missingSkills();

    String seniority();

    Integer allocationPct();

    String maxRangeCode();

    Integer maxDailyRate();

    String requestedBy();

    /** Free-text interviewer names, in display order. */
    List<String> interviewers();

    LocalDate receivedDate();

    LocalDate wantedStartDate();

    LocalDate wantedEndDate();

    List<String> horizontals();

    List<String> verticals();

    String clientName();

    String projectName();

    String projectDescription();

    /** Countries the candidates may come from, in display order. */
    List<DemandCountryRequestDto> countries();


    /** Saves even when another demand has the same external ID (D-16). */
    boolean force();
}


package it.eng.wsm.skillmatrix.demand.mapper;

import it.eng.wsm.skillmatrix.demand.dto.response.DemandCountryDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandDeletionDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandDetailDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandHistoryEntryDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandHoldDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandNoteDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandSkillDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandSummaryDto;
import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandCountry;
import it.eng.wsm.skillmatrix.demand.entity.DemandHistory;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.demand.entity.DemandNote;
import it.eng.wsm.skillmatrix.demand.entity.DemandRequestedSkill;
import it.eng.wsm.skillmatrix.demand.entity.DemandSkill;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import java.util.List;
import java.util.Optional;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Entity to DTO mapping for Module 3 demands. {@code activeCandidates} (candidates in process) is counted by the
 * service and passed in.
 */
@Mapper(componentModel = "spring")
public interface DemandMapper {

    @Mapping(target = "id", source = "demand.id")
    @Mapping(target = "countries", source = "demand.countries")
    @Mapping(target = "skills", source = "demand.skills")
    @Mapping(target = "optionalSkills", source = "demand.optionalSkills")
    @Mapping(target = "missingSkills", source = "demand.requestedSkills")
    @Mapping(target = "activeCandidates", source = "activeCandidates")
    DemandSummaryDto toSummaryDto(Demand demand, int activeCandidates);

    @Mapping(target = "id", source = "demand.id")
    @Mapping(target = "projectDescription", source = "demand.projectDescription")
    @Mapping(target = "countries", source = "demand.countries")
    @Mapping(target = "skills", source = "demand.skills")
    @Mapping(target = "optionalSkills", source = "demand.optionalSkills")
    @Mapping(target = "missingSkills", source = "demand.requestedSkills")
    @Mapping(target = "activeCandidates", source = "activeCandidates")
    @Mapping(target = "notes", source = "notes")
    @Mapping(target = "history", source = "history")
    @Mapping(target = "hold", expression = "java(toHold(demand, history))")
    @Mapping(target = "deletion", expression = "java(toDeletion(demand, history))")
    DemandDetailDto toDetailDto(Demand demand, List<DemandNote> notes, List<DemandHistory> history, int activeCandidates);

    default String countryName(DemandCountry country) {
        return country.getCountry();
    }

    default DemandCountryDto toCountryDto(DemandCountry country) {
        Employee partner = country.getHrBusinessPartner();
        return new DemandCountryDto(country.getCountry(), partner != null ? partner.getId() : null,
                partner != null ? (partner.getFirstName() + " " + partner.getLastName()).trim() : null);
    }

    @Mapping(target = "name", source = "skillName")
    @Mapping(target = "level", source = "requiredLevel")
    DemandSkillDto toSkillDto(DemandSkill skill);

    @Mapping(target = "author", source = "authorName")
    @Mapping(target = "authorId", source = "author.id")
    DemandNoteDto toNoteDto(DemandNote note);

    @Mapping(target = "changedBy", source = "changedByName")
    DemandHistoryEntryDto toHistoryDto(DemandHistory entry);

    default String toMissingSkill(DemandRequestedSkill skill) {
        return skill == null ? null : skill.getName();
    }

    /** The hold banner shows the reason of the latest PUT_ON_HOLD entry while the demand is on hold. */
    default DemandHoldDto toHold(Demand demand, List<DemandHistory> history) {
        if (demand.getStatus() != DemandStatus.ON_HOLD) {
            return null;
        }
        return latest(history, DemandHistoryAction.PUT_ON_HOLD)
                .map(entry -> new DemandHoldDto(entry.getReason(), entry.getChangedByName(), entry.getChangedAt()))
                .orElse(null);
    }

    /** The deleted banner shows the reason of the latest DELETED entry while the demand is deleted. */
    default DemandDeletionDto toDeletion(Demand demand, List<DemandHistory> history) {
        if (!demand.isDeleted()) {
            return null;
        }
        return latest(history, DemandHistoryAction.DELETED)
                .map(entry -> new DemandDeletionDto(entry.getReason(), entry.getChangedAt()))
                .orElse(null);
    }

    private static Optional<DemandHistory> latest(List<DemandHistory> history, DemandHistoryAction action) {
        if (history == null) {
            return Optional.empty();
        }
        DemandHistory found = null;
        for (DemandHistory entry : history) {
            if (entry.getAction() == action) {
                found = entry;
            }
        }
        return Optional.ofNullable(found);
    }
}


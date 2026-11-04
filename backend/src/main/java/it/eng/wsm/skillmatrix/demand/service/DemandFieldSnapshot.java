package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandCountry;
import it.eng.wsm.skillmatrix.demand.entity.DemandRequestedSkill;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.demand.entity.DemandSkill;
import it.eng.wsm.skillmatrix.enums.KnowledgeLevel;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Snapshot of the editable demand fields, used to write one history entry for each changed field (D-06, H-06).
 * Labels and value texts match the ones the frontend mock produced.
 */
final class DemandFieldSnapshot {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.UK);
    private static final String EMPTY = "empty";

    /** One field: a comparison key and a readable value for the history. */
    record FieldValue(String key, String text) {
    }

    /** One changed field. */
    record FieldChange(String label, String oldText, String newText) {
    }

    private final Map<String, FieldValue> values;

    private DemandFieldSnapshot(Map<String, FieldValue> values) {
        this.values = values;
    }

    static DemandFieldSnapshot of(Demand demand) {
        Map<String, FieldValue> map = new LinkedHashMap<>();
        // Labels are the ones shown in the UI. external_id is shown as "Workforce ID", the wanted dates as
        // "Start date" / "End date"; the backend fields keep their names. Owner is not an editable field.
        map.put("Workforce ID", text(demand.getExternalId()));
        map.put("Role / title", text(demand.getTitle()));
        map.put("Required skills", new FieldValue(skillsKey(demand.getSkills()), describeSkills(demand.getSkills())));
        map.put("Optional skills", new FieldValue(skillsKey(demand.getOptionalSkills()),
                describeSkills(demand.getOptionalSkills())));
        map.put("Skills not in the catalog", missingSkills(demand.getRequestedSkills()));
        map.put("Seniority", text(demand.getSeniority()));
        map.put("Allocation %", new FieldValue(String.valueOf(demand.getAllocationPct()), demand.getAllocationPct() + "%"));
        map.put("Max cost range code", text(demand.getMaxRangeCode()));
        map.put("Max daily rate (EUR)", rate(demand.getMaxDailyRate()));
        map.put("Requested by", text(demand.getRequestedBy()));
        map.put("Interviewers", names(demand.getInterviewers(), "none"));
        map.put("Date received", date(demand.getReceivedDate()));
        map.put("Start date", date(demand.getWantedStartDate()));
        map.put("End date", date(demand.getWantedEndDate()));
        map.put("Horizontals", names(demand.getHorizontals(), "none"));
        map.put("Verticals", names(demand.getVerticals(), "none"));
        map.put("Client", text(demand.getClientName()));
        map.put("Project name", text(demand.getProjectName()));
        map.put("Project description", text(demand.getProjectDescription()));
        map.put("Countries", names(demand.getCountries().stream().map(DemandFieldSnapshot::countryText).toList(), "any"));
        return new DemandFieldSnapshot(map);
    }

    List<FieldChange> changesTo(DemandFieldSnapshot after) {
        List<FieldChange> changes = new ArrayList<>();
        values.forEach((label, before) -> {
            FieldValue now = after.values.get(label);
            if (!Objects.equals(before.key(), now.key())) {
                changes.add(new FieldChange(label, before.text(), now.text()));
            }
        });
        return changes;
    }

    /** Comparison key of a skill list. The order, the name, the level and must-have count; the category does not. */
    static String skillsKey(List<DemandSkill> skills) {
        return join(skills, skill -> skill.getSkillName() + ":" + Objects.toString(skill.getRequiredLevel(), "")
                + ":" + skill.isMustHave());
    }

    private static String countryText(DemandCountry country) {
        Employee partner = country.getHrBusinessPartner();
        return partner == null ? country.getCountry()
                : country.getCountry() + " (" + (partner.getFirstName() + " " + partner.getLastName()).trim() + ")";
    }

    private static FieldValue names(List<String> names, String whenEmpty) {
        return new FieldValue(join(names, name -> name), names.isEmpty() ? whenEmpty : String.join(", ", names));
    }

    static String missingSkillsKey(List<DemandRequestedSkill> skills) {
        return join(skills, DemandRequestedSkill::getName);
    }

    static String levelName(Integer level) {
        if (level == null) {
            return null;
        }
        String name = KnowledgeLevel.fromValue(level).name();
        return name.charAt(0) + name.substring(1).toLowerCase(Locale.ROOT);
    }

    private static String describeSkills(List<DemandSkill> skills) {
        String text = skills.stream()
                .map(skill -> skill.getSkillName()
                        + (skill.getRequiredLevel() != null ? " " + levelName(skill.getRequiredLevel()) : "")
                        + (skill.isMustHave() || skill.isOptional() ? "" : " (nice to have)"))
                .collect(Collectors.joining(", "));
        return text.isEmpty() ? "none" : text;
    }

    private static FieldValue missingSkills(List<DemandRequestedSkill> skills) {
        String key = missingSkillsKey(skills);
        String text = skills.stream().map(DemandRequestedSkill::getName).collect(Collectors.joining(", "));
        return new FieldValue(key, text.isEmpty() ? "none" : text);
    }

    private static FieldValue text(String value) {
        String key = value == null ? "" : value;
        String trimmed = key.trim();
        return new FieldValue(key, trimmed.isEmpty() ? EMPTY : trimmed);
    }

    private static FieldValue rate(Integer value) {
        return new FieldValue(Objects.toString(value, ""), value != null ? value + " EUR" : EMPTY);
    }

    private static FieldValue date(LocalDate value) {
        return new FieldValue(Objects.toString(value, ""), value != null ? DATE_FORMAT.format(value) : EMPTY);
    }

    private static <T> String join(List<T> items, Function<T, String> keyOf) {
        return items.stream().map(keyOf).collect(Collectors.joining("|"));
    }
}


package it.eng.wsm.skillmatrix.common;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Hardcoded countries an employee can be based in. The name is stored as text in {@code employee.location}.
 * Moving the list to a table is a later phase.
 */
public final class Countries {

    public static final List<String> ALL = List.of(
            "Albania", "Brazil", "Bulgaria", "Cameroon", "Egypt", "Germany", "India",
            "Italy", "Poland", "Romania", "Serbia", "Spain", "Tunisia");

    /** Countries the HC view shows as columns until the user picks others. */
    public static final List<String> HC_DEFAULT = List.of(
            "Serbia", "Albania", "Romania", "India", "Poland",
            "Bulgaria", "Cameroon", "Tunisia", "Egypt", "Brazil");

    // Older spellings that still exist in stored data.
    private static final Map<String, String> ALIASES = Map.of("brasil", "Brazil");

    private Countries() {
    }

    /** Returns the canonical country name for a value (trimmed, case-insensitive, aliases allowed). */
    public static Optional<String> canonical(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        String wanted = ALIASES.getOrDefault(normalized, normalized).toLowerCase(Locale.ROOT);
        return ALL.stream().filter(country -> country.toLowerCase(Locale.ROOT).equals(wanted)).findFirst();
    }
}

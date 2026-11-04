package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.util.List;
import java.util.Map;

/**
 * {@code countries} are the table columns (selected countries, then "Other countries" when needed).
 * Counts are headcount shares: an employee on several projects is counted in each node as allocation % / 100.
 * {@code availableCountries} are the countries from the list that have at least one counted employee.
 */
public record HcViewResponseDto(
        List<String> countries, List<String> availableCountries, List<Group> groups, Totals grandTotal) {

    public record Group(String n1, List<Row> rows, Totals total) {}

    public record Row(String n2, Totals total) {}

    public record Count(double internal, double b2b, double supplier) {}

    public record Totals(Map<String, Count> byCountry, double internal, double external, double total) {}
}

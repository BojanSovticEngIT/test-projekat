package it.eng.wsm.skillmatrix.demand.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Text formats shared with the frontend ({@code demandFormat.ts}) for history notes and step labels. */
final class CandidateFormat {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.UK);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private CandidateFormat() {
    }

    /** "5 Mar 2027", the same as the frontend {@code formatDate}. */
    static String date(LocalDate date) {
        return date == null ? "Not set" : DATE.format(date);
    }

    /** Local meeting time as the frontend sends it: {@code yyyy-MM-ddTHH:mm}. */
    static String when(LocalDateTime when) {
        return when == null ? null : WHEN.format(when);
    }

    /** "5 Mar 2027 10:00". */
    static String dateTime(LocalDateTime when) {
        return when == null ? "" : DATE.format(when) + " " + TIME.format(when);
    }

    static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}


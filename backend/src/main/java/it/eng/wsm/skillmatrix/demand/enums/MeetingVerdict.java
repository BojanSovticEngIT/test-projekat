package it.eng.wsm.skillmatrix.demand.enums;

import java.util.Locale;

/** Optional verdict of a meeting participant (N-02). The API uses the lower-case value. */
public enum MeetingVerdict {
    POSITIVE,
    NEUTRAL,
    NEGATIVE;

    public String apiValue() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static MeetingVerdict fromApi(String value) {
        if (value == null) {
            return null;
        }
        for (MeetingVerdict verdict : values()) {
            if (verdict.apiValue().equals(value.trim())) {
                return verdict;
            }
        }
        return null;
    }
}


package it.eng.wsm.skillmatrix.enums;

/**
 * Represents the self-assessed or manager-validated knowledge level for a skill.
 * Values: 1 (Beginner) to 5 (Expert). Stored as INT in the database.
 */
public enum KnowledgeLevel {
    BEGINNER(1),
    INTERMEDIATE(2),
    EXPERIENCED(3),
    ADVANCED(4),
    MASTER(5);

    private final int value;

    KnowledgeLevel(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static KnowledgeLevel fromValue(int value) {
        for (KnowledgeLevel level : values()) {
            if (level.value == value) return level;
        }
        throw new IllegalArgumentException("Invalid knowledge level: " + value);
    }
}

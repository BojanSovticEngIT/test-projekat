package it.eng.wsm.skillmatrix.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Reference / typological table for skill knowledge levels.
 * Managed entirely in the DB — add or modify levels via SQL without touching application code.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "knowledge_level")
public class KnowledgeLevel {

    @Id
    @Column(name = "id", nullable = false)
    private Short id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}


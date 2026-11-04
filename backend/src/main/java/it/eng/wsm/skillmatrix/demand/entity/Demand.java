package it.eng.wsm.skillmatrix.demand.entity;

import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "demand")
@Getter
@Setter
@NoArgsConstructor
public class Demand {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, updatable = false, length = 20)
    private String code;

    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(nullable = false)
    private String title;

    @Column(length = 100)
    private String seniority;

    @Column(name = "requested_by", nullable = false)
    private String requestedBy;

    /** Free-text interviewer names (demand_interviewer). */
    @ElementCollection
    @CollectionTable(name = "demand_interviewer", joinColumns = @JoinColumn(name = "demand_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "name", nullable = false, length = 255)
    @BatchSize(size = 100)
    private List<String> interviewers = new ArrayList<>();

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "wanted_start_date", nullable = false)
    private LocalDate wantedStartDate;

    @Column(name = "wanted_end_date")
    private LocalDate wantedEndDate;

    /** Horizontals the demand belongs to (demand_horizontal); at least one. */
    @ElementCollection
    @CollectionTable(name = "demand_horizontal", joinColumns = @JoinColumn(name = "demand_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "name", nullable = false, length = 500)
    @BatchSize(size = 100)
    private List<String> horizontals = new ArrayList<>();

    /** Verticals the demand belongs to (demand_vertical); at least one. */
    @ElementCollection
    @CollectionTable(name = "demand_vertical", joinColumns = @JoinColumn(name = "demand_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "name", nullable = false, length = 255)
    @BatchSize(size = 100)
    private List<String> verticals = new ArrayList<>();

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "project_description", columnDefinition = "TEXT")
    private String projectDescription;

    /** Countries the candidates may come from (demand_country). Empty means any country. */
    @ElementCollection
    @CollectionTable(name = "demand_country", joinColumns = @JoinColumn(name = "demand_id"))
    @OrderColumn(name = "sort_order")
    @BatchSize(size = 100)
    private List<DemandCountry> countries = new ArrayList<>();

    @Column(name = "requested_positions", nullable = false)
    private int requestedPositions;

    @Column(name = "filled_positions", nullable = false)
    private int filledPositions;

    @Column(name = "cancelled_positions", nullable = false)
    private int cancelledPositions;

    @Column(name = "allocation_pct", nullable = false)
    private int allocationPct = 100;

    @Column(name = "max_range_code", length = 20)
    private String maxRangeCode;

    @Column(name = "max_daily_rate")
    private Integer maxDailyRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DemandStatus status = DemandStatus.IN_PROGRESS;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, updatable = false)
    private User owner;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "original_request", columnDefinition = "TEXT", updatable = false)
    private String originalRequest;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required skills (demand_skill rows with optional = false). */
    @OneToMany(mappedBy = "demand", cascade = CascadeType.ALL, orphanRemoval = true)
    @SQLRestriction("optional = false")
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 100)
    private List<DemandSkill> skills = new ArrayList<>();

    /** Optional skills (demand_skill rows with optional = true). */
    @OneToMany(mappedBy = "demand", cascade = CascadeType.ALL, orphanRemoval = true)
    @SQLRestriction("optional = true")
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 100)
    private List<DemandSkill> optionalSkills = new ArrayList<>();

    @OneToMany(mappedBy = "demand", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 100)
    private List<DemandRequestedSkill> requestedSkills = new ArrayList<>();

    /** open = requested - filled - cancelled (never negative). */
    public int getOpenPositions() {
        return Math.max(0, requestedPositions - filledPositions - cancelledPositions);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}


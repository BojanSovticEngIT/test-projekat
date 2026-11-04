package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AllocationRepository extends JpaRepository<Allocation, UUID>, JpaSpecificationExecutor<Allocation> {

    List<Allocation> findByProjectId(UUID projectId);

    boolean existsByProjectId(UUID projectId);

    List<Allocation> findByEmployeeIdOrderByStartDateDesc(UUID employeeId);

    @Query("""
            SELECT a FROM Allocation a
            JOIN FETCH a.employee
            JOIN FETCH a.project
            WHERE a.startDate <= :rangeEnd
            AND (a.endDate IS NULL OR a.endDate >= :rangeStart)
            """)
    List<Allocation> findInDateRange(
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd);

    @Query("""
            SELECT new it.eng.wsm.skillmatrix.workforce.repository.HcAllocationRow(
                a.employee.id, a.project.horizontalNode.id, a.allocationPct)
            FROM Allocation a
            WHERE a.project.horizontalNode IS NOT NULL
            AND a.startDate <= :today
            AND (a.endDate IS NULL OR a.endDate >= :today)
            """)
    List<HcAllocationRow> findActiveWithHorizontalNode(@Param("today") LocalDate today);

    @Query("""
            SELECT a FROM Allocation a
            WHERE a.employee.id = :employeeId
            AND (:excludeId IS NULL OR a.id <> :excludeId)
            AND a.startDate <= :rangeEnd
            AND (a.endDate IS NULL OR a.endDate >= :rangeStart)
            """)
    List<Allocation> findOverlappingForEmployee(
            @Param("employeeId") UUID employeeId,
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd,
            @Param("excludeId") UUID excludeId);
}

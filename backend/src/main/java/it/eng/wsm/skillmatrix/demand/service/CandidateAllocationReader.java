package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.repository.CandidateStepRepository;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.service.AllocationLifecycleSupport;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Read-only view of how much an employee is allocated today: the Module 2 allocations active today plus the
 * placements confirmed in Module 3 (M-04, M-05). Module 3 does not write Module 2 allocations yet (Phase 09), so the
 * two sources do not overlap.
 */
@Component
@RequiredArgsConstructor
public class CandidateAllocationReader {

    private final AllocationRepository allocationRepository;
    private final CandidateStepRepository stepRepository;

    /** One confirmed Module 3 placement of an employee. */
    public record Placement(UUID candidateId, String demandCode, int allocationPct) {
    }

    /** Module 2 load today: the allocated % and, when every allocation has an end date, the first free day. */
    public record Module2Load(int allocatedPct, LocalDate freeFrom) {
    }

    /** A snapshot of all allocations, read once per request. */
    public record Snapshot(Map<UUID, Module2Load> module2, Map<UUID, List<Placement>> placements) {

        public int module2Pct(UUID employeeId) {
            Module2Load load = module2.get(employeeId);
            return load == null ? 0 : load.allocatedPct();
        }

        public LocalDate module2FreeFrom(UUID employeeId) {
            Module2Load load = module2.get(employeeId);
            return load == null ? null : load.freeFrom();
        }

        /** Sum of the Module 3 placements of the employee, without the given candidate (the one being evaluated). */
        public int placedPct(UUID employeeId, UUID exceptCandidateId) {
            return placements.getOrDefault(employeeId, List.of()).stream()
                    .filter(placement -> !placement.candidateId().equals(exceptCandidateId))
                    .mapToInt(Placement::allocationPct)
                    .sum();
        }

        /** Module 2 allocation today plus the Module 3 placements, without the given candidate. */
        public int totalPct(UUID employeeId, UUID exceptCandidateId) {
            return module2Pct(employeeId) + placedPct(employeeId, exceptCandidateId);
        }
    }

    public Snapshot read() {
        LocalDate today = LocalDate.now();
        Map<UUID, List<Allocation>> active = new HashMap<>();
        for (Allocation allocation : allocationRepository.findInDateRange(today, today)) {
            if (AllocationLifecycleSupport.isActiveOnDate(allocation, today)) {
                active.computeIfAbsent(allocation.getEmployee().getId(), key -> new ArrayList<>()).add(allocation);
            }
        }
        Map<UUID, Module2Load> module2 = new HashMap<>();
        active.forEach((employeeId, allocations) -> {
            int pct = allocations.stream().mapToInt(Allocation::getAllocationPct).sum();
            boolean allEnd = allocations.stream().allMatch(allocation -> allocation.getEndDate() != null);
            LocalDate freeFrom = allEnd
                    ? allocations.stream().map(Allocation::getEndDate).max(LocalDate::compareTo).map(end -> end.plusDays(1)).orElse(null)
                    : null;
            module2.put(employeeId, new Module2Load(pct, freeFrom));
        });

        Map<UUID, List<Placement>> placements = new HashMap<>();
        for (Object[] row : stepRepository.findPlacedInternalAllocations()) {
            UUID employeeId = (UUID) row[0];
            int pct = row[3] == null ? 0 : ((Number) row[3]).intValue();
            placements.computeIfAbsent(employeeId, key -> new ArrayList<>())
                    .add(new Placement((UUID) row[1], (String) row[2], pct));
        }
        return new Snapshot(module2, placements);
    }
}


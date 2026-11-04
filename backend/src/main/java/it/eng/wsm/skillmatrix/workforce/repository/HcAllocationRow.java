package it.eng.wsm.skillmatrix.workforce.repository;

import java.util.UUID;

public record HcAllocationRow(UUID employeeId, UUID horizontalNodeId, int allocationPct) {}

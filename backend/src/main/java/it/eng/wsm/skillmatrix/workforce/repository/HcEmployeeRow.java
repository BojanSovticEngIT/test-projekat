package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.enums.WorkforceType;
import java.util.UUID;

public record HcEmployeeRow(UUID id, String location, WorkforceType workforceType) {}

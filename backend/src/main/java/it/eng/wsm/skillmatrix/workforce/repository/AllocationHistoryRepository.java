package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.AllocationHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllocationHistoryRepository extends JpaRepository<AllocationHistory, UUID> {

    List<AllocationHistory> findByAllocationIdOrderByChangedAtDesc(UUID allocationId);

    List<AllocationHistory> findByAllocationEmployeeIdOrderByChangedAtDesc(UUID employeeId);
}

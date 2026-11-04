package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.Certificate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    Page<Certificate> findByEmployeeId(UUID employeeId, Pageable pageable);

    Optional<Certificate> findByIdAndEmployeeId(UUID id, UUID employeeId);

    @Query("select c from Certificate c join c.skills s "
            + "where c.employee.id = :employeeId and s.id = :skillId "
            + "order by c.completionDate desc, c.createdAt desc")
    List<Certificate> findByEmployeeIdAndSkillId(@Param("employeeId") UUID employeeId, @Param("skillId") UUID skillId);

    @Query("select c from Certificate c join c.skills s "
            + "where c.id = :id and c.employee.id = :employeeId and s.id = :skillId")
    Optional<Certificate> findByIdAndEmployeeIdAndSkillId(
            @Param("id") UUID id, @Param("employeeId") UUID employeeId, @Param("skillId") UUID skillId);

    /** Number of the owner's certificates linked to each employee skill, as {employeeSkillId, count} rows. */
    @Query("select es.id, count(distinct c.id) from EmployeeSkill es, Certificate c join c.skills s "
            + "where es.id in :employeeSkillIds and c.employee.id = es.employee.id and s.id = es.skill.id "
            + "group by es.id")
    List<Object[]> countByEmployeeSkillIds(@Param("employeeSkillIds") Collection<UUID> employeeSkillIds);
}

package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.KnowledgeLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KnowledgeLevelRepository extends JpaRepository<KnowledgeLevel, Short> {

    Optional<KnowledgeLevel> findByCode(String code);

    List<KnowledgeLevel> findAllByActiveTrueOrderByIdAsc();
}


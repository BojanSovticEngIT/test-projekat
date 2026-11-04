package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.VerticalTaxonomy;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VerticalTaxonomyRepository extends JpaRepository<VerticalTaxonomy, UUID> {

    List<VerticalTaxonomy> findAllByOrderByLevelAscNameAsc();

    List<VerticalTaxonomy> findByActiveTrueOrderByLevelAscNameAsc();

    boolean existsByParentId(UUID parentId);

    boolean existsByParentIdAndActiveTrue(UUID parentId);

    List<VerticalTaxonomy> findByParentIsNullAndNameIgnoreCase(String name);

    List<VerticalTaxonomy> findByParentIdAndNameIgnoreCase(UUID parentId, String name);
    // Active selectable rows: sub-industries, plus sectors that have no children (e.g. "Other")
    default List<VerticalTaxonomy> findAllByOrderByVerticalN1AscVerticalN2Asc() {
        List<VerticalTaxonomy> all = findAllByOrderByLevelAscNameAsc();
        Set<UUID> sectorsWithChildren = all.stream()
                .filter(node -> node.getParent() != null)
                .map(node -> node.getParent().getId())
                .collect(Collectors.toSet());
        return all.stream()
                .filter(VerticalTaxonomy::isActive)
                .filter(node -> node.getParent() == null
                        ? !sectorsWithChildren.contains(node.getId())
                        : node.getParent().isActive())
                .sorted(Comparator.comparing(VerticalTaxonomy::getVerticalN1)
                        .thenComparing(VerticalTaxonomy::getVerticalN2, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
    }
}

package it.eng.wsm.skillmatrix.common;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeCurrentHorizontal;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeCurrentHorizontalRepository;
import it.eng.wsm.skillmatrix.workforce.repository.HorizontalNodeRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * An employee's organization unit is the horizontal node of the project of their latest allocation
 * (see the employee_current_horizontal view). This is the single place that resolves it.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmployeeOrgUnitResolver {

    private static final String SEPARATOR = " / ";

    private final EmployeeCurrentHorizontalRepository currentHorizontalRepository;
    private final HorizontalNodeRepository horizontalNodeRepository;

    /** Full path label ("N1 / N2 / N3") per employee; employees without a unit are absent from the map. */
    public Map<UUID, String> labelsFor(Collection<UUID> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, HorizontalNode> nodes = loadNodes();
        Map<UUID, String> labels = new HashMap<>();
        for (EmployeeCurrentHorizontal row : currentHorizontalRepository.findByEmployeeIdIn(employeeIds)) {
            HorizontalNode node = nodes.get(row.getHorizontalNodeId());
            if (node != null) {
                labels.put(row.getEmployeeId(), pathLabel(node, nodes));
            }
        }
        return labels;
    }

    public String labelFor(UUID employeeId) {
        return labelsFor(List.of(employeeId)).get(employeeId);
    }

    public UUID nodeIdFor(UUID employeeId) {
        return currentHorizontalRepository.findById(employeeId)
                .map(EmployeeCurrentHorizontal::getHorizontalNodeId)
                .orElse(null);
    }

    public Map<UUID, UUID> nodeIdsFor(Collection<UUID> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, UUID> nodeIds = new HashMap<>();
        currentHorizontalRepository.findByEmployeeIdIn(employeeIds)
                .forEach(row -> nodeIds.put(row.getEmployeeId(), row.getHorizontalNodeId()));
        return nodeIds;
    }

    /** The given nodes plus all of their descendants. */
    public Set<UUID> subtreeIds(Collection<UUID> nodeIds) {
        if (nodeIds.isEmpty()) {
            return Set.of();
        }
        Map<UUID, List<UUID>> childrenByParent = new HashMap<>();
        for (HorizontalNode node : loadNodes().values()) {
            if (node.getParent() != null) {
                childrenByParent.computeIfAbsent(node.getParent().getId(), key -> new ArrayList<>())
                        .add(node.getId());
            }
        }
        Set<UUID> result = new HashSet<>();
        Deque<UUID> pending = new ArrayDeque<>(nodeIds);
        while (!pending.isEmpty()) {
            UUID current = pending.pop();
            if (result.add(current)) {
                pending.addAll(childrenByParent.getOrDefault(current, List.of()));
            }
        }
        return result;
    }

    /** The node itself followed by its ancestors up to the root. */
    public Set<UUID> ancestorsOrSelf(UUID nodeId) {
        Map<UUID, HorizontalNode> nodes = loadNodes();
        Set<UUID> result = new LinkedHashSet<>();
        HorizontalNode current = nodeId == null ? null : nodes.get(nodeId);
        while (current != null && result.add(current.getId())) {
            current = current.getParent() == null ? null : nodes.get(current.getParent().getId());
        }
        return result;
    }

    /** Predicate: the employee's current horizontal node is one of the given nodes. */
    public Predicate currentNodeIn(
            Root<Employee> root, CriteriaQuery<?> query, CriteriaBuilder cb, Collection<UUID> nodeIds) {
        if (nodeIds.isEmpty()) {
            return cb.disjunction();
        }
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EmployeeCurrentHorizontal> current = subquery.from(EmployeeCurrentHorizontal.class);
        subquery.select(cb.literal(1))
                .where(cb.equal(current.get("employeeId"), root.get("id")),
                        current.get("horizontalNodeId").in(nodeIds));
        return cb.exists(subquery);
    }

    private Map<UUID, HorizontalNode> loadNodes() {
        Map<UUID, HorizontalNode> nodes = new HashMap<>();
        horizontalNodeRepository.findAll().forEach(node -> nodes.put(node.getId(), node));
        return nodes;
    }

    private String pathLabel(HorizontalNode node, Map<UUID, HorizontalNode> nodes) {
        StringBuilder label = new StringBuilder(node.getName());
        HorizontalNode current = node;
        Set<UUID> seen = new HashSet<>();
        while (current.getParent() != null && seen.add(current.getId())) {
            HorizontalNode parent = nodes.get(current.getParent().getId());
            if (parent == null) {
                break;
            }
            label.insert(0, parent.getName() + SEPARATOR);
            current = parent;
        }
        return label.toString();
    }
}

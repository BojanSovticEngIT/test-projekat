package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.common.Countries;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeCurrentHorizontalRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeHorizontalAssignmentRepository;
import it.eng.wsm.skillmatrix.workforce.repository.HcAllocationRow;
import it.eng.wsm.skillmatrix.workforce.repository.HcEmployeeRow;
import it.eng.wsm.skillmatrix.workforce.repository.HorizontalNodeRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HcViewService {

    private static final String OTHER_COUNTRIES = "Other countries";
    private static final String UNASSIGNED = "Unassigned";
    private static final String NO_N2 = "(no N-2)";
    private static final Set<EmploymentStatus> COUNTED_STATUSES =
            EnumSet.of(EmploymentStatus.ACTIVE, EmploymentStatus.NEW_HIRE);

    private final EmployeeHorizontalAssignmentRepository assignmentRepository;
    private final EmployeeCurrentHorizontalRepository currentHorizontalRepository;
    private final AllocationRepository allocationRepository;
    private final HorizontalNodeRepository horizontalNodeRepository;

    @Transactional(readOnly = true)
    public HcViewResponseDto getHeadcountView(List<String> requestedCountries) {
        // Without a selection the default countries are shown; names are matched to the country list.
        List<String> selected = requestedCountries == null
                ? Countries.HC_DEFAULT
                : requestedCountries.stream().map(Countries::canonical).flatMap(Optional::stream).distinct().toList();

        Map<UUID, HorizontalNode> nodes = new HashMap<>();
        horizontalNodeRepository.findAll().forEach(node -> nodes.put(node.getId(), node));

        // An employee is placed under the horizontal node of the project of their latest allocation.
        Map<UUID, UUID> nodeByEmployee = new HashMap<>();
        currentHorizontalRepository.findAll()
                .forEach(row -> nodeByEmployee.put(row.getEmployeeId(), row.getHorizontalNodeId()));

        // An employee on several projects today is split between their nodes by allocation percentage.
        Map<UUID, Map<UUID, Double>> activeShares = activeNodeShares();

        Map<String, Map<String, Map<String, double[]>>> tree = new TreeMap<>();

        // The demo headcount is always shown; real employees from the database are added on top of it.
        for (HcViewDemoData.DemoEmployee employee : HcViewDemoData.EMPLOYEES) {
            countEmployee(tree, employee.n1(), employee.n2(), bucketOf(employee.country()), employee.type(), 1);
        }

        for (HcEmployeeRow employee : assignmentRepository.findHeadcountEmployees(COUNTED_STATUSES)) {
            String country = bucketOf(employee.location());
            Map<UUID, Double> shares = activeShares.get(employee.id());
            if (shares == null) {
                String[] path = resolvePath(nodeByEmployee.get(employee.id()), nodes);
                countEmployee(tree, path[0], path[1], country, employee.workforceType(), 1);
                continue;
            }
            shares.forEach((nodeId, share) -> {
                String[] path = resolvePath(nodeId, nodes);
                countEmployee(tree, path[0], path[1], country, employee.workforceType(), share);
            });
        }

        return buildResponse(tree, selected);
    }

    public List<String> getDefaultCountries() {
        return Countries.HC_DEFAULT;
    }

    private void countEmployee(
            Map<String, Map<String, Map<String, double[]>>> tree,
            String n1,
            String n2,
            String country,
            WorkforceType type,
            double share) {
        tree.computeIfAbsent(n1, key -> new TreeMap<>())
                .computeIfAbsent(n2, key -> new HashMap<>())
                .computeIfAbsent(country, key -> new double[3])[typeIndex(type)] += share;
    }

    // Share of each employee in the nodes of the projects they are allocated to today: allocation % / 100, summed per
    // node. Employees without a current allocation on a project with a node are not in the map.
    private Map<UUID, Map<UUID, Double>> activeNodeShares() {
        Map<UUID, Map<UUID, Double>> shares = new HashMap<>();
        for (HcAllocationRow row : allocationRepository.findActiveWithHorizontalNode(LocalDate.now())) {
            shares.computeIfAbsent(row.employeeId(), key -> new LinkedHashMap<>())
                    .merge(row.horizontalNodeId(), row.allocationPct() / 100.0, Double::sum);
        }
        return shares;
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(List<String> requestedCountries) {
        return HcViewExcel.write(getHeadcountView(requestedCountries));
    }

    // Columns: the selected countries, then "Other countries" when someone falls there (another country, a value
    // not in the list, or no country), so the columns always add up to the totals (which count every employee).
    private HcViewResponseDto buildResponse(Map<String, Map<String, Map<String, double[]>>> tree, List<String> selected) {
        Map<String, double[]> grand = new HashMap<>();
        tree.values().forEach(n2Map -> n2Map.values().forEach(cells -> merge(grand, cells)));

        List<String> available = grand.keySet().stream().filter(Countries.ALL::contains).sorted().toList();
        List<String> columns = new ArrayList<>(selected);
        if (grand.keySet().stream().anyMatch(key -> columnOf(key, selected).equals(OTHER_COUNTRIES))) {
            columns.add(OTHER_COUNTRIES);
        }

        List<HcViewResponseDto.Group> groups = new ArrayList<>();
        List<String> n1Names = new ArrayList<>(tree.keySet());
        if (n1Names.remove(UNASSIGNED)) {
            n1Names.add(UNASSIGNED);
        }

        for (String n1 : n1Names) {
            Map<String, double[]> groupSum = new HashMap<>();
            List<HcViewResponseDto.Row> rows = new ArrayList<>();

            List<String> n2Names = new ArrayList<>(tree.get(n1).keySet());
            if (n2Names.remove(NO_N2)) {
                n2Names.add(NO_N2);
            }

            for (String n2 : n2Names) {
                Map<String, double[]> cells = tree.get(n1).get(n2);
                rows.add(new HcViewResponseDto.Row(n2, toTotals(cells, selected, columns)));
                merge(groupSum, cells);
            }
            groups.add(new HcViewResponseDto.Group(n1, rows, toTotals(groupSum, selected, columns)));
        }

        return new HcViewResponseDto(columns, available, groups, toTotals(grand, selected, columns));
    }

    private HcViewResponseDto.Totals toTotals(Map<String, double[]> cells, List<String> selected, List<String> columns) {
        Map<String, double[]> byColumn = new HashMap<>();
        cells.forEach((key, counts) -> merge(byColumn, Map.of(columnOf(key, selected), counts)));

        Map<String, HcViewResponseDto.Count> byCountry = new LinkedHashMap<>();
        double internal = 0;
        double external = 0;
        for (String column : columns) {
            double[] counts = byColumn.getOrDefault(column, new double[3]);
            byCountry.put(column, new HcViewResponseDto.Count(round(counts[0]), round(counts[1]), round(counts[2])));
            internal += counts[0];
            external += counts[1] + counts[2];
        }
        return new HcViewResponseDto.Totals(byCountry, round(internal), round(external), round(internal + external));
    }

    private double round(double value) {
        return Math.round(value * 100) / 100.0;
    }

    private String columnOf(String bucket, List<String> selected) {
        return selected.contains(bucket) ? bucket : OTHER_COUNTRIES;
    }

    private void merge(Map<String, double[]> target, Map<String, double[]> source) {
        source.forEach((country, counts) -> {
            double[] sum = target.computeIfAbsent(country, key -> new double[3]);
            for (int i = 0; i < sum.length; i++) {
                sum[i] += counts[i];
            }
        });
    }

    // Returns {N-1, N-2}; level 3 nodes roll up to their level 2 parent.
    private String[] resolvePath(UUID nodeId, Map<UUID, HorizontalNode> nodes) {
        HorizontalNode node = nodeId == null ? null : nodes.get(nodeId);
        if (node == null) {
            return new String[] {UNASSIGNED, UNASSIGNED};
        }
        while (node.getLevel() > 2 && node.getParent() != null) {
            node = node.getParent();
        }
        if (node.getLevel() == 1 || node.getParent() == null) {
            return new String[] {node.getName(), NO_N2};
        }
        return new String[] {node.getParent().getName(), node.getName()};
    }

    // A country from the list, or "Other countries" for a blank value or a value that is not in the list.
    private String bucketOf(String location) {
        return Countries.canonical(location).orElse(OTHER_COUNTRIES);
    }

    private int typeIndex(WorkforceType type) {
        return switch (type) {
            case EMPLOYEE -> 0;
            case B2B -> 1;
            case SUPPLIER -> 2;
        };
    }
}

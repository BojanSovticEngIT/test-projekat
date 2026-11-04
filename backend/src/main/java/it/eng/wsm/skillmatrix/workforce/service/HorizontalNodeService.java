package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.HorizontalNodeRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HorizontalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.StructureImportResultDto;
import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.HorizontalNodeRepository;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HorizontalNodeService {

    private static final String ENTITY_NAME = "HorizontalNode";
    private static final short MAX_LEVEL = 3;

    private final HorizontalNodeRepository horizontalNodeRepository;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    @Transactional(readOnly = true)
    public List<HorizontalNodeResponseDto> findAll(boolean includeInactive) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        List<HorizontalNode> nodes = includeInactive
                ? horizontalNodeRepository.findAllByOrderByLevelAscNameAsc()
                : horizontalNodeRepository.findByActiveTrueOrderByLevelAscNameAsc();
        return nodes.stream()
                .map(workforceMapper::toHorizontalNodeResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public HorizontalNodeResponseDto findById(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        return workforceMapper.toHorizontalNodeResponseDto(findNodeOrThrow(id));
    }

    public HorizontalNodeResponseDto create(HorizontalNodeRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        HorizontalNode node = new HorizontalNode();
        applyRequest(dto, node, null);
        HorizontalNode saved = horizontalNodeRepository.save(node);

        HorizontalNodeResponseDto response = workforceMapper.toHorizontalNodeResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    public HorizontalNodeResponseDto update(UUID id, HorizontalNodeRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        HorizontalNode node = findNodeOrThrow(id);
        if (node.isActive() && Boolean.FALSE.equals(dto.getActive())) {
            assertCanDeactivate(id);
        }
        if (!node.getLevel().equals(dto.getLevel()) && horizontalNodeRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot change the level of a horizontal node that has child nodes");
        }
        HorizontalNodeResponseDto oldDto = workforceMapper.toHorizontalNodeResponseDto(node);
        applyRequest(dto, node, id);
        HorizontalNode saved = horizontalNodeRepository.save(node);

        HorizontalNodeResponseDto newDto = workforceMapper.toHorizontalNodeResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel() {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        List<StructureExcel.Node> nodes = horizontalNodeRepository.findByActiveTrueOrderByLevelAscNameAsc().stream()
                .map(node -> new StructureExcel.Node(
                        node.getId(),
                        node.getParent() == null ? null : node.getParent().getId(),
                        node.getLevel(),
                        node.getName(),
                        node.getLeader()))
                .toList();
        return StructureExcel.write(MAX_LEVEL, nodes);
    }

    /**
     * Adds the nodes that are missing and sets the leader of existing ones when the file has one. Nothing is
     * deleted or deactivated, and nothing is written when any row has an error.
     */
    public StructureImportResultDto importExcel(InputStream input) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        StructureExcel.Parsed parsed = StructureExcel.read(input, MAX_LEVEL);
        if (!parsed.errors().isEmpty()) {
            return new StructureImportResultDto(0, 0, parsed.errors());
        }

        Map<String, HorizontalNode> existing = new HashMap<>();
        horizontalNodeRepository.findAll().forEach(node -> existing.put(nodeKey(node.getParent(), node.getName()), node));

        HorizontalNode[] parents = new HorizontalNode[MAX_LEVEL + 1];
        int created = 0;
        int updated = 0;
        for (StructureExcel.Entry entry : parsed.entries()) {
            HorizontalNode parent = entry.level() > 1 ? parents[entry.level() - 1] : null;
            HorizontalNode node = existing.get(nodeKey(parent, entry.name()));
            if (node == null) {
                node = new HorizontalNode();
                node.setLevel((short) entry.level());
                node.setName(entry.name());
                node.setLeader(entry.leader());
                node.setParent(parent);
                node = horizontalNodeRepository.save(node);
                existing.put(nodeKey(parent, entry.name()), node);
                created++;
                auditService.logWorkforceAction(ENTITY_NAME, node.getId(), AuditAction.IMPORT, currentUser, null,
                        workforceMapper.toHorizontalNodeResponseDto(node), "Excel import");
            } else if (entry.leader() != null && !entry.leader().equals(node.getLeader())) {
                HorizontalNodeResponseDto oldDto = workforceMapper.toHorizontalNodeResponseDto(node);
                node.setLeader(entry.leader());
                node = horizontalNodeRepository.save(node);
                updated++;
                auditService.logWorkforceAction(ENTITY_NAME, node.getId(), AuditAction.IMPORT, currentUser, oldDto,
                        workforceMapper.toHorizontalNodeResponseDto(node), "Excel import");
            }
            parents[entry.level()] = node;
        }
        return new StructureImportResultDto(created, updated, List.of());
    }

    private static String nodeKey(HorizontalNode parent, String name) {
        return (parent == null ? "" : parent.getId().toString()) + "|" + name.toLowerCase(Locale.ROOT);
    }

    // Hard delete, allowed only for a leaf that nothing references.
    // TODO: also forbid deleting a node that a demand still uses (demand.horizontal stores the name as text;
    // it should reference horizontal_node through a foreign key).
    public void delete(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        HorizontalNode node = findNodeOrThrow(id);
        if (horizontalNodeRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot delete a horizontal node that still has child nodes");
        }
        if (horizontalNodeRepository.existsProjectByNodeId(id)) {
            throw new IllegalStateException("Cannot delete a horizontal node that is referenced by projects");
        }
        if (horizontalNodeRepository.existsEmployeeAssignmentByNodeId(id)) {
            throw new IllegalStateException(
                    "Cannot delete a horizontal node that is referenced by employee horizontal assignments");
        }
        HorizontalNodeResponseDto oldDto = workforceMapper.toHorizontalNodeResponseDto(node);
        horizontalNodeRepository.delete(node);
        auditService.logWorkforceAction(ENTITY_NAME, id, AuditAction.DELETE, currentUser, oldDto, null, null);
    }

    private void assertCanDeactivate(UUID id) {
        if (horizontalNodeRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot deactivate a horizontal node that still has child nodes");
        }
        if (horizontalNodeRepository.existsProjectByNodeId(id)) {
            throw new IllegalStateException("Cannot deactivate a horizontal node that is referenced by projects");
        }
        if (horizontalNodeRepository.existsEmployeeAssignmentByNodeId(id)) {
            throw new IllegalStateException(
                    "Cannot deactivate a horizontal node that is referenced by employee horizontal assignments");
        }
    }

    HorizontalNode findNodeOrThrow(UUID id) {
        return horizontalNodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Horizontal node not found with id: " + id));
    }

    private void applyRequest(HorizontalNodeRequestDto dto, HorizontalNode node, UUID currentId) {
        HorizontalNode parent = null;
        if (dto.getParentId() != null) {
            if (currentId != null && dto.getParentId().equals(currentId)) {
                throw new IllegalArgumentException("A horizontal node cannot be its own parent");
            }
            parent = findNodeOrThrow(dto.getParentId());
        }

        short expectedLevel = parent == null ? 1 : (short) (parent.getLevel() + 1);
        if (expectedLevel > MAX_LEVEL || dto.getLevel() != expectedLevel) {
            throw new IllegalArgumentException(parent == null
                    ? "A horizontal node without a parent must be level 1"
                    : "A horizontal node under a level " + parent.getLevel() + " parent must be level " + expectedLevel);
        }

        node.setLevel(dto.getLevel());
        node.setName(dto.getName().trim());
        node.setCode(trimToNull(dto.getCode()));
        node.setLeader(trimToNull(dto.getLeader()));
        if (dto.getActive() != null) {
            node.setActive(dto.getActive());
        }
        node.setParent(parent);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

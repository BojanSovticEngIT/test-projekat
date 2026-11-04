package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.VerticalNodeRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.StructureImportResultDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalNodeResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.VerticalTaxonomy;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.VerticalTaxonomyRepository;
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
@Transactional(readOnly = true)
public class VerticalNodeService {

    private static final String ENTITY_NAME = "VerticalNode";
    private static final short MAX_LEVEL = 2;

    private final VerticalTaxonomyRepository verticalTaxonomyRepository;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    public List<VerticalNodeResponseDto> findAll(boolean includeInactive) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        List<VerticalTaxonomy> nodes = includeInactive
                ? verticalTaxonomyRepository.findAllByOrderByLevelAscNameAsc()
                : verticalTaxonomyRepository.findByActiveTrueOrderByLevelAscNameAsc();
        return nodes.stream()
                .map(workforceMapper::toVerticalNodeResponseDto)
                .toList();
    }

    @Transactional
    public VerticalNodeResponseDto create(VerticalNodeRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        VerticalTaxonomy node = new VerticalTaxonomy();
        applyRequest(dto, node, null);
        VerticalTaxonomy saved = verticalTaxonomyRepository.save(node);

        VerticalNodeResponseDto response = workforceMapper.toVerticalNodeResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    @Transactional
    public VerticalNodeResponseDto update(UUID id, VerticalNodeRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        VerticalTaxonomy node = findNodeOrThrow(id);
        if (node.isActive() && Boolean.FALSE.equals(dto.getActive())
                && verticalTaxonomyRepository.existsByParentIdAndActiveTrue(id)) {
            throw new IllegalStateException("Cannot deactivate a vertical node that still has active child nodes");
        }
        if (!node.getLevel().equals(dto.getLevel()) && verticalTaxonomyRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot change the level of a vertical node that has child nodes");
        }
        VerticalNodeResponseDto oldDto = workforceMapper.toVerticalNodeResponseDto(node);
        applyRequest(dto, node, id);
        VerticalTaxonomy saved = verticalTaxonomyRepository.save(node);

        VerticalNodeResponseDto newDto = workforceMapper.toVerticalNodeResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    public byte[] exportExcel() {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        List<StructureExcel.Node> nodes = verticalTaxonomyRepository.findByActiveTrueOrderByLevelAscNameAsc().stream()
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
    @Transactional
    public StructureImportResultDto importExcel(InputStream input) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        StructureExcel.Parsed parsed = StructureExcel.read(input, MAX_LEVEL);
        if (!parsed.errors().isEmpty()) {
            return new StructureImportResultDto(0, 0, parsed.errors());
        }

        Map<String, VerticalTaxonomy> existing = new HashMap<>();
        verticalTaxonomyRepository.findAll().forEach(node -> existing.put(nodeKey(node.getParent(), node.getName()), node));

        VerticalTaxonomy[] parents = new VerticalTaxonomy[MAX_LEVEL + 1];
        int created = 0;
        int updated = 0;
        for (StructureExcel.Entry entry : parsed.entries()) {
            VerticalTaxonomy parent = entry.level() > 1 ? parents[entry.level() - 1] : null;
            VerticalTaxonomy node = existing.get(nodeKey(parent, entry.name()));
            if (node == null) {
                node = new VerticalTaxonomy();
                node.setLevel((short) entry.level());
                node.setName(entry.name());
                node.setLeader(entry.leader());
                node.setParent(parent);
                node = verticalTaxonomyRepository.save(node);
                existing.put(nodeKey(parent, entry.name()), node);
                created++;
                auditService.logWorkforceAction(ENTITY_NAME, node.getId(), AuditAction.IMPORT, currentUser, null,
                        workforceMapper.toVerticalNodeResponseDto(node), "Excel import");
            } else if (entry.leader() != null && !entry.leader().equals(node.getLeader())) {
                VerticalNodeResponseDto oldDto = workforceMapper.toVerticalNodeResponseDto(node);
                node.setLeader(entry.leader());
                node = verticalTaxonomyRepository.save(node);
                updated++;
                auditService.logWorkforceAction(ENTITY_NAME, node.getId(), AuditAction.IMPORT, currentUser, oldDto,
                        workforceMapper.toVerticalNodeResponseDto(node), "Excel import");
            }
            parents[entry.level()] = node;
        }
        return new StructureImportResultDto(created, updated, List.of());
    }

    private static String nodeKey(VerticalTaxonomy parent, String name) {
        return (parent == null ? "" : parent.getId().toString()) + "|" + name.toLowerCase(Locale.ROOT);
    }

    // Hard delete, allowed only for a leaf.
    // TODO: forbid deleting a node that is still in use (clients and employee vertical assignments should
    // reference vertical_taxonomy through a foreign key instead of storing the names as text).
    @Transactional
    public void delete(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        VerticalTaxonomy node = findNodeOrThrow(id);
        if (verticalTaxonomyRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot delete a vertical node that still has child nodes");
        }
        VerticalNodeResponseDto oldDto = workforceMapper.toVerticalNodeResponseDto(node);
        verticalTaxonomyRepository.delete(node);
        auditService.logWorkforceAction(ENTITY_NAME, id, AuditAction.DELETE, currentUser, oldDto, null, null);
    }

    private VerticalTaxonomy findNodeOrThrow(UUID id) {
        return verticalTaxonomyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vertical node not found with id: " + id));
    }

    private void applyRequest(VerticalNodeRequestDto dto, VerticalTaxonomy node, UUID currentId) {
        VerticalTaxonomy parent = null;
        if (dto.getParentId() != null) {
            if (dto.getParentId().equals(currentId)) {
                throw new IllegalArgumentException("A vertical node cannot be its own parent");
            }
            parent = findNodeOrThrow(dto.getParentId());
        }

        short expectedLevel = parent == null ? 1 : (short) (parent.getLevel() + 1);
        if (expectedLevel > MAX_LEVEL || dto.getLevel() != expectedLevel) {
            throw new IllegalArgumentException(parent == null
                    ? "A vertical node without a parent must be level 1"
                    : "A vertical node under a level " + parent.getLevel() + " parent must be level " + expectedLevel);
        }

        String name = dto.getName().trim();
        assertNameUnique(parent, name, currentId);

        node.setLevel(dto.getLevel());
        node.setName(name);
        node.setCode(trimToNull(dto.getCode()));
        node.setLeader(trimToNull(dto.getLeader()));
        if (dto.getActive() != null) {
            node.setActive(dto.getActive());
        }
        node.setParent(parent);
    }

    private void assertNameUnique(VerticalTaxonomy parent, String name, UUID currentId) {
        List<VerticalTaxonomy> sameName = parent == null
                ? verticalTaxonomyRepository.findByParentIsNullAndNameIgnoreCase(name)
                : verticalTaxonomyRepository.findByParentIdAndNameIgnoreCase(parent.getId(), name);
        if (sameName.stream().anyMatch(other -> !other.getId().equals(currentId))) {
            throw new IllegalStateException("A vertical node named '" + name + "' already exists at this level");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.request.ClientRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.ClientResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Client;
import it.eng.wsm.skillmatrix.workforce.enums.ClientStatus;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.ClientRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private static final String ENTITY_NAME = "Client";

    private final ClientRepository clientRepository;
    private final WorkforceMapper workforceMapper;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    @Transactional(readOnly = true)
    public Page<ClientResponseDto> findAll(ClientStatus status, Pageable pageable) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);

        Page<Client> page = status != null
                ? clientRepository.findByStatus(status, pageable)
                : clientRepository.findAll(pageable);
        return page.map(workforceMapper::toClientResponseDto);
    }

    @Transactional(readOnly = true)
    public ClientResponseDto findById(UUID id) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        return workforceMapper.toClientResponseDto(findClientOrThrow(id));
    }

    public ClientResponseDto create(ClientRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        Client client = new Client();
        applyRequest(dto, client);
        Client saved = clientRepository.save(client);

        ClientResponseDto response = workforceMapper.toClientResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    public ClientResponseDto update(UUID id, ClientRequestDto dto) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        Client client = findClientOrThrow(id);
        ClientResponseDto oldDto = workforceMapper.toClientResponseDto(client);
        applyRequest(dto, client);
        Client saved = clientRepository.save(client);

        ClientResponseDto newDto = workforceMapper.toClientResponseDto(saved);
        auditService.logWorkforceAction(ENTITY_NAME, saved.getId(), AuditAction.UPDATE, currentUser, oldDto, newDto, null);
        return newDto;
    }

    Client findClientOrThrow(UUID id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + id));
    }

    private void applyRequest(ClientRequestDto dto, Client client) {
        client.setName(dto.getName().trim());
        client.setVerticalN1(trimToNull(dto.getVerticalN1()));
        client.setVerticalN2(trimToNull(dto.getVerticalN2()));
        client.setStatus(dto.getStatus() != null ? dto.getStatus() : ClientStatus.ACTIVE);
        client.setNotes(trimToNull(dto.getNotes()));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

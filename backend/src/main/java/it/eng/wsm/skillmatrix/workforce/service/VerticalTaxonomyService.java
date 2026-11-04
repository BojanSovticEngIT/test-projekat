package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.workforce.dto.response.VerticalTaxonomyResponseDto;
import it.eng.wsm.skillmatrix.workforce.mapper.WorkforceMapper;
import it.eng.wsm.skillmatrix.workforce.repository.VerticalTaxonomyRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VerticalTaxonomyService {

    private final VerticalTaxonomyRepository verticalTaxonomyRepository;
    private final WorkforceMapper workforceMapper;
    private final WorkforceSecuritySupport securitySupport;

    public List<VerticalTaxonomyResponseDto> findAll() {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogRead(currentUser);
        return verticalTaxonomyRepository.findAllByOrderByVerticalN1AscVerticalN2Asc().stream()
                .map(workforceMapper::toVerticalTaxonomyResponseDto)
                .toList();
    }
}

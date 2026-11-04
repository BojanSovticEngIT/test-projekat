package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkforceSecuritySupport {

    private final UserRepository userRepository;

    public User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    public void assertWorkforceCatalogRead(User user) {
        if (!canReadWorkforceCatalog(user.getRole())) {
            throw new AccessDeniedException("You do not have permission to view workforce catalog data");
        }
    }

    public void assertWorkforceCatalogWrite(User user) {
        if (!canWriteWorkforceCatalog(user.getRole())) {
            throw new AccessDeniedException("You do not have permission to modify workforce catalog data");
        }
    }

    public boolean canReadWorkforceCatalog(UserRole role) {
        return role == UserRole.ADMIN
                || role == UserRole.PMO
                || role == UserRole.HR
                || role == UserRole.HR_BUSINESS_PARTNER;
    }

    public boolean canWriteWorkforceCatalog(UserRole role) {
        return role == UserRole.ADMIN || role == UserRole.PMO;
    }
}

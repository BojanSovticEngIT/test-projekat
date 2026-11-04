package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.workforce.service.WorkforceSecuritySupport;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Module 3 role rules (spec 4.2, R-01 to R-04) in one place.
 * <ul>
 *   <li>Demand manager ({@code PMO}) and {@code ADMIN}: everything, including the candidate flow.</li>
 *   <li>HR BP / Recruiter ({@code HR_BUSINESS_PARTNER}): read all demands and candidates, add candidates, add notes.
 *       No demand changes and no flow changes (OQ-05 is open, so step statuses stay with the demand manager).</li>
 *   <li>Every other role: no general access. A user who is a meeting participant gets only that meeting and the
 *       candidate summary (R-03, N-03); the candidate services check this per meeting.</li>
 * </ul>
 * Controllers also guard with {@code @PreAuthorize}; this class is the service-level check.
 */
@Component
@RequiredArgsConstructor
public class DemandAccessPolicy {

    private static final Set<UserRole> READ_ROLES = Set.of(UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER);
    private static final Set<UserRole> MANAGE_ROLES = Set.of(UserRole.ADMIN, UserRole.PMO);
    private static final Set<UserRole> NOTE_ROLES = Set.of(UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER);
    private static final Set<UserRole> ADD_CANDIDATE_ROLES = Set.of(UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER);

    private final WorkforceSecuritySupport securitySupport;
    private final EmployeeRepository employeeRepository;

    public User currentUser() {
        return securitySupport.resolveCurrentUser();
    }

    public boolean canRead(User user) {
        return READ_ROLES.contains(user.getRole());
    }

    public boolean canManage(User user) {
        return MANAGE_ROLES.contains(user.getRole());
    }

    public boolean canAddNote(User user) {
        return NOTE_ROLES.contains(user.getRole());
    }

    public boolean canAddCandidate(User user) {
        return ADD_CANDIDATE_ROLES.contains(user.getRole());
    }

    /** Add steps, record outcomes, place and withdraw candidates. */
    public boolean canManageFlow(User user) {
        return MANAGE_ROLES.contains(user.getRole());
    }

    public void assertRead(User user) {
        if (!canRead(user)) {
            throw new AccessDeniedException("You do not have permission to view demands");
        }
    }

    public void assertManage(User user) {
        if (!canManage(user)) {
            throw new AccessDeniedException("You do not have permission to change demands");
        }
    }

    public void assertAddNote(User user) {
        if (!canAddNote(user)) {
            throw new AccessDeniedException("You do not have permission to add demand notes");
        }
    }

    public void assertAddCandidate(User user) {
        if (!canAddCandidate(user)) {
            throw new AccessDeniedException("You do not have permission to add candidates");
        }
    }

    public void assertManageFlow(User user) {
        if (!canManageFlow(user)) {
            throw new AccessDeniedException("You do not have permission to change the candidate flow");
        }
    }

    /** Display name for history, notes and owner: the linked employee's name, or the username. */
    public String displayName(User user) {
        return employeeRepository.findByUserId(user.getId())
                .map(employee -> (employee.getFirstName() + " " + employee.getLastName()).trim())
                .filter(name -> !name.isEmpty())
                .orElse(user.getUsername());
    }
}


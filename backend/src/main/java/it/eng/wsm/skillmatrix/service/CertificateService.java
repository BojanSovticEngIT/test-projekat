package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.dto.request.CertificateRequestDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateDocumentDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.entity.Certificate;
import it.eng.wsm.skillmatrix.entity.CertificateDocument;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.AccessDeniedException;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.CertificateMapper;
import it.eng.wsm.skillmatrix.repository.CertificateDocumentRepository;
import it.eng.wsm.skillmatrix.repository.CertificateRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillRepository;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class CertificateService {

    public static final long MAX_FILE_SIZE_BYTES = 30L * 1024 * 1024;
    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    private static final Tika TIKA = new Tika();
    private static final int MAX_FILE_NAME_LENGTH = 255;
    private static final String AUDIT_ENTITY = "Certificate";

    private final CertificateRepository certificateRepository;
    private final CertificateDocumentRepository certificateDocumentRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final CertificateMapper certificateMapper;
    private final AuditService auditService;
    private final ScopeService scopeService;

    @Transactional(readOnly = true)
    public Page<CertificateResponseDto> list(Pageable pageable) {
        Employee employee = findEmployeeForUser(resolveCurrentUser());
        return certificateRepository.findByEmployeeId(employee.getId(), pageable)
                .map(certificateMapper::toResponseDto);
    }

    @Transactional(readOnly = true)
    public CertificateResponseDto get(UUID id) {
        Employee employee = findEmployeeForUser(resolveCurrentUser());
        return certificateMapper.toResponseDto(findOwned(id, employee));
    }

    public CertificateResponseDto create(CertificateRequestDto request) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);

        validateDates(request.getCompletionDate(), request.getExpirationDate());
        MultipartFile file = request.getFile();
        boolean hasFile = file != null && !file.isEmpty();
        String link = normalizeLink(request.getLink());
        if (!hasFile && link == null) {
            throw new IllegalArgumentException("A PDF file or a link is required");
        }
        byte[] content = hasFile ? validatePdf(file) : null;
        Set<Skill> skills = resolveSkills(request.getSkillIds());

        Certificate certificate = new Certificate();
        certificate.setEmployee(employee);
        certificate.setName(request.getName().trim());
        certificate.setCompletionDate(request.getCompletionDate());
        certificate.setExpirationDate(request.getExpirationDate());
        certificate.setLink(link);
        if (hasFile) {
            applyFileDescriptor(certificate, file, content);
        }
        certificate.setSkills(skills);
        certificate = certificateRepository.saveAndFlush(certificate);

        if (hasFile) {
            certificateDocumentRepository.save(new CertificateDocument(certificate.getId(), content));
        }

        CertificateResponseDto response = certificateMapper.toResponseDto(certificate);
        auditService.log(AUDIT_ENTITY, certificate.getId(), AuditAction.CREATE, currentUser, null, response, null);
        return response;
    }

    public CertificateResponseDto update(UUID id, CertificateRequestDto request) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);
        Certificate certificate = findOwned(id, employee);
        CertificateResponseDto before = certificateMapper.toResponseDto(certificate);

        validateDates(request.getCompletionDate(), request.getExpirationDate());
        MultipartFile file = request.getFile();
        boolean replaceDocument = file != null && !file.isEmpty();
        byte[] content = replaceDocument ? validatePdf(file) : null;
        String link = normalizeLink(request.getLink());
        if (!replaceDocument && certificate.getFileName() == null && link == null) {
            throw new IllegalArgumentException("A PDF file or a link is required");
        }
        Set<Skill> skills = resolveSkills(request.getSkillIds());

        certificate.setName(request.getName().trim());
        certificate.setCompletionDate(request.getCompletionDate());
        certificate.setExpirationDate(request.getExpirationDate());
        certificate.setLink(link);
        certificate.getSkills().clear();
        certificate.getSkills().addAll(skills);

        if (replaceDocument) {
            applyFileDescriptor(certificate, file, content);
            CertificateDocument document = certificateDocumentRepository.findById(certificate.getId())
                    .orElseGet(() -> new CertificateDocument(id, null));
            document.setContent(content);
            certificateDocumentRepository.save(document);
        }

        certificateRepository.saveAndFlush(certificate);
        CertificateResponseDto after = certificateMapper.toResponseDto(certificate);
        auditService.log(AUDIT_ENTITY, certificate.getId(), AuditAction.UPDATE, currentUser, before, after,
                replaceDocument ? "Document replaced" : null);
        return after;
    }

    public void delete(UUID id) {
        User currentUser = resolveCurrentUser();
        Employee employee = findEmployeeForUser(currentUser);
        Certificate certificate = findOwned(id, employee);
        CertificateResponseDto before = certificateMapper.toResponseDto(certificate);

        certificateDocumentRepository.deleteById(certificate.getId());
        certificateDocumentRepository.flush();
        certificateRepository.delete(certificate);
        certificateRepository.flush();

        auditService.log(AUDIT_ENTITY, id, AuditAction.DELETE, currentUser, before, null, null);
    }

    @Transactional(readOnly = true)
    public CertificateDocumentDto getDocument(UUID id) {
        Employee employee = findEmployeeForUser(resolveCurrentUser());
        Certificate certificate = findOwned(id, employee);
        CertificateDocument document = certificateDocumentRepository.findById(certificate.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate document not found: " + id));
        return new CertificateDocumentDto(certificate.getFileName(), certificate.getContentType(), document.getContent());
    }

    // Read-only access for the employee detail page: same rules as EmployeeService.findById.
    @Transactional(readOnly = true)
    public Page<CertificateResponseDto> listForEmployee(UUID employeeId, Pageable pageable) {
        assertCanViewEmployee(employeeId);
        return certificateRepository.findByEmployeeId(employeeId, pageable)
                .map(certificateMapper::toResponseDto);
    }

    @Transactional(readOnly = true)
    public CertificateDocumentDto getDocumentForEmployee(UUID employeeId, UUID id) {
        assertCanViewEmployee(employeeId);
        Certificate certificate = certificateRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found: " + id));
        CertificateDocument document = certificateDocumentRepository.findById(certificate.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate document not found: " + id));
        return new CertificateDocumentDto(certificate.getFileName(), certificate.getContentType(), document.getContent());
    }

    // ── Certificates that back a single skill ───────────────────────────────

    /** Own certificates linked to one of the caller's own skills, newest first. */
    @Transactional(readOnly = true)
    public List<CertificateResponseDto> listForMySkill(UUID employeeSkillId) {
        EmployeeSkill employeeSkill = findOwnSkill(employeeSkillId);
        return certificateRepository
                .findByEmployeeIdAndSkillId(employeeSkill.getEmployee().getId(), employeeSkill.getSkill().getId())
                .stream()
                .map(certificateMapper::toResponseDto)
                .toList();
    }

    /** Certificate count per own employee skill; skills without certificates are absent. */
    @Transactional(readOnly = true)
    public Map<UUID, Long> countForMySkills() {
        Employee employee = findEmployeeForUser(resolveCurrentUser());
        List<UUID> skillIds = employeeSkillRepository.findByEmployeeId(employee.getId()).stream()
                .map(EmployeeSkill::getId)
                .toList();
        return countByEmployeeSkillIds(skillIds);
    }

    /** Certificates of a skill as seen by a reviewer who may view the skill owner (see assertCanViewEmployee). */
    @Transactional(readOnly = true)
    public List<CertificateResponseDto> listForEmployeeSkill(UUID employeeSkillId) {
        EmployeeSkill employeeSkill = findEmployeeSkill(employeeSkillId);
        assertCanViewEmployee(employeeSkill.getEmployee().getId());
        return certificateRepository
                .findByEmployeeIdAndSkillId(employeeSkill.getEmployee().getId(), employeeSkill.getSkill().getId())
                .stream()
                .map(certificateMapper::toResponseDto)
                .toList();
    }

    // Reviewers only get the PDFs that are linked to the skill under review.
    @Transactional(readOnly = true)
    public CertificateDocumentDto getDocumentForEmployeeSkill(UUID employeeSkillId, UUID id) {
        EmployeeSkill employeeSkill = findEmployeeSkill(employeeSkillId);
        assertCanViewEmployee(employeeSkill.getEmployee().getId());
        Certificate certificate = certificateRepository
                .findByIdAndEmployeeIdAndSkillId(id, employeeSkill.getEmployee().getId(), employeeSkill.getSkill().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found: " + id));
        CertificateDocument document = certificateDocumentRepository.findById(certificate.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate document not found: " + id));
        return new CertificateDocumentDto(certificate.getFileName(), certificate.getContentType(), document.getContent());
    }

    /** Certificate count per employee skill for any set of skills; skills without certificates are absent. */
    @Transactional(readOnly = true)
    public Map<UUID, Long> countByEmployeeSkillIds(Collection<UUID> employeeSkillIds) {
        Map<UUID, Long> counts = new HashMap<>();
        if (!employeeSkillIds.isEmpty()) {
            certificateRepository.countByEmployeeSkillIds(employeeSkillIds)
                    .forEach(row -> counts.put((UUID) row[0], (Long) row[1]));
        }
        return counts;
    }

    private EmployeeSkill findEmployeeSkill(UUID employeeSkillId) {
        return employeeSkillRepository.findById(employeeSkillId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee skill not found: " + employeeSkillId));
    }

    // Foreign and unknown ids both produce 404, like certificates.
    private EmployeeSkill findOwnSkill(UUID employeeSkillId) {
        Employee employee = findEmployeeForUser(resolveCurrentUser());
        EmployeeSkill employeeSkill = findEmployeeSkill(employeeSkillId);
        if (!employeeSkill.getEmployee().getId().equals(employee.getId())) {
            throw new ResourceNotFoundException("Employee skill not found: " + employeeSkillId);
        }
        return employeeSkill;
    }

    private void assertCanViewEmployee(UUID employeeId) {
        User currentUser = resolveCurrentUser();
        if (currentUser.getRole() == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Employees must use /api/me/certifications to view their own certificates");
        }
        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee not found: " + employeeId);
        }
        if (!scopeService.canAccessEmployee(currentUser, employeeId)) {
            throw new AccessDeniedException("You do not have permission to view this employee");
        }
    }

    // Foreign and unknown ids both produce 404 so ids of other users' certificates are not revealed.
    private Certificate findOwned(UUID id, Employee employee) {
        return certificateRepository.findByIdAndEmployeeId(id, employee.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found: " + id));
    }

    private void validateDates(LocalDate completionDate, LocalDate expirationDate) {
        if (completionDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("completionDate must not be in the future");
        }
        if (expirationDate != null && expirationDate.isBefore(completionDate)) {
            throw new IllegalArgumentException("expirationDate must not be before completionDate");
        }
    }

    // Blank means "no link"; only absolute http(s) URLs are accepted so the link is safe to render as an anchor.
    private String normalizeLink(String rawLink) {
        if (rawLink == null || rawLink.isBlank()) {
            return null;
        }
        String link = rawLink.trim();
        try {
            URI uri = new URI(link);
            String scheme = uri.getScheme();
            boolean httpScheme = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
            if (!httpScheme || uri.getHost() == null) {
                throw new IllegalArgumentException("link must be a valid http or https URL");
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("link must be a valid http or https URL");
        }
        return link;
    }

    private byte[] validatePdf(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size of 30 MB");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF files are allowed (.pdf)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !PDF_CONTENT_TYPE.equalsIgnoreCase(contentType.split(";")[0].trim())) {
            throw new IllegalArgumentException("Only PDF files are allowed (application/pdf)");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Uploaded file could not be read");
        }
        if (content.length == 0) {
            throw new IllegalArgumentException("A PDF file is required");
        }
        // Content-based detection (magic bytes only, no file name hint) so a renamed or re-labelled file is rejected.
        if (content.length < PDF_MAGIC.length
                || !Arrays.equals(Arrays.copyOf(content, PDF_MAGIC.length), PDF_MAGIC)
                || !PDF_CONTENT_TYPE.equals(TIKA.detect(content))) {
            throw new IllegalArgumentException("File content is not a valid PDF");
        }
        return content;
    }

    private void applyFileDescriptor(Certificate certificate, MultipartFile file, byte[] content) {
        certificate.setFileName(sanitizeFileName(file.getOriginalFilename()));
        certificate.setContentType(PDF_CONTENT_TYPE);
        certificate.setFileSize((long) content.length);
    }

    private String sanitizeFileName(String originalName) {
        String name = StringUtils.getFilename(StringUtils.cleanPath(originalName == null ? "" : originalName));
        name = name == null ? "" : name.replaceAll("[\\p{Cntrl}\"\\\\/]", "_").trim();
        if (name.length() > MAX_FILE_NAME_LENGTH) {
            name = name.substring(name.length() - MAX_FILE_NAME_LENGTH);
        }
        return name.isEmpty() ? "certificate.pdf" : name;
    }

    private Set<Skill> resolveSkills(List<UUID> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<UUID> distinctIds = new LinkedHashSet<>(skillIds);
        if (distinctIds.contains(null)) {
            throw new IllegalArgumentException("skillIds must not contain empty values");
        }
        List<Skill> found = skillRepository.findAllById(distinctIds);
        if (found.size() != distinctIds.size()) {
            Set<UUID> foundIds = new LinkedHashSet<>();
            found.forEach(skill -> foundIds.add(skill.getId()));
            distinctIds.removeAll(foundIds);
            throw new IllegalArgumentException("Unknown skill id(s): " + distinctIds);
        }
        return new LinkedHashSet<>(found);
    }

    private Employee findEmployeeForUser(User user) {
        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record found for user: " + user.getUsername()));
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}

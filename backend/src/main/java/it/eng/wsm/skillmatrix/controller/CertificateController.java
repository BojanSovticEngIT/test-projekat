package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.dto.request.CertificateRequestDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateDocumentDto;
import it.eng.wsm.skillmatrix.dto.response.CertificateResponseDto;
import it.eng.wsm.skillmatrix.service.CertificateService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/certifications")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class CertificateController {

    private static final int MAX_PAGE_SIZE = 100;

    private final CertificateService certificateService;

    @GetMapping
    public ResponseEntity<Page<CertificateResponseDto>> list(
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(certificateService.list(cap(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CertificateResponseDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.get(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CertificateResponseDto> create(@Valid @ModelAttribute CertificateRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.create(request));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CertificateResponseDto> update(
            @PathVariable UUID id,
            @Valid @ModelAttribute CertificateRequestDto request) {
        return ResponseEntity.ok(certificateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        certificateService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID id) {
        return pdfResponse(certificateService.getDocument(id));
    }

    static Pageable cap(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), pageable.getSort());
    }

    static ResponseEntity<byte[]> pdfResponse(CertificateDocumentDto document) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(document.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(document.fileName(), StandardCharsets.UTF_8)
                                .build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(document.content());
    }
}

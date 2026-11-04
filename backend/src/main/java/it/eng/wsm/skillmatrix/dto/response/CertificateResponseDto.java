package it.eng.wsm.skillmatrix.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CertificateResponseDto(
        UUID id,
        String name,
        LocalDate completionDate,
        LocalDate expirationDate,
        String documentFileName,
        Long documentSize,
        String link,
        List<Skill> skills,
        Instant createdAt,
        Instant updatedAt) {

    public record Skill(UUID id, String name) {
    }
}

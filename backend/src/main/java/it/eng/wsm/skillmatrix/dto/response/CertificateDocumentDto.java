package it.eng.wsm.skillmatrix.dto.response;

public record CertificateDocumentDto(String fileName, String contentType, byte[] content) {
}

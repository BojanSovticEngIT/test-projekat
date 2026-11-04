package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.CertificateDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CertificateDocumentRepository extends JpaRepository<CertificateDocument, UUID> {
}

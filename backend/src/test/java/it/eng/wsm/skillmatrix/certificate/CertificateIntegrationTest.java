package it.eng.wsm.skillmatrix.certificate;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Employee-owned, PDF-backed certificates: validation, ownership, storage and download. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class CertificateIntegrationTest {

    private static final String BASE = "/api/me/certifications";
    private static final byte[] PDF_A = "%PDF-1.4\nfirst document\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] PDF_B = "%PDF-1.7\nreplacement document\n%%EOF".getBytes(StandardCharsets.US_ASCII);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport support;
    private String employeeToken;
    private String managerToken;
    private List<UUID> skillIds;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        String adminToken = support.loginAndGetToken("admin", PASSWORD);
        JsonNode skills = support.getJson(adminToken, "/api/skills?page=0&size=3").get("content");
        skillIds = List.of(
                UUID.fromString(skills.get(0).get("id").asText()),
                UUID.fromString(skills.get(1).get("id").asText()));
        jdbcTemplate.update("DELETE FROM certificate");
    }

    @Test
    void createsCertificateWithPdfAndOptionalSkills() throws Exception {
        MvcResult result = authorized(form(HttpMethod.POST, BASE, "AWS SAA", "2024-05-01", PDF_A, "aws.pdf")
                .param("skillIds", skillIds.get(0).toString(), skillIds.get(1).toString()), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("AWS SAA"))
                .andExpect(jsonPath("$.completionDate").value("2024-05-01"))
                .andExpect(jsonPath("$.documentFileName").value("aws.pdf"))
                .andExpect(jsonPath("$.documentSize").value(PDF_A.length))
                .andExpect(jsonPath("$.skills.length()").value(2))
                .andReturn();

        UUID id = idOf(result);
        assertThat(storedContent(id)).isEqualTo(PDF_A);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_log WHERE entity_name = 'Certificate' AND entity_id = ? AND action = 'CREATE'",
                Integer.class, id.toString())).isEqualTo(1);
    }

    @Test
    void createsCertificateWithoutSkills() throws Exception {
        authorized(form(HttpMethod.POST, BASE, "Scrum", "2023-01-10", PDF_A, "scrum.pdf"), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.skills.length()").value(0));
    }

    @Test
    void rejectsMissingRequiredInputs() throws Exception {
        authorized(multipart(BASE).file(pdf(PDF_A, "a.pdf")).param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='name')]").exists());
        authorized(multipart(BASE).file(pdf(PDF_A, "a.pdf")).param("name", "X"), employeeToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='completionDate')]").exists());
        authorized(multipart(BASE).param("name", "X").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(form(HttpMethod.POST, BASE, "   ", "2024-05-01", PDF_A, "a.pdf"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(form(HttpMethod.POST, BASE, "X", "2999-01-01", PDF_A, "a.pdf"), employeeToken)
                .andExpect(status().isBadRequest());
        assertThat(count()).isZero();
    }

    @Test
    void rejectsNonPdfFiles() throws Exception {
        byte[] text = "hello".getBytes(StandardCharsets.US_ASCII);
        authorized(form(HttpMethod.POST, BASE, "X", "2024-05-01", text, "notes.txt"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(multipart(BASE)
                .file(new MockMultipartFile("file", "a.pdf", "text/plain", PDF_A))
                .param("name", "X").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(form(HttpMethod.POST, BASE, "X", "2024-05-01", text, "fake.pdf"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(form(HttpMethod.POST, BASE, "X", "2024-05-01", new byte[0], "empty.pdf"), employeeToken)
                .andExpect(status().isBadRequest());
        assertThat(count()).isZero();
    }

    @Test
    void rejectsFilesOverThirtyMegabytes() throws Exception {
        byte[] oversized = new byte[30 * 1024 * 1024 + 1];
        System.arraycopy(PDF_A, 0, oversized, 0, PDF_A.length);

        authorized(form(HttpMethod.POST, BASE, "Big", "2024-05-01", oversized, "big.pdf"), employeeToken)
                .andExpect(status().isBadRequest());
        assertThat(count()).isZero();
    }

    @Test
    void rejectsUnknownSkillIds() throws Exception {
        authorized(form(HttpMethod.POST, BASE, "X", "2024-05-01", PDF_A, "a.pdf")
                .param("skillIds", UUID.randomUUID().toString()), employeeToken)
                .andExpect(status().isBadRequest());
        assertThat(count()).isZero();
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get(BASE)).andExpect(status().is4xxClientError());
    }

    @Test
    void listsAndGetsOnlyOwnCertificates() throws Exception {
        UUID mine = create(employeeToken, "Mine");
        UUID theirs = create(managerToken, "Theirs");

        authorized(get(BASE + "?page=0&size=20"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(mine.toString()))
                .andExpect(jsonPath("$.page.totalElements").value(1));
        authorized(get(BASE + "/" + mine), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Mine"));
        authorized(get(BASE + "/" + theirs), employeeToken).andExpect(status().isNotFound());
    }

    @Test
    void paginatesList() throws Exception {
        create(employeeToken, "One");
        create(employeeToken, "Two");
        create(employeeToken, "Three");

        authorized(get(BASE + "?page=1&size=2"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(3))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void rejectsCrossUserAccessByIdentifier() throws Exception {
        UUID id = create(employeeToken, "Private");

        authorized(get(BASE + "/" + id), managerToken).andExpect(status().isNotFound());
        authorized(get(BASE + "/" + id + "/document"), managerToken).andExpect(status().isNotFound());
        authorized(form(HttpMethod.PUT, BASE + "/" + id, "Hacked", "2024-05-01", PDF_B, "b.pdf"), managerToken)
                .andExpect(status().isNotFound());
        authorized(delete(BASE + "/" + id), managerToken).andExpect(status().isNotFound());

        authorized(get(BASE + "/" + id), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Private"));
        assertThat(storedContent(id)).isEqualTo(PDF_A);
    }

    @Test
    void metadataOnlyUpdatePreservesDocument() throws Exception {
        UUID id = create(employeeToken, "Before");

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id)
                .param("name", "After")
                .param("completionDate", "2024-06-02")
                .param("skillIds", skillIds.get(0).toString()), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("After"))
                .andExpect(jsonPath("$.completionDate").value("2024-06-02"))
                .andExpect(jsonPath("$.documentFileName").value("a.pdf"))
                .andExpect(jsonPath("$.skills.length()").value(1));

        assertThat(storedContent(id)).isEqualTo(PDF_A);
        authorized(get(BASE + "/" + id + "/document"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsByteArray()).isEqualTo(PDF_A));
    }

    @Test
    void updateReplacesSkillAssociations() throws Exception {
        UUID id = createWithSkills(employeeToken, "Skilled", skillIds);

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id)
                .param("name", "Skilled")
                .param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills.length()").value(0));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM certificate_skill WHERE certificate_id = ?", Integer.class, id)).isZero();
    }

    @Test
    void replacingPdfUpdatesStoredDocumentAndDownload() throws Exception {
        UUID id = create(employeeToken, "Replace me");

        authorized(form(HttpMethod.PUT, BASE + "/" + id, "Replace me", "2024-05-01", PDF_B, "new.pdf"),
                employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentFileName").value("new.pdf"))
                .andExpect(jsonPath("$.documentSize").value(PDF_B.length));

        assertThat(storedContent(id)).isEqualTo(PDF_B);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM certificate_document WHERE certificate_id = ?", Integer.class, id)).isEqualTo(1);
        authorized(get(BASE + "/" + id + "/document"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsByteArray()).isEqualTo(PDF_B));
    }

    @Test
    void invalidReplacementKeepsExistingDocument() throws Exception {
        UUID id = create(employeeToken, "Keep me");

        authorized(form(HttpMethod.PUT, BASE + "/" + id, "Changed", "2024-05-01",
                "not a pdf".getBytes(StandardCharsets.US_ASCII), "bad.pdf"), employeeToken)
                .andExpect(status().isBadRequest());

        assertThat(storedContent(id)).isEqualTo(PDF_A);
        authorized(get(BASE + "/" + id), employeeToken).andExpect(jsonPath("$.name").value("Keep me"));
    }

    @Test
    void downloadReturnsPdfWithSafeHeaders() throws Exception {
        UUID id = create(employeeToken, "Download");

        authorized(get(BASE + "/" + id + "/document"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(result -> {
                    assertThat(result.getResponse().getContentType()).isEqualTo("application/pdf");
                    assertThat(result.getResponse().getHeader("Content-Disposition"))
                            .startsWith("attachment").contains("a.pdf");
                    assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
                    assertThat(result.getResponse().getContentAsByteArray()).isEqualTo(PDF_A);
                });
    }

    @Test
    void deleteRemovesCertificateDocumentAndSkillLinks() throws Exception {
        UUID id = createWithSkills(employeeToken, "Delete me", skillIds);
        assertThat(count()).isEqualTo(1);

        authorized(delete(BASE + "/" + id), employeeToken).andExpect(status().isNoContent());

        assertThat(count()).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM certificate_document WHERE certificate_id = ?", Integer.class, id)).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM certificate_skill WHERE certificate_id = ?", Integer.class, id)).isZero();
        authorized(get(BASE + "/" + id), employeeToken).andExpect(status().isNotFound());
        authorized(get(BASE + "/" + id + "/document"), employeeToken).andExpect(status().isNotFound());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_log WHERE entity_name = 'Certificate' AND entity_id = ? AND action = 'DELETE'",
                Integer.class, id.toString())).isEqualTo(1);
    }

    @Test
    void rejectsSpoofedFilesDisguisedAsPdf() throws Exception {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};
        byte[] zip = {'P', 'K', 3, 4, 20, 0, 0, 0, 8, 0, 0, 0, 0, 0};
        byte[] elf = {0x7F, 'E', 'L', 'F', 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);
        byte[] leadingJunk = "<script>x</script>\n%PDF-1.4\n%%EOF".getBytes(StandardCharsets.US_ASCII);

        for (byte[] spoof : List.of(png, zip, elf, html, leadingJunk)) {
            authorized(form(HttpMethod.POST, BASE, "Spoof", "2024-05-01", spoof, "certificate.pdf"), employeeToken)
                    .andExpect(status().isBadRequest());
        }
        assertThat(count()).isZero();
    }

    @Test
    void spoofedReplacementKeepsExistingDocument() throws Exception {
        UUID id = create(employeeToken, "Original");
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id).file(pdf(png, "new.pdf"))
                .param("name", "Original").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isBadRequest());

        assertThat(storedContent(id)).isEqualTo(PDF_A);
    }

    @Test
    void createsLinkOnlyCertificateWithoutDocument() throws Exception {
        MvcResult result = authorized(multipart(BASE)
                .param("name", "Linked").param("completionDate", "2024-05-01")
                .param("link", " https://example.com/cert/1 "), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.link").value("https://example.com/cert/1"))
                .andExpect(jsonPath("$.documentFileName").doesNotExist())
                .andExpect(jsonPath("$.documentSize").doesNotExist())
                .andReturn();

        UUID id = idOf(result);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM certificate_document WHERE certificate_id = ?", Integer.class, id)).isZero();
        authorized(get(BASE + "/" + id + "/document"), employeeToken).andExpect(status().isNotFound());
    }

    @Test
    void createsCertificateWithBothPdfAndLink() throws Exception {
        authorized(form(HttpMethod.POST, BASE, "Both", "2024-05-01", PDF_A, "a.pdf")
                .param("link", "http://example.com/c"), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.link").value("http://example.com/c"))
                .andExpect(jsonPath("$.documentFileName").value("a.pdf"));
    }

    @Test
    void rejectsInvalidOrMissingLink() throws Exception {
        for (String link : List.of("javascript:alert(1)", "ftp://example.com/x", "not a url", "https://")) {
            authorized(multipart(BASE).param("name", "X").param("completionDate", "2024-05-01").param("link", link),
                    employeeToken).andExpect(status().isBadRequest());
        }
        authorized(multipart(BASE).param("name", "X").param("completionDate", "2024-05-01").param("link", "  "),
                employeeToken).andExpect(status().isBadRequest());
        assertThat(count()).isZero();
    }

    @Test
    void updateCannotRemoveLastDocumentSource() throws Exception {
        UUID id = idOf(authorized(multipart(BASE)
                .param("name", "Linked").param("completionDate", "2024-05-01")
                .param("link", "https://example.com/c"), employeeToken)
                .andExpect(status().isCreated()).andReturn());

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id)
                .param("name", "Linked").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isBadRequest());

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id).file(pdf(PDF_A, "a.pdf"))
                .param("name", "Linked").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.link").doesNotExist())
                .andExpect(jsonPath("$.documentFileName").value("a.pdf"));
    }

    @Test
    void expirationDateIsOptionalAndCannotPrecedeCompletion() throws Exception {
        authorized(form(HttpMethod.POST, BASE, "No expiry", "2024-05-01", PDF_A, "a.pdf"), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expirationDate").doesNotExist());

        UUID id = idOf(authorized(form(HttpMethod.POST, BASE, "Expires", "2024-05-01", PDF_A, "a.pdf")
                .param("expirationDate", "2999-05-01"), employeeToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expirationDate").value("2999-05-01"))
                .andReturn());

        authorized(form(HttpMethod.POST, BASE, "Bad", "2024-05-01", PDF_A, "a.pdf")
                .param("expirationDate", "2024-04-30"), employeeToken)
                .andExpect(status().isBadRequest());

        authorized(multipart(HttpMethod.PUT, BASE + "/" + id)
                .param("name", "Expires").param("completionDate", "2024-05-01"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expirationDate").doesNotExist());
    }

    private UUID create(String token, String name) throws Exception {
        return createWithSkills(token, name, List.of());
    }

    private UUID createWithSkills(String token, String name, List<UUID> skills) throws Exception {
        MockHttpServletRequestBuilder builder = form(HttpMethod.POST, BASE, name, "2024-05-01", PDF_A, "a.pdf");
        skills.forEach(skill -> builder.param("skillIds", skill.toString()));
        return idOf(authorized(builder, token).andExpect(status().isCreated()).andReturn());
    }

    private ResultActions authorized(MockHttpServletRequestBuilder builder, String token) throws Exception {
        return support.authorized(builder, token);
    }

    private MockHttpServletRequestBuilder form(
            HttpMethod method, String url, String name, String completionDate, byte[] content, String fileName) {
        return multipart(method, url)
                .file(pdf(content, fileName))
                .param("name", name)
                .param("completionDate", completionDate);
    }

    private MockMultipartFile pdf(byte[] content, String fileName) {
        String type = fileName.endsWith(".txt") ? "text/plain" : "application/pdf";
        return new MockMultipartFile("file", fileName, type, content);
    }

    private UUID idOf(MvcResult result) throws Exception {
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    private byte[] storedContent(UUID id) {
        return jdbcTemplate.queryForObject(
                "SELECT content FROM certificate_document WHERE certificate_id = ?", byte[].class, id);
    }

    private int count() {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM certificate", Integer.class);
    }
}

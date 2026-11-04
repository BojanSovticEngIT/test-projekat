package it.eng.wsm.skillmatrix.employeeskill;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Employee edit of non-SUBMITTED skills and the manager-approved skill deletion request. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class SkillEditAndDeletionRequestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    private IntegrationTestSupport support;
    private String adminToken;
    private String managerToken;
    private String otherManagerToken;
    private String employeeToken;
    private String otherEmployeeToken;
    private List<UUID> skillIds;

    private static final String REASON = "{\"reason\":\"No longer used\"}";

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);
        otherEmployeeToken = support.loginAndGetToken("emp01", PASSWORD);
        String otherManager = jdbc.queryForObject("""
                SELECT u.username FROM "user" u JOIN employee e ON e.user_id = u.id
                WHERE u.role = 'LINE_MANAGER' AND u.username <> 'manager' LIMIT 1
                """, String.class);
        otherManagerToken = support.loginAndGetToken(otherManager, PASSWORD);

        jdbc.update("DELETE FROM notification WHERE validation_request_id IN "
                + "(SELECT id FROM validation_request WHERE employee_id = ?)", EMPLOYEE_ONE);
        jdbc.update("DELETE FROM validation_request_item WHERE validation_request_id IN "
                + "(SELECT id FROM validation_request WHERE employee_id = ?)", EMPLOYEE_ONE);
        jdbc.update("DELETE FROM validation_request WHERE employee_id = ?", EMPLOYEE_ONE);
        jdbc.update("DELETE FROM certificate WHERE employee_id = ?", EMPLOYEE_ONE);
        jdbc.update("DELETE FROM employee_skill WHERE employee_id = ?", EMPLOYEE_ONE);
        skillIds = jdbc.queryForList("SELECT id FROM skill ORDER BY name LIMIT 4", UUID.class);
    }

    // ── edit ───────────────────────────────────────────────────────────────

    @Test
    void employeeEditsValidatedSkillKeepingStatusAndManagerData() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill);
        int audits = auditCount(skill, "UPDATE");

        JsonNode edited = putOk(employeeToken, skill, """
                {"skillId":"%s","selfAssessedLevel":5,"yearsOfExperience":7.0,"lastUsedDate":"2024-06-01",
                "employeeComment":"new"}""".formatted(skillIds.get(0)));

        assertThat(edited.get("validationStatus").asText()).isEqualTo("VALIDATED");
        assertThat(edited.get("selfAssessedLevel").asInt()).isEqualTo(5);
        assertThat(edited.get("managerValidatedLevel").asInt()).isEqualTo(4);
        assertThat(edited.get("managerComment").asText()).isEqualTo("ok");
        assertThat(edited.get("employeeComment").asText()).isEqualTo("new");
        assertThat(versions(skill)).isEqualTo(revisions + 1);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits + 1);

        // unchanged values are a no-op: no revision, no audit
        putOk(employeeToken, skill, """
                {"skillId":"%s","selfAssessedLevel":5,"yearsOfExperience":7.0,"lastUsedDate":"2024-06-01",
                "employeeComment":"new"}""".formatted(skillIds.get(0)));
        assertThat(versions(skill)).isEqualTo(revisions + 1);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits + 1);
    }

    @Test
    void editIsRejectedForSubmittedSkillsAndForOtherEmployees() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);
        int revisions = versions(skill);
        String body = skillBody(skillIds.get(0), 4);

        authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON).content(body), employeeToken)
                .andExpect(status().isConflict());
        decideAndDiscard(requestId);
        authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON).content(body),
                otherEmployeeToken).andExpect(status().isForbidden());
        assertThat(versions(skill)).isGreaterThanOrEqualTo(revisions);
    }

    // ── direct deletion of drafts ──────────────────────────────────────────

    @Test
    void ownerDeletesDraftDirectlyAfterPersistingFinalRevisionAndAudit() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        int revisions = versions(skill);
        String historyBefore = historyJson(skill);

        authorized(delete("/api/me/skills/" + skill), otherEmployeeToken).andExpect(status().isForbidden());
        assertThat(liveCount(skill)).isEqualTo(1);

        authorized(delete("/api/me/skills/" + skill), employeeToken).andExpect(status().isNoContent());

        assertThat(liveCount(skill)).isZero();
        assertThat(versions(skill)).isEqualTo(revisions + 1);
        assertThat(historyJson(skill)).startsWith(historyBefore.substring(0, historyBefore.length() - 1));
        assertThat(auditCount(skill, "DELETE")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM validation_request WHERE request_type = 'DELETION' "
                + "AND employee_id = ?", Integer.class, EMPLOYEE_ONE)).isZero();
    }

    @Test
    void directDeleteIsRejectedForEveryNonDraftStatus() throws Exception {
        UUID validated = validatedSkill(skillIds.get(0), 3);
        UUID rejected = rejectedSkill(skillIds.get(1));
        UUID archived = addSkill(skillIds.get(2), 2);
        jdbc.update("UPDATE employee_skill SET validation_status = 'ARCHIVED' WHERE id = ?", archived);
        UUID submitted = addSkill(skillIds.get(3), 2);
        submit(submitted);

        for (UUID skill : List.of(validated, rejected, archived, submitted)) {
            int revisions = versions(skill);
            authorized(delete("/api/me/skills/" + skill), employeeToken).andExpect(status().isConflict());
            assertThat(liveCount(skill)).isEqualTo(1);
            assertThat(versions(skill)).isEqualTo(revisions);
            assertThat(auditCount(skill, "DELETE")).isZero();
        }
    }

    // ── request deletion ───────────────────────────────────────────────────

    @Test
    void deletionRequestNeedsReasonOwnerAndNonDraftSkill() throws Exception {
        UUID draft = addSkill(skillIds.get(0), 2);
        UUID skill = validatedSkill(skillIds.get(1), 3);
        String path = "/api/me/skills/" + skill + "/request-deletion";

        authorized(post(path), employeeToken).andExpect(status().isBadRequest());
        for (String body : List.of("{}", "{\"reason\":\"\"}", "{\"reason\":\"   \"}")) {
            authorized(post(path).contentType(MediaType.APPLICATION_JSON).content(body), employeeToken)
                    .andExpect(status().isBadRequest());
        }
        authorized(post(path).contentType(MediaType.APPLICATION_JSON).content(REASON), otherEmployeeToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/me/skills/" + UUID.randomUUID() + "/request-deletion")
                .contentType(MediaType.APPLICATION_JSON).content(REASON), employeeToken)
                .andExpect(status().isNotFound());
        authorized(post("/api/me/skills/" + draft + "/request-deletion").contentType(MediaType.APPLICATION_JSON)
                .content(REASON), employeeToken).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM validation_request WHERE request_type = 'DELETION' "
                + "AND employee_id = ?", Integer.class, EMPLOYEE_ONE)).isZero();

        JsonNode request = postOk(employeeToken, path, "{\"reason\":\"  No longer used  \"}");
        assertThat(request.get("requestType").asText()).isEqualTo("DELETION");
        assertThat(request.get("reason").asText()).isEqualTo("No longer used");
        assertThat(request.get("status").asText()).isEqualTo("SUBMITTED");
        assertThat(request.get("items")).hasSize(1);
        assertThat(request.get("items").get(0).get("employeeSkillId").asText()).isEqualTo(skill.toString());
        assertThat(liveCount(skill)).isEqualTo(1);
    }

    @Test
    void openDeletionRequestLocksTheSkillAndBlocksDuplicates() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        requestDeletion(skill);

        authorized(post("/api/me/skills/" + skill + "/request-deletion").contentType(MediaType.APPLICATION_JSON)
                .content(REASON), employeeToken).andExpect(status().isConflict());
        authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON)
                .content(skillBody(skillIds.get(0), 4)), employeeToken).andExpect(status().isConflict());
        authorized(delete("/api/me/skills/" + skill), employeeToken).andExpect(status().isConflict());
        authorized(post("/api/me/skills/submit-validation").contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeSkillIds\":[\"" + skill + "\"]}"), employeeToken)
                .andExpect(status().isConflict());
    }

    @Test
    void submittedSkillCannotBeRequestedForDeletion() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        submit(skill);

        authorized(post("/api/me/skills/" + skill + "/request-deletion").contentType(MediaType.APPLICATION_JSON)
                .content(REASON), employeeToken).andExpect(status().isConflict());
    }

    // ── manager decision ───────────────────────────────────────────────────

    @Test
    void onlyTheDirectManagerCanDecide() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        UUID requestId = requestDeletion(skill);
        UUID item = firstItem(requestId);

        decision(otherManagerToken, requestId, item, "approve", "{}").andExpect(status().isForbidden());
        decision(employeeToken, requestId, item, "approve", "{}").andExpect(status().isForbidden());
        decision(otherManagerToken, requestId, item, "reject", "{\"managerComment\":\"no\"}")
                .andExpect(status().isForbidden());
        assertThat(liveCount(skill)).isEqualTo(1);
        assertThat(requestStatus(requestId)).isEqualTo("SUBMITTED");
    }

    @Test
    void approvalDeletesLiveSkillButKeepsHistoryAuditAndDecisionRecord() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisionsBefore = versions(skill);
        String historyBefore = historyJson(skill);
        UUID requestId = requestDeletion(skill);

        // no body needed: deletion approval carries no validated level
        decision(managerToken, requestId, firstItem(requestId), "approve", null).andExpect(status().isOk());

        assertThat(liveCount(skill)).isZero();
        assertThat(versions(skill)).isEqualTo(revisionsBefore + 1);
        assertThat(historyJson(skill)).startsWith(historyBefore.substring(0, historyBefore.length() - 1));
        assertThat(auditCount(skill, "DELETE")).isEqualTo(1);
        assertThat(requestStatus(requestId)).isEqualTo("APPROVED");

        JsonNode detail = objectMapper.readTree(authorized(get("/api/validation-requests/" + requestId), managerToken)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(detail.get("requestType").asText()).isEqualTo("DELETION");
        assertThat(detail.get("reason").asText()).isEqualTo("No longer used");
        assertThat(detail.get("items").get(0).get("status").asText()).isEqualTo("APPROVED");
        assertThat(detail.get("items").get(0).get("skillName").asText()).isNotBlank();
        assertThat(detail.get("items").get(0).get("employeeSkillId").asText()).isEqualTo(skill.toString());

        decision(managerToken, requestId, firstItem(requestId), "approve", null).andExpect(status().isConflict());
    }

    @Test
    void rejectionLeavesSkillUnchangedAndEditable() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill);
        String live = liveJson(skill);
        UUID requestId = requestDeletion(skill);

        decision(managerToken, requestId, firstItem(requestId), "reject", "{\"managerComment\":\"keep it\"}")
                .andExpect(status().isOk());

        assertThat(liveJson(skill)).isEqualTo(live);
        assertThat(versions(skill)).isEqualTo(revisions);
        assertThat(requestStatus(requestId)).isEqualTo("REJECTED");
        assertThat(auditCount(skill, "DELETE")).isZero();
        putOk(employeeToken, skill, skillBody(skillIds.get(0), 5));
    }

    // ── revoke of a submitted deletion request ─────────────────────────────

    @Test
    void requesterCanRevokeUndecidedDeletionRequestWithoutChangingTheSkill() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill);
        String live = liveJson(skill);
        UUID requestId = requestDeletion(skill);

        authorized(post("/api/validation-requests/" + requestId + "/revoke"), otherEmployeeToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/validation-requests/" + requestId + "/revoke"), managerToken)
                .andExpect(status().isForbidden());
        postOk(employeeToken, "/api/validation-requests/" + requestId + "/revoke");

        assertThat(requestStatus(requestId)).isEqualTo("CANCELLED");
        assertThat(liveJson(skill)).isEqualTo(live);
        assertThat(versions(skill)).isEqualTo(revisions);
        putOk(employeeToken, skill, skillBody(skillIds.get(0), 5));
        authorized(post("/api/validation-requests/" + requestId + "/revoke"), employeeToken)
                .andExpect(status().isConflict());
    }

    @Test
    void decidedDeletionRequestCannotBeRevokedAndValidationApprovalStillNeedsALevel() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        UUID deletion = requestDeletion(skill);
        decision(managerToken, deletion, firstItem(deletion), "reject", "{\"managerComment\":\"no\"}")
                .andExpect(status().isOk());
        authorized(post("/api/validation-requests/" + deletion + "/revoke"), employeeToken)
                .andExpect(status().isConflict());

        UUID other = addSkill(skillIds.get(1), 2);
        UUID validation = submit(other);
        decision(managerToken, validation, firstItem(validation), "approve", "{}").andExpect(status().isBadRequest());
        decision(managerToken, validation, firstItem(validation), "approve", "{\"managerValidatedLevel\":3}")
                .andExpect(status().isOk());
        assertThat(liveCount(other)).isEqualTo(1);
    }

    // ── employee note visible to the reviewing manager ─────────────────────

    @Test
    void managerSeesEmployeeNoteOfValidationRequestInScopeOnly() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);

        JsonNode detail = getJson(managerToken, "/api/validation-requests/" + requestId);
        assertThat(detail.get("items").get(0).get("employeeComment").asText()).isEqualTo("c2");

        JsonNode listed = getJson(managerToken, "/api/validation-requests?employeeId=" + EMPLOYEE_ONE);
        assertThat(listed.get("content").get(0).get("items").get(0).get("employeeComment").asText()).isEqualTo("c2");

        authorized(get("/api/validation-requests/" + requestId), otherManagerToken).andExpect(status().isForbidden());
        authorized(get("/api/validation-requests/" + requestId), otherEmployeeToken)
                .andExpect(status().isForbidden());
        JsonNode others = getJson(otherEmployeeToken, "/api/me/validation-requests");
        assertThat(others.get("content")).isEmpty();

        // the note is a submission-time snapshot: later edits of the skill do not rewrite it
        decision(managerToken, requestId, firstItem(requestId), "approve", "{\"managerValidatedLevel\":3}")
                .andExpect(status().isOk());
        putOk(employeeToken, skill, skillBody(skillIds.get(0), 5));
        assertThat(getJson(managerToken, "/api/validation-requests/" + requestId).get("items").get(0)
                .get("employeeComment").asText()).isEqualTo("c2");
    }

    @Test
    void managerSeesDeletionReasonAndMissingNotesAreNull() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        UUID requestId = requestDeletion(skill);

        JsonNode detail = getJson(managerToken, "/api/validation-requests/" + requestId);
        assertThat(detail.get("reason").asText()).isEqualTo("No longer used");
        assertThat(detail.get("items").get(0).get("employeeComment").asText()).isEqualTo("c3");
        String listedReason = null;
        for (JsonNode r : getJson(managerToken, "/api/validation-requests?employeeId=" + EMPLOYEE_ONE)
                .get("content")) {
            if (requestId.toString().equals(r.get("id").asText())) {
                listedReason = r.get("reason").asText();
            }
        }
        assertThat(listedReason).isEqualTo("No longer used");
        authorized(get("/api/validation-requests/" + requestId), otherManagerToken).andExpect(status().isForbidden());

        // a legacy item without a stored note and a skill saved without a note: null, never an error
        jdbc.update("UPDATE validation_request_item SET employee_comment = NULL WHERE validation_request_id = ?",
                requestId);
        assertThat(getJson(managerToken, "/api/validation-requests/" + requestId).get("items").get(0)
                .get("employeeComment").isNull()).isTrue();

        UUID noNote = UUID.fromString(postOk(employeeToken, "/api/me/skills", """
                {"skillId":"%s","selfAssessedLevel":2}""".formatted(skillIds.get(1))).get("id").asText());
        UUID noNoteRequest = submit(noNote);
        JsonNode item = getJson(managerToken, "/api/validation-requests/" + noNoteRequest).get("items").get(0);
        assertThat(item.get("employeeComment") == null || item.get("employeeComment").isNull()).isTrue();
    }

    @Test
    void skillReviewListHasOneLatestRowPerSkillWithHistoryCountAndFilters() throws Exception {
        UUID validated = validatedSkill(skillIds.get(0), 3);
        putOk(employeeToken, validated, skillBody(skillIds.get(0), 5));
        UUID latestRequest = submit(validated);
        UUID rejected = rejectedSkill(skillIds.get(1));
        UUID certificate = jdbc.queryForObject("""
                INSERT INTO certificate (employee_id, name, completion_date, file_name, content_type, file_size)
                VALUES (?, 'Backing cert', DATE '2024-05-01', 'backing.pdf', 'application/pdf', 9) RETURNING id
                """, UUID.class, EMPLOYEE_ONE);
        jdbc.update("INSERT INTO certificate_skill (certificate_id, skill_id) VALUES (?, ?)",
                certificate, skillIds.get(0));

        String base = "/api/validation-requests/skills?size=100";
        JsonNode rows = getJson(managerToken, base).get("content");
        JsonNode validatedRow = null;
        int employeeRows = 0;
        for (JsonNode row : rows) {
            if (EMPLOYEE_ONE.toString().equals(row.get("employeeId").asText())) {
                employeeRows++;
                if (validated.toString().equals(row.get("employeeSkillId").asText())) {
                    validatedRow = row;
                }
            }
        }
        assertThat(employeeRows).isEqualTo(2);
        assertThat(validatedRow).isNotNull();
        assertThat(validatedRow.get("requestId").asText()).isEqualTo(latestRequest.toString());
        assertThat(validatedRow.get("status").asText()).isEqualTo("SUBMITTED");
        assertThat(validatedRow.get("selfAssessedLevel").asInt()).isEqualTo(5);
        assertThat(validatedRow.get("lastValidatedAt").isNull()).isFalse();
        assertThat(validatedRow.get("historyCount").asInt()).isEqualTo(versions(validated));
        assertThat(validatedRow.get("certificateCount").asInt()).isEqualTo(1);

        JsonNode onlyRejected = getJson(managerToken, base + "&status=REJECTED").get("content");
        assertThat(onlyRejected.toString()).contains(rejected.toString()).doesNotContain(validated.toString());

        String firstName = jdbc.queryForObject("SELECT first_name FROM employee WHERE id = ?", String.class,
                EMPLOYEE_ONE);
        String skillName = jdbc.queryForObject("SELECT name FROM skill WHERE id = ?", String.class, skillIds.get(1));
        assertThat(getJson(managerToken, base + "&search=" + firstName.toUpperCase()).toString())
                .contains(validated.toString()).contains(rejected.toString());
        JsonNode bySkill = getJson(managerToken, base + "&search=" + skillName.toLowerCase().replace(" ", "%20"))
                .get("content");
        assertThat(bySkill.toString()).contains(rejected.toString());

        String category = jdbc.queryForObject("""
                SELECT sc.name FROM skill s JOIN skill_category sc ON sc.id = s.category_id WHERE s.id = ?
                """, String.class, skillIds.get(0));
        assertThat(getJson(managerToken, base + "&category=" + category.toUpperCase().replace(" ", "%20"))
                .toString()).contains(validated.toString());
        assertThat(getJson(managerToken, base + "&category=No%20such%20category").get("content")).isEmpty();

        assertThat(getJson(otherManagerToken, base).toString()).doesNotContain(validated.toString());
        authorized(get(base), employeeToken).andExpect(status().isForbidden());
        authorized(get(base), otherEmployeeToken).andExpect(status().isForbidden());
    }

    // ── in-app notifications ───────────────────────────────────────────────

    @Test
    void submittingAValidationRequestNotifiesOnlyTheResponsibleManager() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);

        assertThat(notificationCount("manager", requestId, "REQUEST_SUBMITTED")).isEqualTo(1);
        assertThat(notificationCount(null, requestId, null)).isEqualTo(1);

        JsonNode mine = getJson(managerToken, "/api/notifications").get("content").get(0);
        assertThat(mine.get("event").asText()).isEqualTo("REQUEST_SUBMITTED");
        assertThat(mine.get("validationRequestId").asText()).isEqualTo(requestId.toString());
        assertThat(mine.get("title").asText()).startsWith("Validation request from ");
        assertThat(mine.get("unread").asBoolean()).isTrue();

        assertThat(getJson(otherManagerToken, "/api/notifications").get("content")).isEmpty();
        assertThat(getJson(employeeToken, "/api/notifications").get("content")).isEmpty();
    }

    @Test
    void revokedRequestDisappearsFromManagerNotificationsCountAndRequestList() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);
        assertThat(getJson(managerToken, "/api/notifications/unread-count").get("count").asLong()).isEqualTo(1);
        assertThat(getJson(managerToken, "/api/validation-requests").toString()).contains(requestId.toString());

        authorized(post("/api/validation-requests/" + requestId + "/revoke"), otherEmployeeToken)
                .andExpect(status().isForbidden());
        assertThat(notificationCount("manager", requestId, "REQUEST_SUBMITTED")).isEqualTo(1);

        postOk(employeeToken, "/api/validation-requests/" + requestId + "/revoke");

        assertThat(notificationCount(null, requestId, null)).isZero();
        assertThat(getJson(managerToken, "/api/notifications").get("content")).isEmpty();
        assertThat(getJson(managerToken, "/api/notifications/unread-count").get("count").asLong()).isZero();
        assertThat(getJson(managerToken, "/api/validation-requests").toString()).doesNotContain(requestId.toString());
        assertThat(getJson(managerToken, "/api/validation-requests?status=CANCELLED").get("content")).isEmpty();
        authorized(get("/api/validation-requests/" + requestId), managerToken).andExpect(status().isForbidden());
    }

    @Test
    void submittingADeletionRequestNotifiesTheManagerWithTheReason() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        UUID requestId = requestDeletion(skill);

        assertThat(notificationCount("manager", requestId, "REQUEST_SUBMITTED")).isEqualTo(1);
        JsonNode n = getJson(managerToken, "/api/notifications").get("content").get(0);
        assertThat(n.get("title").asText()).startsWith("Skill deletion request from ");
        assertThat(n.get("body").asText()).contains("No longer used");
    }

    @Test
    void rejectingAndApprovingNotifyTheEmployeeWithTheManagerNote() throws Exception {
        UUID rejectedSkill = addSkill(skillIds.get(0), 2);
        UUID rejectedRequest = submit(rejectedSkill);
        decision(managerToken, rejectedRequest, firstItem(rejectedRequest), "reject", "{\"managerComment\":\"Needs more evidence\"}")
                .andExpect(status().isOk());

        assertThat(notificationCount("employee", rejectedRequest, "ITEM_REJECTED")).isEqualTo(1);
        assertThat(notificationCount("manager", rejectedRequest, "ITEM_REJECTED")).isZero();
        String body = jdbc.queryForObject("SELECT body FROM notification WHERE validation_request_id = ? "
                + "AND event = 'ITEM_REJECTED'", String.class, rejectedRequest);
        assertThat(body).contains("rejected").contains("Needs more evidence");

        UUID approvedSkill = addSkill(skillIds.get(1), 2);
        UUID approvedRequest = submit(approvedSkill);
        decideAndDiscard(approvedRequest);
        assertThat(notificationCount("employee", approvedRequest, "ITEM_APPROVED")).isEqualTo(1);

        JsonNode mine = getJson(employeeToken, "/api/notifications").get("content");
        assertThat(mine).hasSize(2);
    }

    @Test
    void rejectedDeletionRequestNotifiesTheEmployee() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        UUID requestId = requestDeletion(skill);
        decision(managerToken, requestId, firstItem(requestId), "reject", "{\"managerComment\":\"Still needed\"}")
                .andExpect(status().isOk());
        assertThat(notificationCount("employee", requestId, "ITEM_REJECTED")).isEqualTo(1);
    }

    @Test
    void noNotificationWhenTheEmployeeHasNoResponsibleManager() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID manager = jdbc.queryForObject("SELECT manager_id FROM employee WHERE id = ?", UUID.class, EMPLOYEE_ONE);
        jdbc.update("UPDATE employee SET manager_id = NULL WHERE id = ?", EMPLOYEE_ONE);
        try {
            UUID requestId = submit(skill);
            assertThat(notificationCount(null, requestId, null)).isZero();
        } finally {
            jdbc.update("UPDATE employee SET manager_id = ? WHERE id = ?", manager, EMPLOYEE_ONE);
        }
    }

    @Test
    void usersCanOnlyReadAndMarkTheirOwnNotifications() throws Exception {
        UUID requestId = submit(addSkill(skillIds.get(0), 2));
        UUID notification = jdbc.queryForObject("SELECT id FROM notification WHERE validation_request_id = ?",
                UUID.class, requestId);

        authorized(put("/api/notifications/" + notification + "/read"), otherManagerToken)
                .andExpect(status().isBadRequest());
        authorized(put("/api/notifications/" + notification + "/read"), employeeToken)
                .andExpect(status().isBadRequest());
        authorized(put("/api/notifications/read-all"), otherManagerToken).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT read_at IS NULL FROM notification WHERE id = ?", Boolean.class,
                notification)).isTrue();
        assertThat(getJson(otherManagerToken, "/api/notifications/unread-count").get("count").asInt()).isZero();

        authorized(put("/api/notifications/" + notification + "/read"), managerToken).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT read_at IS NULL FROM notification WHERE id = ?", Boolean.class,
                notification)).isFalse();
        mockMvc.perform(get("/api/notifications")).andExpect(status().is4xxClientError());
    }

    @Test
    void failedWorkflowActionsLeaveNoNotificationAuditOrRevision() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);
        int notifications = notificationCount(null, requestId, null);
        int revisions = versions(skill);
        int audits = auditCount(skill, "REJECT");

        // another manager, the employee, and a missing comment are all refused
        decision(otherManagerToken, requestId, firstItem(requestId), "reject", "{\"managerComment\":\"no\"}")
                .andExpect(status().isForbidden());
        decision(employeeToken, requestId, firstItem(requestId), "reject", "{\"managerComment\":\"no\"}")
                .andExpect(status().isForbidden());
        decision(managerToken, requestId, firstItem(requestId), "reject", "{}").andExpect(status().is4xxClientError());
        assertThat(notificationCount("employee", requestId, null)).isZero();
        assertThat(versions(skill)).isEqualTo(revisions);
        assertThat(auditCount(skill, "REJECT")).isEqualTo(audits);

        // resubmitting a SUBMITTED skill, and a deletion request without a reason, fail without side effects
        authorized(post("/api/me/skills/submit-validation").contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeSkillIds\":[\"" + skill + "\"]}"), employeeToken)
                .andExpect(status().is4xxClientError());
        UUID validated = validatedSkill(skillIds.get(1), 3);
        int before = jdbc.queryForObject("SELECT COUNT(*) FROM notification", Integer.class);
        int validatedVersions = versions(validated);
        authorized(post("/api/me/skills/" + validated + "/request-deletion").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"  \"}"), employeeToken).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification", Integer.class)).isEqualTo(before);
        assertThat(versions(validated)).isEqualTo(validatedVersions);
        assertThat(notificationCount(null, requestId, null)).isEqualTo(notifications);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private UUID requestDeletion(UUID skill) throws Exception {
        return UUID.fromString(postOk(employeeToken, "/api/me/skills/" + skill + "/request-deletion", REASON)
                .get("id").asText());
    }

    private void decideAndDiscard(UUID requestId) throws Exception {
        decision(managerToken, requestId, firstItem(requestId), "approve", "{\"managerValidatedLevel\":3}")
                .andExpect(status().isOk());
    }

    private ResultActions decision(String token, UUID requestId, UUID itemId, String action, String body)
            throws Exception {
        MockHttpServletRequestBuilder request = post("/api/validation-requests/" + requestId + "/items/" + itemId
                + "/" + action);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return authorized(request, token);
    }

    private UUID rejectedSkill(UUID catalogSkill) throws Exception {
        UUID skill = addSkill(catalogSkill, 2);
        UUID requestId = submit(skill);
        decision(managerToken, requestId, firstItem(requestId), "reject", "{\"managerComment\":\"no\"}")
                .andExpect(status().isOk());
        return skill;
    }

    private UUID validatedSkill(UUID catalogSkill, int selfLevel) throws Exception {
        UUID skill = addSkill(catalogSkill, selfLevel);
        UUID requestId = submit(skill);
        decision(managerToken, requestId, firstItem(requestId), "approve",
                "{\"managerValidatedLevel\":4,\"managerComment\":\"ok\"}").andExpect(status().isOk());
        return skill;
    }

    private UUID addSkill(UUID skillId, int level) throws Exception {
        return UUID.fromString(postOk(employeeToken, "/api/me/skills", skillBody(skillId, level)).get("id").asText());
    }

    private UUID submit(UUID skill) throws Exception {
        return UUID.fromString(postOk(employeeToken, "/api/me/skills/submit-validation",
                "{\"employeeSkillIds\":[\"" + skill + "\"]}").get("id").asText());
    }

    private String skillBody(UUID skillId, int level) {
        return """
                {"skillId":"%s","selfAssessedLevel":%d,"yearsOfExperience":2.5,"lastUsedDate":"2024-01-15",
                "employeeComment":"c%d"}
                """.formatted(skillId, level, level);
    }

    private JsonNode getJson(String token, String path) throws Exception {
        return objectMapper.readTree(authorized(get(path), token).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString());
    }

    private JsonNode putOk(String token, UUID skill, String body) throws Exception {
        return objectMapper.readTree(authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON)
                .content(body), token).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postOk(String token, String path) throws Exception {
        return postOk(token, path, null);
    }

    private JsonNode postOk(String token, String path, String body) throws Exception {
        MockHttpServletRequestBuilder request = post(path);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return objectMapper.readTree(authorized(request, token).andExpect(status().is2xxSuccessful()).andReturn()
                .getResponse().getContentAsString());
    }

    private ResultActions authorized(MockHttpServletRequestBuilder builder, String token) throws Exception {
        return support.authorized(builder, token);
    }

    private UUID firstItem(UUID requestId) {
        return jdbc.queryForObject("SELECT id FROM validation_request_item WHERE validation_request_id = ? LIMIT 1",
                UUID.class, requestId);
    }

    private int notificationCount(String username, UUID requestId, String event) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM notification n JOIN "user" u ON u.id = n.user_id
                WHERE n.validation_request_id = ? AND (?::text IS NULL OR u.username = ?)
                  AND (?::text IS NULL OR n.event = ?)
                """, Integer.class, requestId, username, username, event, event);
    }

    private int versions(UUID skill) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM employee_skill_history WHERE employee_skill_id = ?",
                Integer.class, skill);
    }

    private int liveCount(UUID skill) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM employee_skill WHERE id = ?", Integer.class, skill);
    }

    private int auditCount(UUID skill, String action) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE entity_name = 'EmployeeSkill' "
                + "AND entity_id = ? AND action = ?", Integer.class, skill.toString(), action);
    }

    private String requestStatus(UUID requestId) {
        return jdbc.queryForObject("SELECT status FROM validation_request WHERE id = ?", String.class, requestId);
    }

    private String historyJson(UUID skill) {
        return jdbc.queryForObject("SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY version), '[]'::jsonb)::text "
                + "FROM employee_skill_history h WHERE employee_skill_id = ?", String.class, skill);
    }

    private String liveJson(UUID skill) {
        return jdbc.queryForObject("SELECT to_jsonb(e)::text FROM employee_skill e WHERE id = ?", String.class, skill);
    }
}

package it.eng.wsm.skillmatrix.employeeskill;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static it.eng.wsm.skillmatrix.support.TestSeedData.USER_EMPLOYEE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillHistoryRepository;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
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

/** Versioned employee-skill revisions, latest-validated lookup, restore and revoke. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeSkillRevisionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    private IntegrationTestSupport support;
    private String adminToken;
    private String hrToken;
    private String managerToken;
    private String otherManagerToken;
    private String employeeToken;
    private String otherEmployeeToken;
    private List<UUID> skillIds;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        hrToken = support.loginAndGetToken("hr", PASSWORD);
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
        jdbc.update("DELETE FROM employee_skill WHERE employee_id = ?", EMPLOYEE_ONE);
        skillIds = jdbc.queryForList("SELECT id FROM skill ORDER BY name LIMIT 4", UUID.class);
    }

    // ── sequential revisions, audit coverage, immutability ─────────────────

    @Test
    void everyMutationAppendsOneSequentialRevisionWithAudit() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        assertThat(versions(skill)).containsExactly(1);

        authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON)
                .content(skillBody(skillIds.get(0), 3)), employeeToken).andExpect(status().isOk());
        UUID requestId = submit(skill);
        approve(managerToken, requestId, firstItem(requestId), 4).andExpect(status().isOk());

        assertThat(versions(skill)).containsExactly(1, 2, 3, 4);
        assertThat(statuses(skill)).containsExactly("DRAFT", "DRAFT", "SUBMITTED", "VALIDATED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM employee_skill_history WHERE employee_skill_id = ? "
                + "AND employee_id = ?", Integer.class, skill, EMPLOYEE_ONE)).isEqualTo(4);
        assertThat(auditCount(skill, "CREATE")).isEqualTo(1);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(1);
        assertThat(auditCount(skill, "SUBMIT")).isEqualTo(1);
        assertThat(auditCount(skill, "APPROVE")).isEqualTo(1);

        Map<String, Object> last = jdbc.queryForMap(
                "SELECT * FROM employee_skill_history WHERE employee_skill_id = ? AND version = 4", skill);
        assertThat(last.get("manager_validated_level")).isEqualTo(4);
        assertThat(last.get("last_validated_date")).isNotNull();
        assertThat(last.get("years_of_experience")).isNotNull();
        assertThat(last.get("last_used_date")).isNotNull();
    }

    @Test
    void deleteKeepsFinalRevisionAndAuditAfterLiveRowIsGone() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);

        authorized(delete("/api/employee-skills/" + skill), adminToken).andExpect(status().isNoContent());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM employee_skill WHERE id = ?", Integer.class, skill))
                .isZero();
        assertThat(versions(skill)).containsExactly(1, 2);
        assertThat(auditCount(skill, "DELETE")).isEqualTo(1);
    }

    @Test
    void deleteOfSkillReferencedByRequestIsRejectedWithoutSideEffects() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);
        approve(managerToken, requestId, firstItem(requestId), 3).andExpect(status().isOk());
        int revisions = versions(skill).size();

        authorized(delete("/api/employee-skills/" + skill), adminToken).andExpect(status().isConflict());

        assertThat(versions(skill)).hasSize(revisions);
        assertThat(auditCount(skill, "DELETE")).isZero();
    }

    @Test
    void historyAndAuditRowsAreNeverModifiedByLaterWrites() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        String historyBefore = historyJson(skill);
        String auditBefore = auditJson(skill);

        forceDraft(skill, 1);
        postOk(employeeToken, "/api/me/skills/" + skill + "/restore-latest-validated");

        assertThat(historyJson(skill)).startsWith(historyBefore.substring(0, historyBefore.length() - 1));
        assertThat(auditJson(skill)).startsWith(auditBefore.substring(0, auditBefore.length() - 1));
        List<String> mutators = Arrays.stream(EmployeeSkillHistoryRepository.class.getMethods())
                .map(Method::getName).filter(n -> n.startsWith("delete") || n.startsWith("update")).toList();
        assertThat(mutators).isEmpty();
    }

    @Test
    void versionIsUniquePerSkill() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO employee_skill_history (employee_skill_id, employee_id, version, self_assessed_level,
                    validation_status, last_updated_date, changed_by_user_id)
                VALUES (?, ?, 1, 1, 'DRAFT', now(), ?)
                """, skill, EMPLOYEE_ONE, USER_EMPLOYEE)).isInstanceOf(Exception.class);
    }

    // ── latest validated lookup ────────────────────────────────────────────

    @Test
    void lookupReturnsHighestValidatedRevisionNotCurrentState() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        authorized(put("/api/employee-skills/" + skill).contentType(MediaType.APPLICATION_JSON)
                .content(skillBody(skillIds.get(0), 5)), adminToken).andExpect(status().isOk());
        forceDraft(skill, 1);

        JsonNode revision = getOk(employeeToken, "/api/me/skills/" + skill + "/latest-validated-revision");
        assertThat(revision.get("validationStatus").asText()).isEqualTo("VALIDATED");
        assertThat(revision.get("selfAssessedLevel").asInt()).isEqualTo(5);
        assertThat(revision.get("version").asInt()).isEqualTo(4);
        assertThat(revision.get("employeeId").asText()).isEqualTo(EMPLOYEE_ONE.toString());
    }

    @Test
    void lookupHasNoFallbackWhenNothingWasValidated() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);

        authorized(get("/api/me/skills/" + skill + "/latest-validated-revision"), employeeToken)
                .andExpect(status().isNotFound());
        authorized(get("/api/employee-skills/" + skill + "/latest-validated-revision"), adminToken)
                .andExpect(status().isNotFound());
    }

    @Test
    void lookupAccessFollowsRowLevelRules() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        String own = "/api/me/skills/" + skill + "/latest-validated-revision";
        String scoped = "/api/employee-skills/" + skill + "/latest-validated-revision";

        authorized(get(own), employeeToken).andExpect(status().isOk());
        authorized(get(own), otherEmployeeToken).andExpect(status().isForbidden());
        authorized(get(scoped), employeeToken).andExpect(status().isForbidden());
        authorized(get(scoped), adminToken).andExpect(status().isOk());
        authorized(get(scoped), hrToken).andExpect(status().isOk());
        authorized(get(scoped), managerToken).andExpect(status().isOk());
        authorized(get(scoped), otherManagerToken).andExpect(status().isForbidden());
    }

    @Test
    void historyListsOwnRevisionsOldestFirstAndIsOwnerOnly() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        String path = "/api/me/skills/" + skill + "/history";

        JsonNode history = getOk(employeeToken, path);
        assertThat(history).hasSize(versions(skill).size());
        assertThat(history.get(0).get("version").asInt()).isEqualTo(1);
        assertThat(history.get(history.size() - 1).get("validationStatus").asText()).isEqualTo("VALIDATED");
        authorized(get(path), otherEmployeeToken).andExpect(status().isForbidden());

        String scoped = "/api/employee-skills/" + skill + "/history";
        assertThat(getOk(managerToken, scoped)).hasSize(history.size());
        assertThat(getOk(adminToken, scoped)).hasSize(history.size());
        authorized(get(scoped), otherManagerToken).andExpect(status().isForbidden());
        authorized(get(scoped), employeeToken).andExpect(status().isForbidden());
    }

    // ── edit-reopen ────────────────────────────────────────────────────────

    @Test
    void realEditOfValidatedSkillReopensItKeepingValidatedRevisionRestorable() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill).size();
        int audits = auditCount(skill, "UPDATE");

        JsonNode edited = putOk(employeeToken, "/api/me/skills/" + skill, skillBody(skillIds.get(0), 5));

        assertThat(edited.get("validationStatus").asText()).isEqualTo("REOPENED_FOR_EDIT");
        assertThat(edited.get("selfAssessedLevel").asInt()).isEqualTo(5);
        assertThat(versions(skill)).hasSize(revisions + 1);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits + 1);
        JsonNode validated = getOk(employeeToken, "/api/me/skills/" + skill + "/latest-validated-revision");
        assertThat(validated.get("selfAssessedLevel").asInt()).isEqualTo(3);
        assertThat(validated.get("version").asInt()).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM validation_request WHERE employee_id = ?",
                Integer.class, EMPLOYEE_ONE)).isEqualTo(1);

        JsonNode restored = postOk(employeeToken, "/api/me/skills/" + skill + "/restore-latest-validated");
        assertThat(restored.get("validationStatus").asText()).isEqualTo("VALIDATED");
        assertThat(restored.get("selfAssessedLevel").asInt()).isEqualTo(3);
        assertThat(restored.get("managerValidatedLevel").asInt()).isEqualTo(4);
        assertThat(statuses(skill)).containsExactly("DRAFT", "SUBMITTED", "VALIDATED", "REOPENED_FOR_EDIT",
                "VALIDATED");
    }

    @Test
    void savingUnchangedValuesKeepsValidatedWithoutRevisionOrAudit() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill).size();
        int audits = auditCount(skill, "UPDATE");

        JsonNode same = putOk(employeeToken, "/api/me/skills/" + skill, skillBody(skillIds.get(0), 3));

        assertThat(same.get("validationStatus").asText()).isEqualTo("VALIDATED");
        assertThat(versions(skill)).hasSize(revisions);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits);
    }

    @Test
    void otherEmployeeCannotEditSkillAndDraftEditStaysDraft() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        authorized(put("/api/me/skills/" + skill).contentType(MediaType.APPLICATION_JSON)
                .content(skillBody(skillIds.get(0), 5)), otherEmployeeToken).andExpect(status().isForbidden());
        assertThat(statuses(skill)).last().isEqualTo("VALIDATED");

        UUID draft = addSkill(skillIds.get(1), 2);
        JsonNode edited = putOk(employeeToken, "/api/me/skills/" + draft, skillBody(skillIds.get(1), 4));
        assertThat(edited.get("validationStatus").asText()).isEqualTo("DRAFT");
    }

    // ── restore ────────────────────────────────────────────────────────────

    @Test
    void ownerRestoresEditedSkillKeepingIdentityAndAppendingOneRevision() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        forceDraft(skill, 1);
        int revisions = versions(skill).size();
        int audits = auditCount(skill, "UPDATE");
        String historyBefore = historyJson(skill);

        JsonNode restored = postOk(employeeToken, "/api/me/skills/" + skill + "/restore-latest-validated");

        assertThat(restored.get("id").asText()).isEqualTo(skill.toString());
        assertThat(restored.get("validationStatus").asText()).isEqualTo("VALIDATED");
        assertThat(restored.get("selfAssessedLevel").asInt()).isEqualTo(3);
        assertThat(restored.get("managerValidatedLevel").asInt()).isEqualTo(4);
        assertThat(versions(skill)).hasSize(revisions + 1).last().isEqualTo(revisions + 1);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits + 1);
        assertThat(jdbc.queryForObject("SELECT comment FROM audit_log WHERE entity_id = ? AND action = 'UPDATE' "
                + "ORDER BY created_at DESC LIMIT 1", String.class, skill.toString()))
                .contains("Restored latest validated revision");
        assertThat(historyJson(skill)).startsWith(historyBefore.substring(0, historyBefore.length() - 1));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM validation_request WHERE employee_id = ?",
                Integer.class, EMPLOYEE_ONE)).isEqualTo(1);
    }

    @Test
    void noOpRestoreCreatesNoRevisionOrAudit() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        int revisions = versions(skill).size();
        int audits = auditCount(skill, "UPDATE");

        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), adminToken)
                .andExpect(status().isOk());

        assertThat(versions(skill)).hasSize(revisions);
        assertThat(auditCount(skill, "UPDATE")).isEqualTo(audits);
    }

    @Test
    void restoreIsRejectedForLockedSkillsMissingRevisionsAndUnauthorizedActors() throws Exception {
        UUID noValidated = addSkill(skillIds.get(1), 2);
        authorized(post("/api/me/skills/" + noValidated + "/restore-latest-validated"), employeeToken)
                .andExpect(status().isNotFound());
        authorized(post("/api/employee-skills/" + UUID.randomUUID() + "/restore-latest-validated"), adminToken)
                .andExpect(status().isNotFound());

        UUID skill = validatedSkill(skillIds.get(0), 3);
        forceDraft(skill, 1);
        int revisions = versions(skill).size();
        authorized(post("/api/me/skills/" + skill + "/restore-latest-validated"), otherEmployeeToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), employeeToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), hrToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), otherManagerToken)
                .andExpect(status().isForbidden());

        jdbc.update("UPDATE employee_skill SET validation_status = 'SUBMITTED' WHERE id = ?", skill);
        authorized(post("/api/me/skills/" + skill + "/restore-latest-validated"), employeeToken)
                .andExpect(status().isConflict());
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), adminToken)
                .andExpect(status().isConflict());

        assertThat(versions(skill)).hasSize(revisions);
    }

    @Test
    void directReportManagerAndAdminCanRestore() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        forceDraft(skill, 1);
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), managerToken)
                .andExpect(status().isOk());

        forceDraft(skill, 2);
        authorized(post("/api/employee-skills/" + skill + "/restore-latest-validated"), adminToken)
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT validation_status FROM employee_skill WHERE id = ?",
                String.class, skill)).isEqualTo("VALIDATED");
    }

    // ── revoke ─────────────────────────────────────────────────────────────

    @Test
    void requesterRevokesSubmittedRequestAndDraftSkillsAreRestoredExactly() throws Exception {
        UUID first = addSkill(skillIds.get(0), 2);
        UUID second = addSkill(skillIds.get(1), 3);
        List<Map<String, Object>> before = liveRows(first, second);
        UUID requestId = submit(first, second);
        String historyBefore = historyJson(first);

        authorized(post("/api/validation-requests/" + requestId + "/revoke"), managerToken)
                .andExpect(status().isForbidden());
        authorized(post("/api/validation-requests/" + requestId + "/revoke"), otherEmployeeToken)
                .andExpect(status().isForbidden());
        assertThat(requestStatus(requestId)).isEqualTo("SUBMITTED");

        JsonNode revoked = postOk(employeeToken, "/api/validation-requests/" + requestId + "/revoke");

        assertThat(revoked.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(revoked.get("items")).allSatisfy(i -> assertThat(i.get("status").asText()).isEqualTo("CANCELLED"));
        assertThat(liveRows(first, second)).isEqualTo(before);
        assertThat(statuses(first)).containsExactly("DRAFT", "SUBMITTED", "DRAFT");
        assertThat(versions(second)).containsExactly(1, 2, 3);
        assertThat(historyJson(first)).startsWith(historyBefore.substring(0, historyBefore.length() - 1));
        assertThat(auditCount(first, "UPDATE")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE entity_name = 'ValidationRequest' "
                + "AND entity_id = ? AND comment = 'Revoked by requester'", Integer.class, requestId.toString()))
                .isEqualTo(1);

        authorized(post("/api/validation-requests/" + requestId + "/revoke"), employeeToken)
                .andExpect(status().isConflict());
        submit(first);
        assertThat(jdbc.queryForObject("SELECT validation_status FROM employee_skill WHERE id = ?",
                String.class, first)).isEqualTo("SUBMITTED");
    }

    @Test
    void revokeRestoresPriorValidatedStateAndValues() throws Exception {
        UUID skill = validatedSkill(skillIds.get(0), 3);
        List<Map<String, Object>> before = liveRows(skill);
        UUID preSubmission = jdbc.queryForObject(
                "SELECT id FROM employee_skill_history WHERE employee_skill_id = ? AND version = 3", UUID.class, skill);
        UUID requestId = openRequestFor(skill, preSubmission);
        jdbc.update("UPDATE employee_skill SET validation_status = 'SUBMITTED', self_assessed_level = 5, "
                + "manager_validated_level = NULL, manager_comment = NULL, last_validated_date = NULL WHERE id = ?",
                skill);

        postOk(employeeToken, "/api/validation-requests/" + requestId + "/revoke");

        assertThat(liveRows(skill)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT validation_status FROM employee_skill WHERE id = ?",
                String.class, skill)).isEqualTo("VALIDATED");
    }

    @Test
    void revokeIsRejectedAfterAnyItemDecisionOrFinalOutcome() throws Exception {
        UUID first = addSkill(skillIds.get(0), 2);
        UUID second = addSkill(skillIds.get(1), 3);
        UUID request = submit(first, second);
        approve(managerToken, request, itemFor(request, first), 3).andExpect(status().isOk());

        authorized(post("/api/validation-requests/" + request + "/revoke"), employeeToken)
                .andExpect(status().isConflict());
        assertThat(requestStatus(request)).isEqualTo("SUBMITTED");

        approve(managerToken, request, itemFor(request, second), 3).andExpect(status().isOk());
        int revisions = versions(first).size();
        authorized(post("/api/validation-requests/" + request + "/revoke"), employeeToken)
                .andExpect(status().isConflict());
        assertThat(requestStatus(request)).isEqualTo("APPROVED");
        assertThat(versions(first)).hasSize(revisions);
    }

    @Test
    void partiallyRestorableRevokeRollsBackCompletely() throws Exception {
        UUID first = addSkill(skillIds.get(0), 2);
        UUID second = addSkill(skillIds.get(1), 3);
        UUID requestId = submit(first, second);
        jdbc.update("UPDATE validation_request_item SET pre_submission_history_id = NULL WHERE id = ?",
                itemFor(requestId, second));
        int firstRevisions = versions(first).size();
        int audits = jdbc.queryForObject("SELECT COUNT(*) FROM audit_log", Integer.class);

        authorized(post("/api/validation-requests/" + requestId + "/revoke"), employeeToken)
                .andExpect(status().isConflict());

        assertThat(requestStatus(requestId)).isEqualTo("SUBMITTED");
        assertThat(versions(first)).hasSize(firstRevisions);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log", Integer.class)).isEqualTo(audits);
        assertThat(jdbc.queryForObject("SELECT validation_status FROM employee_skill WHERE id = ?",
                String.class, first)).isEqualTo("SUBMITTED");
    }

    @Test
    void validationDecisionsKeepWorkingAndRevokedRequestsCannotBeDecided() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);
        UUID itemId = firstItem(requestId);
        authorized(post("/api/validation-requests/" + requestId + "/revoke"), employeeToken).andExpect(status().isOk());

        approve(managerToken, requestId, itemId, 3).andExpect(status().isConflict());

        UUID again = submit(skill);
        authorized(post("/api/validation-requests/" + again + "/items/" + firstItem(again) + "/reject")
                .contentType(MediaType.APPLICATION_JSON).content("{\"managerComment\":\"no\"}"), managerToken)
                .andExpect(status().isOk());
        assertThat(requestStatus(again)).isEqualTo("REJECTED");
        List<String> statuses = statuses(skill);
        assertThat(statuses.get(statuses.size() - 1)).isEqualTo("REJECTED");
    }

    @Test
    void ownRequestListIsScopedToRequester() throws Exception {
        UUID skill = addSkill(skillIds.get(0), 2);
        UUID requestId = submit(skill);

        JsonNode mine = getOk(employeeToken, "/api/me/validation-requests?status=SUBMITTED");
        assertThat(mine.get("content")).anySatisfy(r -> assertThat(r.get("id").asText()).isEqualTo(requestId.toString()));
        assertThat(mine.get("content")).allSatisfy(
                r -> assertThat(r.get("submittedById").asText()).isEqualTo(USER_EMPLOYEE.toString()));
        assertThat(getOk(otherEmployeeToken, "/api/me/validation-requests").get("content")).noneSatisfy(
                r -> assertThat(r.get("id").asText()).isEqualTo(requestId.toString()));
    }

    // ── import ─────────────────────────────────────────────────────────────

    @Test
    void importWritesRevisionAndAuditOnlyForCreatedOrChangedSkills() throws Exception {
        Map<String, Object> skill = jdbc.queryForMap("""
                SELECT s.name AS skill_name, c.name AS category_name, s.id AS skill_id
                FROM skill s JOIN skill_category c ON c.id = s.category_id ORDER BY s.name LIMIT 1
                """);
        UUID skillId = (UUID) skill.get("skill_id");

        confirmImport(skill, 3);
        UUID es = jdbc.queryForObject("SELECT id FROM employee_skill WHERE employee_id = ? AND skill_id = ?",
                UUID.class, EMPLOYEE_ONE, skillId);
        assertThat(versions(es)).containsExactly(1);
        assertThat(auditCount(es, "IMPORT")).isEqualTo(1);

        confirmImport(skill, 3);
        assertThat(versions(es)).containsExactly(1);
        assertThat(auditCount(es, "IMPORT")).isEqualTo(1);

        confirmImport(skill, 4);
        assertThat(versions(es)).containsExactly(1, 2);
        assertThat(auditCount(es, "IMPORT")).isEqualTo(2);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private void confirmImport(Map<String, Object> skill, int level) throws Exception {
        String rows = """
                {"errors":[],"rows":[{"rowIndex":1,"employeeId":"EMP003","firstName":"Employee","lastName":"One",
                "email":"employee@eng.it","managerEmail":null,"orgUnit":null,"jobTitle":null,"jobProfile":null,
                "location":null,"skillCategory":"%s","skillName":"%s","selfLevel":%d,"yearsExp":2.0,
                "lastUsedDate":null,"employeeComment":"imp","mgrLevel":null,"mgrComment":null,
                "validationStatus":null}]}
                """.formatted(skill.get("category_name"), skill.get("skill_name"), level);
        UUID jobId = UUID.randomUUID();
        jdbc.update("INSERT INTO import_job (id, status, file_name, imported_by, validation_result) "
                + "VALUES (?, 'VALIDATED', 'x.xlsx', ?, ?::jsonb)", jobId,
                jdbc.queryForObject("SELECT id FROM \"user\" WHERE username = 'admin'", UUID.class), rows);
        authorized(post("/api/import/skill-matrix/confirm/" + jobId), adminToken).andExpect(status().isOk());
    }

    private UUID addSkill(UUID skillId, int level) throws Exception {
        JsonNode body = postOk(employeeToken, "/api/me/skills", skillBody(skillId, level));
        return UUID.fromString(body.get("id").asText());
    }

    private String skillBody(UUID skillId, int level) {
        return """
                {"skillId":"%s","selfAssessedLevel":%d,"yearsOfExperience":2.5,"lastUsedDate":"2024-01-15",
                "employeeComment":"c%d"}
                """.formatted(skillId, level, level);
    }

    private UUID submit(UUID... skills) throws Exception {
        String ids = String.join(",", Arrays.stream(skills).map(s -> "\"" + s + "\"").toList());
        JsonNode body = postOk(employeeToken, "/api/me/skills/submit-validation",
                "{\"employeeSkillIds\":[" + ids + "]}");
        return UUID.fromString(body.get("id").asText());
    }

    /** Creates a skill and takes it DRAFT (v1) -> SUBMITTED (v2) -> VALIDATED with manager level 4 (v3). */
    private UUID validatedSkill(UUID catalogSkill, int selfLevel) throws Exception {
        UUID skill = addSkill(catalogSkill, selfLevel);
        UUID requestId = submit(skill);
        approve(managerToken, requestId, firstItem(requestId), 4).andExpect(status().isOk());
        assertThat(statuses(skill)).containsExactly("DRAFT", "SUBMITTED", "VALIDATED");
        return skill;
    }

    private ResultActions approve(String token, UUID requestId, UUID itemId, int level) throws Exception {
        return authorized(post("/api/validation-requests/" + requestId + "/items/" + itemId + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"managerValidatedLevel\":" + level + ",\"managerComment\":\"ok\"}"), token);
    }

    private UUID firstItem(UUID requestId) {
        return jdbc.queryForObject("SELECT id FROM validation_request_item WHERE validation_request_id = ? LIMIT 1",
                UUID.class, requestId);
    }

    private UUID itemFor(UUID requestId, UUID skill) {
        return jdbc.queryForObject("SELECT id FROM validation_request_item WHERE validation_request_id = ? "
                + "AND employee_skill_id = ?", UUID.class, requestId, skill);
    }

    /** Simulates a skill that was validated, then reopened and edited: live state diverges from its revisions. */
    private void forceDraft(UUID skill, int level) {
        jdbc.update("UPDATE employee_skill SET validation_status = 'DRAFT', self_assessed_level = ?, "
                + "manager_validated_level = NULL, manager_comment = NULL, last_validated_date = NULL WHERE id = ?",
                level, skill);
    }

    /** Simulates a request submitted from an already validated skill (not reachable through the UI today). */
    private UUID openRequestFor(UUID skill, UUID preSubmissionRevision) {
        UUID requestId = UUID.randomUUID();
        jdbc.update("INSERT INTO validation_request (id, employee_id, submitted_by, status) "
                + "VALUES (?, ?, ?, 'SUBMITTED')", requestId, EMPLOYEE_ONE, USER_EMPLOYEE);
        jdbc.update("INSERT INTO validation_request_item (validation_request_id, employee_skill_id, "
                + "self_assessed_level, status, pre_submission_history_id, skill_name, category_name) "
                + "VALUES (?, ?, 5, 'SUBMITTED', ?, 'n', 'c')",
                requestId, skill, preSubmissionRevision);
        return requestId;
    }

    private JsonNode getOk(String token, String path) throws Exception {
        return objectMapper.readTree(authorized(get(path), token).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString());
    }

    private JsonNode putOk(String token, String path, String body) throws Exception {
        return objectMapper.readTree(authorized(put(path).contentType(MediaType.APPLICATION_JSON).content(body),
                token).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
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

    private List<Integer> versions(UUID skill) {
        return jdbc.queryForList("SELECT version FROM employee_skill_history WHERE employee_skill_id = ? "
                + "ORDER BY version", Integer.class, skill);
    }

    private List<String> statuses(UUID skill) {
        return jdbc.queryForList("SELECT validation_status FROM employee_skill_history WHERE employee_skill_id = ? "
                + "ORDER BY version", String.class, skill);
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

    private String auditJson(UUID skill) {
        return jdbc.queryForObject("SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY created_at, id), '[]'::jsonb)::text "
                + "FROM audit_log a WHERE entity_id = ?", String.class, skill.toString());
    }

    private List<Map<String, Object>> liveRows(UUID... skills) {
        return Arrays.stream(skills).map(s -> jdbc.queryForMap("""
                SELECT id, employee_id, skill_id, self_assessed_level, manager_validated_level, years_of_experience,
                       last_used_date, employee_comment, manager_comment, validation_status, last_updated_date,
                       last_validated_date FROM employee_skill WHERE id = ?
                """, s)).toList();
    }
}

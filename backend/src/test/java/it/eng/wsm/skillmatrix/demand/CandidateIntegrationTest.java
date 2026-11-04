package it.eng.wsm.skillmatrix.demand;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_TWO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static it.eng.wsm.skillmatrix.support.TestSeedData.USER_MANAGER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/** Module 3 candidates: adding people, the step flow, placement, meetings, notes and role checks. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class CandidateIntegrationTest {

    private static final String BASE = "/api/demands";
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport support;
    private String pmoToken;
    private String hrbpToken;
    private String employeeToken;
    private String managerToken;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        pmoToken = support.loginAndGetToken("pmo.user", PASSWORD);
        hrbpToken = support.loginAndGetToken("hrbp.user", PASSWORD);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    // ------------------------------------------------------------ internal flow and placement

    @Test
    void internalCandidate_flowFromCvToPlacement_fillsThePositionAndCompletesTheDemand() throws Exception {
        UUID demandId = createDemand(1, null);
        JsonNode added = addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson();
        assertThat(added).hasSize(1);
        JsonNode candidate = added.get(0);
        UUID candidateId = id(candidate);
        assertThat(candidate.get("type").asText()).isEqualTo("INTERNAL");
        assertThat(candidate.get("status").asText()).isEqualTo("IN_PROCESS");
        assertThat(candidate.get("currentStep").asText()).isEqualTo("No steps yet");
        assertThat(candidate.get("source").asText()).isEqualTo("Bench search (Module 4)");
        assertThat(candidate.get("employeeId").asText()).isEqualTo(EMPLOYEE_ONE.toString());

        // The same person cannot be added twice to one demand.
        addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.endsWith("is already a candidate on this demand.")));

        // Placement needs a positive meeting first.
        step(pmoToken, demandId, candidateId, startJson()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Needs a meeting with the status \"Done: positive\"."));

        JsonNode afterCv = step(pmoToken, demandId, candidateId,
                "{\"type\":\"CV\",\"date\":\"%s\",\"sentTo\":\"Client HR\"}".formatted(LocalDate.now()))
                .andExpect(status().isCreated()).andReturnJson();
        assertThat(afterCv.get("currentStep").asText()).isEqualTo("CV sent: Waiting for feedback");
        step(pmoToken, demandId, candidateId, "{\"type\":\"CV\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("CV sent is already recorded for this candidate."));

        // An offer is only for external candidates.
        step(pmoToken, demandId, candidateId, "{\"type\":\"OFFER\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isConflict());

        JsonNode afterMeeting = step(pmoToken, demandId, candidateId, meetingJson(LocalDateTime.now().minusHours(2)))
                .andExpect(status().isCreated()).andReturnJson();
        JsonNode meeting = lastStep(afterMeeting);
        assertThat(meeting.get("status").asText()).isEqualTo("Scheduled");
        assertThat(meeting.get("participants")).hasSize(2);
        assertThat(meeting.get("participants").get(0).get("userId").asText()).isEqualTo(USER_MANAGER.toString());
        assertThat(meeting.get("participants").get(1).get("external").asBoolean()).isTrue();
        assertThat(meeting.get("notes").get(0).get("text").asText()).isEqualTo("Bring the architecture questions.");

        JsonNode afterOutcome = outcome(pmoToken, demandId, candidateId, id(meeting), "{\"outcome\":\"Done: positive\"}")
                .andExpect(status().isOk()).andReturnJson();
        assertThat(lastStep(afterOutcome).get("status").asText()).isEqualTo("Done: positive");
        assertThat(lastStep(afterOutcome).get("changes")).hasSize(2);
        // The outcome is recorded once.
        outcome(pmoToken, demandId, candidateId, id(meeting), "{\"outcome\":\"Done: negative\",\"reason\":\"x\",\"decision\":\"CLOSE\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("The outcome of this step is already recorded."));

        JsonNode placed = step(pmoToken, demandId, candidateId, startJson()).andExpect(status().isCreated()).andReturnJson();
        assertThat(placed.get("status").asText()).isEqualTo("PLACED");
        assertThat(placed.get("currentStep").asText()).startsWith("Starts ");
        step(pmoToken, demandId, candidateId, startJson()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This candidate is already placed."));

        JsonNode demand = support.getJson(pmoToken, BASE + "/" + demandId);
        assertThat(demand.get("filledPositions").asInt()).isEqualTo(1);
        assertThat(demand.get("openPositions").asInt()).isZero();
        assertThat(demand.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(demand.get("activeCandidates").asInt()).isZero();
        assertThat(actions(demand)).contains("CANDIDATE_ADDED", "CANDIDATE_STEP_ADDED", "CANDIDATE_STEP_STATUS_CHANGED",
                "CANDIDATE_PLACED", "STATUS_CHANGED");

        // The audit log gets ids and codes only.
        Integer audits = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_name = 'Candidate' AND entity_id = ?", Integer.class,
                candidateId.toString());
        assertThat(audits).isGreaterThanOrEqualTo(5);
    }

    @Test
    void placement_needsAnOpenPosition_andTheMeetingCannotBeCompletedBeforeItTakesPlace() throws Exception {
        UUID demandId = createDemand(1, null);
        JsonNode added = addInternal(pmoToken, demandId, EMPLOYEE_ONE, EMPLOYEE_TWO).andExpect(status().isCreated()).andReturnJson();
        assertThat(added).hasSize(2);
        UUID first = id(added.get(0));
        UUID second = id(added.get(1));

        JsonNode future = step(pmoToken, demandId, first, meetingJson(LocalDateTime.now().plusDays(2)))
                .andExpect(status().isCreated()).andReturnJson();
        outcome(pmoToken, demandId, first, id(lastStep(future)), "{\"outcome\":\"Done: positive\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("This meeting is scheduled for")));

        for (UUID candidateId : List.of(first, second)) {
            JsonNode withMeeting = step(pmoToken, demandId, candidateId, meetingJson(LocalDateTime.now().minusHours(1)))
                    .andExpect(status().isCreated()).andReturnJson();
            outcome(pmoToken, demandId, candidateId, id(lastStep(withMeeting)), "{\"outcome\":\"Done: positive\"}")
                    .andExpect(status().isOk());
        }
        step(pmoToken, demandId, first, startJson()).andExpect(status().isCreated());
        step(pmoToken, demandId, second, startJson()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        "No open position on this demand. A placement must fill an open position. Add a position first."));

        // The other candidate stays in process; nothing closes automatically.
        JsonNode list = support.getJson(pmoToken, BASE + "/" + demandId + "/candidates");
        assertThat(list.get(1).get("status").asText()).isEqualTo("IN_PROCESS");
    }

    // ------------------------------------------------------------ negative outcome, withdraw

    @Test
    void negativeOutcome_needsReasonAndDecision_andCloseRejectsTheCandidate() throws Exception {
        UUID demandId = createDemand(2, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_TWO).andExpect(status().isCreated()).andReturnJson().get(0));
        JsonNode withCv = step(pmoToken, demandId, candidateId, "{\"type\":\"CV\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isCreated()).andReturnJson();
        UUID cvId = id(lastStep(withCv));

        outcome(pmoToken, demandId, candidateId, cvId, "{\"outcome\":\"Maybe\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose a valid outcome for this step."));
        outcome(pmoToken, demandId, candidateId, cvId, "{\"outcome\":\"Rejected\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Write the reason."));
        outcome(pmoToken, demandId, candidateId, cvId, "{\"outcome\":\"Rejected\",\"reason\":\"Too junior\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose to continue the process or close the candidate."));

        JsonNode rejected = outcome(pmoToken, demandId, candidateId, cvId,
                "{\"outcome\":\"Rejected\",\"reason\":\"Too junior\",\"decision\":\"CLOSE\"}")
                .andExpect(status().isOk()).andReturnJson();
        assertThat(rejected.get("status").asText()).isEqualTo("REJECTED");
        assertThat(rejected.get("closeReason").asText()).isEqualTo("Too junior");
        assertThat(rejected.get("closedBy").asText()).isEqualTo("Paolo Moretti");
        assertThat(lastStep(rejected).get("notes").get(0).get("text").asText()).isEqualTo("Reason: Too junior");

        // A closed candidate gets no new steps and cannot be withdrawn.
        step(pmoToken, demandId, candidateId, "{\"type\":\"CUSTOM\",\"title\":\"Test task\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isConflict());
        post(pmoToken, BASE + "/" + demandId + "/candidates/" + candidateId + "/withdraw", "{\"reason\":\"x\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only a candidate In process can be withdrawn."));

        JsonNode demand = support.getJson(pmoToken, BASE + "/" + demandId);
        assertThat(actions(demand)).contains("CANDIDATE_REJECTED");
        assertThat(demand.get("activeCandidates").asInt()).isZero();
    }

    @Test
    void withdraw_needsAReason_andKeepsTheRecord() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        String path = BASE + "/" + demandId + "/candidates/" + candidateId + "/withdraw";

        post(pmoToken, path, "{\"reason\":\" \"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter the reason for the withdrawal."));
        JsonNode withdrawn = post(pmoToken, path, "{\"reason\":\"Took another project\"}").andExpect(status().isOk()).andReturnJson();
        assertThat(withdrawn.get("status").asText()).isEqualTo("WITHDRAWN");
        assertThat(support.getJson(pmoToken, BASE + "/" + demandId + "/candidates")).hasSize(1);
    }

    @Test
    void removeFromDemand_hidesTheCandidacyWithoutReason_keepsThePerson_andRecordsADistinctEvent() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID otherDemandId = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        addInternal(pmoToken, otherDemandId, EMPLOYEE_ONE).andExpect(status().isCreated());
        String path = BASE + "/" + demandId + "/candidates/" + candidateId;

        support.authorized(delete(path), hrbpToken).andExpect(status().isForbidden());
        support.authorized(delete(BASE + "/" + demandId + "/candidates/" + UUID.randomUUID()), pmoToken)
                .andExpect(status().isNotFound());
        support.authorized(delete(path), pmoToken).andExpect(status().isNoContent());
        support.authorized(delete(path), pmoToken).andExpect(status().isNotFound());

        assertThat(support.getJson(pmoToken, BASE + "/" + demandId + "/candidates")).isEmpty();
        assertThat(support.getJson(pmoToken, BASE + "/" + otherDemandId + "/candidates")).hasSize(1);
        JsonNode demand = support.getJson(pmoToken, BASE + "/" + demandId);
        assertThat(actions(demand)).contains("CANDIDATE_REMOVED_FROM_DEMAND").doesNotContain("CANDIDATE_WITHDRAWN");
        assertThat(demand.get("activeCandidates").asInt()).isZero();
        // The candidacy row is kept (marked removed), the employee is untouched.
        Boolean removed = jdbcTemplate.queryForObject("SELECT removed FROM candidate WHERE id = ?", Boolean.class, candidateId);
        assertThat(removed).isTrue();
        Integer audits = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_id = ? AND action = 'DELETE'", Integer.class, candidateId.toString());
        assertThat(audits).isEqualTo(1);

        // The person can be added again after the mistake was corrected.
        addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated());
    }

    @Test
    void pipelineStatus_isSetByHand_independentOfSteps_andRecordedInHistory() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        String path = BASE + "/" + demandId + "/candidates/" + candidateId + "/pipeline-status";
        String body = "{\"pipelineStatus\":\"INTERVIEW_SCHEDULED\"}";

        assertThat(support.getJson(pmoToken, BASE + "/" + demandId + "/candidates").get(0).get("pipelineStatus").asText())
                .isEqualTo("CV_IN_REVIEW");
        support.authorized(put(path).contentType(MediaType.APPLICATION_JSON).content(body), hrbpToken).andExpect(status().isForbidden());
        support.authorized(put(path).contentType(MediaType.APPLICATION_JSON).content("{\"pipelineStatus\":\"NOPE\"}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(put(path).contentType(MediaType.APPLICATION_JSON).content(body), pmoToken)
                .andExpect(status().isOk()).andExpect(jsonPath("$.pipelineStatus").value("INTERVIEW_SCHEDULED"))
                .andExpect(jsonPath("$.status").value("IN_PROCESS"));
        assertThat(actions(support.getJson(pmoToken, BASE + "/" + demandId))).contains("FIELD_CHANGED");
    }

    @Test
    void move_transfersCandidateToAnotherDemand_andRecordsHistoryOnBoth() throws Exception {
        UUID source = createDemand(1, null);
        UUID target = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, source, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        String path = BASE + "/" + source + "/candidates/" + candidateId + "/move";
        String body = "{\"targetDemandId\":\"" + target + "\"}";

        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON).content(body), hrbpToken).andExpect(status().isForbidden());
        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON).content("{\"targetDemandId\":\"" + source + "\"}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON).content(body), pmoToken).andExpect(status().isOk());

        assertThat(support.getJson(pmoToken, BASE + "/" + source + "/candidates").size()).isZero();
        assertThat(support.getJson(pmoToken, BASE + "/" + target + "/candidates").size()).isEqualTo(1);
        assertThat(actions(support.getJson(pmoToken, BASE + "/" + source))).contains("CANDIDATE_MOVED");
        assertThat(actions(support.getJson(pmoToken, BASE + "/" + target))).contains("CANDIDATE_MOVED");
    }

    // ------------------------------------------------------------ external people, budget, other demands

    @Test
    void externalCandidate_isMatchedByEmail_needsABudgetException_andShowsOtherDemands() throws Exception {
        UUID first = createDemand(1, 400);
        UUID second = createDemand(1, 400);
        String recruiter = support.getJson(pmoToken, BASE + "/" + first + "/candidate-options").get("recruiters").get(0).asText();
        String email = "ana." + suffix + "@example.com";

        add(hrbpToken, first, externalJson("Ana Peri?", email, recruiter, 500, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Explain why the above-budget candidate is accepted."));
        add(hrbpToken, first, externalJson("Ana Peri?", "not-an-email", recruiter, 300, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter a valid email."));
        add(hrbpToken, first, externalJson("Ana Peri?", email, "Nobody", 300, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Select a recruiter."));

        JsonNode created = add(hrbpToken, first, externalJson("Ana Peri?", email, recruiter, 500, "Rare skill set"))
                .andExpect(status().isCreated()).andReturnJson().get(0);
        assertThat(created.get("budget").get("over").asBoolean()).isTrue();
        assertThat(created.get("budget").get("actual").asText()).isEqualTo("500 EUR/day");
        assertThat(created.get("notes").get(0).get("kind").asText()).isEqualTo("BUDGET_EXCEPTION");
        assertThat(created.get("detail").asText()).isEqualTo("Recruiter " + recruiter);
        UUID personId = UUID.fromString(created.get("personId").asText());

        // The same email (other case) is the same person: not twice on one demand.
        add(hrbpToken, first, externalJson("A. Peri?", email.toUpperCase(), recruiter, 300, null))
                .andExpect(status().isConflict());

        // On another demand the known person is offered and linked to the first demand.
        JsonNode options = support.getJson(hrbpToken, BASE + "/" + second + "/candidate-options");
        JsonNode known = find(options.get("external"), "personId", personId.toString());
        assertThat(known).isNotNull();
        assertThat(known.get("otherDemands").get(0).get("demandId").asText()).isEqualTo(first.toString());

        JsonNode reused = add(hrbpToken, second, """
                {"type":"EXTERNAL","personId":"%s","name":"Ana Peri?","recruiter":"%s","expectedDailyRate":350}
                """.formatted(personId, recruiter)).andExpect(status().isCreated()).andReturnJson().get(0);
        assertThat(reused.get("personId").asText()).isEqualTo(personId.toString());
        assertThat(reused.has("budget") && reused.get("budget").get("over").asBoolean()).isFalse();
        assertThat(reused.get("otherDemands")).hasSize(1);
        assertThat(reused.get("otherDemands").get(0).get("candidateStatus").asText()).isEqualTo("IN_PROCESS");

        Integer people = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM external_person WHERE email_normalized = ?", Integer.class, email);
        assertThat(people).isEqualTo(1);

        // A budget exception note needs a candidate that is over the budget.
        post(hrbpToken, BASE + "/" + second + "/candidates/" + id(reused) + "/notes",
                "{\"text\":\"Accepted\",\"kind\":\"BUDGET_EXCEPTION\"}")
                .andExpect(status().isConflict());
        JsonNode noted = post(hrbpToken, BASE + "/" + second + "/candidates/" + id(reused) + "/notes",
                "{\"text\":\"Available from next month\"}").andExpect(status().isCreated()).andReturnJson();
        assertThat(noted.get("notes")).hasSize(1);
        assertThat(noted.get("notes").get(0).get("author").asText()).isEqualTo("Sara Bianchi");
    }

    @Test
    void externalCandidate_isPlacedAfterAnAcceptedOffer() throws Exception {
        UUID demandId = createDemand(1, null);
        String recruiter = support.getJson(pmoToken, BASE + "/" + demandId + "/candidate-options").get("recruiters").get(0).asText();
        UUID candidateId = id(add(pmoToken, demandId,
                externalJson("Marko Ili?", "marko." + suffix + "@example.com", recruiter, null, null))
                .andExpect(status().isCreated()).andReturnJson().get(0));

        step(pmoToken, demandId, candidateId, startJson()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Needs an offer with the status \"Accepted\"."));
        JsonNode withOffer = step(pmoToken, demandId, candidateId, "{\"type\":\"OFFER\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isCreated()).andReturnJson();
        step(pmoToken, demandId, candidateId, "{\"type\":\"OFFER\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("An offer is already sent or accepted."));
        outcome(pmoToken, demandId, candidateId, id(lastStep(withOffer)), "{\"outcome\":\"Accepted\"}").andExpect(status().isOk());

        JsonNode placed = step(pmoToken, demandId, candidateId, startJson()).andExpect(status().isCreated()).andReturnJson();
        assertThat(placed.get("status").asText()).isEqualTo("PLACED");

        // A placed candidate can be removed too; the position is open again.
        assertThat(support.getJson(pmoToken, BASE + "/" + demandId).get("filledPositions").asInt()).isEqualTo(1);
        mockMvc.perform(delete(BASE + "/" + demandId + "/candidates/" + candidateId)
                .header("Authorization", "Bearer " + pmoToken)).andExpect(status().isNoContent());
        JsonNode after = support.getJson(pmoToken, BASE + "/" + demandId);
        assertThat(after.get("filledPositions").asInt()).isZero();
        assertThat(after.get("status").asText()).isEqualTo("IN_PROGRESS");
    }

    // ------------------------------------------------------------ meeting participants (R-03, N-01 to N-03)

    @Test
    void meetingParticipant_seesOnlyTheirMeeting_andGivesOwnFeedbackOnce() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        UUID meetingId = id(lastStep(step(pmoToken, demandId, candidateId, meetingJson(LocalDateTime.now().minusHours(1)))
                .andExpect(status().isCreated()).andReturnJson()));

        // The line manager has no demand access, only the meeting.
        support.authorized(get(BASE + "/" + demandId + "/candidates"), managerToken).andExpect(status().isForbidden());
        JsonNode meetings = support.getJson(managerToken, BASE + "/my-meetings");
        JsonNode mine = find(meetings, "demandId", demandId.toString());
        assertThat(mine).isNotNull();
        assertThat(mine.get("step").get("id").asText()).isEqualTo(meetingId.toString());
        assertThat(mine.get("candidate").get("id").asText()).isEqualTo(candidateId.toString());

        String feedbackPath = BASE + "/" + demandId + "/candidates/" + candidateId + "/steps/" + meetingId + "/feedback";
        String feedback = "{\"participantUserId\":\"%s\",\"verdict\":\"positive\",\"feedback\":\"Strong in Spring.\"}"
                .formatted(USER_MANAGER);
        // Feedback is always the participant's own.
        post(hrbpToken, feedbackPath, feedback).andExpect(status().isForbidden());
        post(managerToken, feedbackPath, "{\"participantUserId\":\"%s\",\"verdict\":\"great\",\"feedback\":\"x\"}"
                .formatted(USER_MANAGER)).andExpect(status().isBadRequest());

        JsonNode view = post(managerToken, feedbackPath, feedback).andExpect(status().isCreated()).andReturnJson();
        // The participant gets the meeting only: no other steps, notes, budget or other demands.
        assertThat(view.get("steps")).hasSize(1);
        assertThat(view.has("otherDemands")).isFalse();
        JsonNode participant = view.get("steps").get(0).get("participants").get(0);
        assertThat(participant.get("verdict").asText()).isEqualTo("positive");
        assertThat(participant.get("feedback").asText()).isEqualTo("Strong in Spring.");
        post(managerToken, feedbackPath, feedback).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Feedback is already recorded and cannot be changed."));

        String notePath = BASE + "/" + demandId + "/candidates/" + candidateId + "/steps/" + meetingId + "/notes";
        post(managerToken, notePath, "{\"text\":\"Ask about Kafka next time.\"}").andExpect(status().isCreated());
        post(employeeToken, notePath, "{\"text\":\"x\"}").andExpect(status().isForbidden());

        JsonNode full = support.getJson(pmoToken, BASE + "/" + demandId + "/candidates").get(0);
        assertThat(lastStep(full).get("notes")).hasSize(2);
        assertThat(actions(support.getJson(pmoToken, BASE + "/" + demandId))).contains("CANDIDATE_FEEDBACK_ADDED");

        Integer notifications = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification WHERE user_id = ? AND title LIKE 'Meeting on %'", Integer.class, USER_MANAGER);
        assertThat(notifications).isGreaterThanOrEqualTo(1);
    }

    @Test
    void meetingStep_validatesKindTimeAndParticipants() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID candidateId = id(addInternal(pmoToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));
        String when = WHEN.format(LocalDateTime.now().plusDays(1));

        step(pmoToken, demandId, candidateId, "{\"type\":\"MEETING\",\"kind\":\"Coffee\",\"when\":\"%s\",\"externalParticipants\":[\"A\"]}"
                .formatted(when)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose the kind of meeting."));
        step(pmoToken, demandId, candidateId, "{\"type\":\"MEETING\",\"kind\":\"Client interview\",\"when\":\"%s\",\"participantUserIds\":[],\"externalParticipants\":[\" \"]}"
                .formatted(when)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Add at least one participant."));
        step(pmoToken, demandId, candidateId, "{\"type\":\"MEETING\",\"kind\":\"Client interview\",\"when\":\"%s\",\"participantUserIds\":[\"%s\"]}"
                .formatted(when, UUID.randomUUID())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unknown participant."));

        JsonNode users = support.getJson(pmoToken, BASE + "/meeting-users");
        assertThat(find(users, "id", USER_MANAGER.toString())).isNotNull();
    }

    // ------------------------------------------------------------ roles

    @Test
    void roles_hrbpAddsCandidatesButDoesNotChangeTheFlow_andOtherRolesHaveNoAccess() throws Exception {
        UUID demandId = createDemand(1, null);
        UUID candidateId = id(addInternal(hrbpToken, demandId, EMPLOYEE_ONE).andExpect(status().isCreated()).andReturnJson().get(0));

        step(hrbpToken, demandId, candidateId, "{\"type\":\"CV\",\"date\":\"%s\"}".formatted(LocalDate.now()))
                .andExpect(status().isForbidden());
        post(hrbpToken, BASE + "/" + demandId + "/candidates/" + candidateId + "/withdraw", "{\"reason\":\"x\"}")
                .andExpect(status().isForbidden());
        support.authorized(get(BASE + "/meeting-users"), hrbpToken).andExpect(status().isForbidden());

        for (String token : List.of(employeeToken, managerToken)) {
            support.authorized(get(BASE + "/" + demandId + "/candidates"), token).andExpect(status().isForbidden());
            support.authorized(get(BASE + "/" + demandId + "/candidate-options"), token).andExpect(status().isForbidden());
            addInternal(token, demandId, EMPLOYEE_TWO).andExpect(status().isForbidden());
        }
        support.authorized(get(BASE + "/" + UUID.randomUUID() + "/candidates"), pmoToken).andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------ helpers

    private UUID createDemand(int people, Integer maxDailyRate) throws Exception {
        String body = """
                {
                  "title":"Java Developer %s",
                  "skills":[{"name":"Java","category":"Technical","level":3,"mustHave":true}],
                  "missingSkills":[],
                  "requestedPositions":%d,
                  "allocationPct":100,
                  "maxDailyRate":%s,
                  "requestedBy":"Luca Bianchi",
                  "receivedDate":"%s",
                  "wantedStartDate":"%s",
                  "horizontals":["ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING"],
                  "verticals":["Enterpise / Industry"],
                  "force":false
                }
                """.formatted(suffix, people, maxDailyRate == null ? "null" : maxDailyRate, LocalDate.now(),
                LocalDate.now().plusDays(20));
        MvcResult result = support.authorized(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(BASE)
                                .contentType(MediaType.APPLICATION_JSON).content(body), pmoToken)
                .andExpect(status().isCreated())
                .andReturn();
        return id(objectMapper.readTree(result.getResponse().getContentAsString()));
    }

    private Json addInternal(String token, UUID demandId, UUID... employeeIds) throws Exception {
        List<String> ids = new ArrayList<>();
        for (UUID employeeId : employeeIds) {
            ids.add("\"" + employeeId + "\"");
        }
        return add(token, demandId, "{\"type\":\"INTERNAL\",\"employeeIds\":[" + String.join(",", ids) + "]}");
    }

    private Json add(String token, UUID demandId, String body) throws Exception {
        return post(token, BASE + "/" + demandId + "/candidates", body);
    }

    private Json step(String token, UUID demandId, UUID candidateId, String body) throws Exception {
        return post(token, BASE + "/" + demandId + "/candidates/" + candidateId + "/steps", body);
    }

    private Json outcome(String token, UUID demandId, UUID candidateId, UUID stepId, String body) throws Exception {
        return post(token, BASE + "/" + demandId + "/candidates/" + candidateId + "/steps/" + stepId + "/outcome", body);
    }

    private Json post(String token, String path, String body) throws Exception {
        return new Json(support.authorized(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
                        .contentType(MediaType.APPLICATION_JSON).content(body), token));
    }

    private String meetingJson(LocalDateTime when) {
        return """
                {"type":"MEETING","kind":"Technical interview","when":"%s",
                 "participantUserIds":["%s"],"externalParticipants":["Andrea Galli (client)"],
                 "note":"Bring the architecture questions."}
                """.formatted(WHEN.format(when), USER_MANAGER);
    }

    private static String startJson() {
        return "{\"type\":\"START\",\"startDate\":\"%s\",\"allocationPct\":100}".formatted(LocalDate.now().plusDays(14));
    }

    private static String externalJson(String name, String email, String recruiter, Integer rate, String exception) {
        return """
                {"type":"EXTERNAL","name":"%s","email":"%s","recruiter":"%s","expectedDailyRate":%s,"budgetException":%s}
                """.formatted(name, email, recruiter, rate == null ? "null" : rate,
                exception == null ? "null" : "\"" + exception + "\"");
    }

    private static UUID id(JsonNode node) {
        return UUID.fromString(node.get("id").asText());
    }

    private static JsonNode lastStep(JsonNode candidate) {
        JsonNode steps = candidate.get("steps");
        return steps.get(steps.size() - 1);
    }

    private static JsonNode find(JsonNode array, String field, String value) {
        for (JsonNode item : array) {
            if (item.has(field) && value.equals(item.get(field).asText())) {
                return item;
            }
        }
        return null;
    }

    private static List<String> actions(JsonNode demand) {
        List<String> actions = new ArrayList<>();
        demand.get("history").forEach(entry -> actions.add(entry.get("action").asText()));
        return actions;
    }

    /** Small wrapper so a test can check the status and then read the body. */
    private final class Json {

        private final ResultActions actions;

        private Json(ResultActions actions) {
            this.actions = actions;
        }

        Json andExpect(org.springframework.test.web.servlet.ResultMatcher matcher) throws Exception {
            actions.andExpect(matcher);
            return this;
        }

        JsonNode andReturnJson() throws Exception {
            return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
        }
    }
}



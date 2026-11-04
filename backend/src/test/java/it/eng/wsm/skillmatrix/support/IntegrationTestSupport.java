package it.eng.wsm.skillmatrix.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class IntegrationTestSupport {

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;

    public IntegrationTestSupport(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
    }

    public String loginAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    public JsonNode getJson(String token, String path) throws Exception {
        MvcResult result = authorized(get(path), token).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    public JsonNode postJson(String token, String path, String body) throws Exception {
        MvcResult result = authorized(post(path).contentType(MediaType.APPLICATION_JSON).content(body), token)
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    public JsonNode putJson(String token, String path, String body) throws Exception {
        MvcResult result = authorized(put(path).contentType(MediaType.APPLICATION_JSON).content(body), token)
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    public ResultActions authorized(MockHttpServletRequestBuilder builder, String token) throws Exception {
        return mockMvc.perform(builder.header("Authorization", "Bearer " + token));
    }

    public UUID createClient(String token, String name) throws Exception {
        JsonNode body = postJson(token, "/api/clients", """
                {"name":"%s","verticalN1":"Enterpise","verticalN2":"Telco&Media"}
                """.formatted(name));
        return UUID.fromString(body.get("id").asText());
    }

    public UUID createProject(String token, UUID clientId, String code) throws Exception {
        JsonNode body = postJson(token, "/api/projects", """
                {
                  "clientId":"%s",
                  "name":"Test Project %s",
                  "code":"%s",
                  "status":"ACTIVE"
                }
                """.formatted(clientId, code, code));
        return UUID.fromString(body.get("id").asText());
    }

    public UUID createProjectInNode(String token, String code, UUID horizontalNodeId) throws Exception {
        JsonNode body = postJson(token, "/api/projects", """
                {
                  "name":"Test Project %s",
                  "code":"%s",
                  "status":"ACTIVE",
                  "horizontalNodeId":"%s"
                }
                """.formatted(code, code, horizontalNodeId));
        return UUID.fromString(body.get("id").asText());
    }

    public UUID createAllocation(
            String token,
            UUID employeeId,
            UUID projectId,
            int allocationPct,
            LocalDate startDate,
            LocalDate endDate,
            boolean override,
            String reason) throws Exception {
        String endDateJson = endDate != null ? "\"%s\"".formatted(endDate) : "null";
        String reasonJson = reason != null ? "\"%s\"".formatted(reason) : "null";
        MvcResult result = authorized(
                        post("/api/allocations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "employeeId":"%s",
                                          "projectId":"%s",
                                          "allocationPct":%d,
                                          "startDate":"%s",
                                          "endDate":%s,
                                          "roleName":"Developer",
                                          "override":%s,
                                          "reason":%s
                                        }
                                        """
                                        .formatted(
                                                employeeId,
                                                projectId,
                                                allocationPct,
                                                startDate,
                                                endDateJson,
                                                override,
                                                reasonJson)),
                        token)
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(
                objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    public UUID findSkillIdByName(String token, String skillName) throws Exception {
        JsonNode page = getJson(token, "/api/skills?page=0&size=200");
        for (JsonNode skill : page.get("content")) {
            if (skillName.equalsIgnoreCase(skill.get("name").asText())) {
                return UUID.fromString(skill.get("id").asText());
            }
        }
        throw new IllegalStateException("Skill not found in catalog: " + skillName);
    }
}

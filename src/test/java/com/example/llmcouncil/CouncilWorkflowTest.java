package com.example.llmcouncil;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class CouncilWorkflowTest {
    private final CouncilMember alpha = new CouncilMember("Alpha", "model-a");
    private final CouncilMember beta = new CouncilMember("Beta", "model-b");
    private final CouncilMember gamma = new CouncilMember("Gamma", "model-c");

    @Test
    void anonymizeResponsesExcludesReviewerIdentity() {
        CouncilConfig config = new CouncilConfig("key", "https://example.com", List.of(alpha, beta, gamma), alpha, 0.2);
        CouncilWorkflow workflow = new CouncilWorkflow(config, null);
        List<CouncilResponse> responses = List.of(
                new CouncilResponse(alpha, "A"),
                new CouncilResponse(beta, "B"),
                new CouncilResponse(gamma, "C")
        );

        Map<String, CouncilResponse> anonymized = workflow.anonymizeResponses(responses, beta, List.of("Response A", "Response B", "Response C"));

        assertEquals(2, anonymized.size());
        assertFalse(anonymized.values().stream().anyMatch(response -> response.member().equals(beta)));
        assertEquals(List.of(alpha, gamma), anonymized.values().stream().map(CouncilResponse::member).toList());
    }

    @Test
    void parseReviewReadsRankingAndRationale() {
        CouncilConfig config = new CouncilConfig("key", "https://example.com", List.of(alpha, beta, gamma), alpha, 0.2);
        CouncilWorkflow workflow = new CouncilWorkflow(config, null);

        ReviewResult result = workflow.parseReview(alpha, "RANKING: Response B, Response A\nRATIONALE: B is more complete.\nIt cites edge cases.");

        assertEquals(List.of("Response B", "Response A"), result.ranking());
        assertEquals("B is more complete.\nIt cites edge cases.", result.rationale());
    }
}

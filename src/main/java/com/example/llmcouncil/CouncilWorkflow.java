package com.example.llmcouncil;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class CouncilWorkflow {
    private final CouncilConfig config;
    private final OpenRouterClient client;

    public CouncilWorkflow(CouncilConfig config, OpenRouterClient client) {
        this.config = config;
        this.client = client;
    }

    public String run(String userPrompt) throws IOException, InterruptedException {
        List<CouncilResponse> firstOpinions = collectFirstOpinions(userPrompt);
        List<ReviewResult> reviews = collectReviews(userPrompt, firstOpinions);
        return chairSynthesis(userPrompt, firstOpinions, reviews);
    }

    List<CouncilResponse> collectFirstOpinions(String userPrompt) throws IOException, InterruptedException {
        List<CouncilResponse> responses = new ArrayList<>();
        for (CouncilMember member : config.councilMembers()) {
            String response = client.chat(member.modelId(), List.of(
                    new OpenRouterClient.Message("system", "You are a careful expert providing an initial answer for an LLM council."),
                    new OpenRouterClient.Message("user", userPrompt)
            ));
            responses.add(new CouncilResponse(member, response));
        }
        return responses;
    }

    List<ReviewResult> collectReviews(String userPrompt, List<CouncilResponse> firstOpinions) throws IOException, InterruptedException {
        List<String> aliases = List.of("Response A", "Response B", "Response C", "Response D", "Response E");
        List<ReviewResult> reviews = new ArrayList<>();
        for (CouncilMember reviewer : config.councilMembers()) {
            Map<String, CouncilResponse> anonymized = anonymizeResponses(firstOpinions, reviewer, aliases);
            String reviewPrompt = buildReviewPrompt(userPrompt, anonymized);
            String review = client.chat(reviewer.modelId(), List.of(
                    new OpenRouterClient.Message("system", "Rank the candidate answers by quality. Respond with lines starting RANKING: and RATIONALE:."),
                    new OpenRouterClient.Message("user", reviewPrompt)
            ));
            reviews.add(parseReview(reviewer, review));
        }
        return reviews;
    }

    Map<String, CouncilResponse> anonymizeResponses(List<CouncilResponse> responses, CouncilMember reviewer, List<String> aliases) {
        Map<String, CouncilResponse> anonymized = new LinkedHashMap<>();
        int index = 0;
        for (CouncilResponse response : responses) {
            if (!response.member().equals(reviewer)) {
                anonymized.put(aliases.get(index++), response);
            }
        }
        return anonymized;
    }

    ReviewResult parseReview(CouncilMember reviewer, String review) {
        String[] lines = review.split("\\R");
        List<String> ranking = new ArrayList<>();
        StringBuilder rationale = new StringBuilder();
        for (String line : lines) {
            if (line.startsWith("RANKING:")) {
                String rankText = line.substring("RANKING:".length()).trim();
                for (String item : rankText.split(",")) {
                    if (!item.isBlank()) {
                        ranking.add(item.trim());
                    }
                }
            } else if (line.startsWith("RATIONALE:")) {
                rationale.append(line.substring("RATIONALE:".length()).trim()).append(System.lineSeparator());
            } else if (rationale.length() > 0) {
                rationale.append(line).append(System.lineSeparator());
            }
        }
        return new ReviewResult(reviewer, ranking, rationale.toString().trim());
    }

    String chairSynthesis(String userPrompt, List<CouncilResponse> firstOpinions, List<ReviewResult> reviews) throws IOException, InterruptedException {
        String responseBundle = firstOpinions.stream()
                .map(response -> response.member().displayName() + ":\n" + response.response())
                .collect(Collectors.joining("\n\n"));
        String reviewBundle = reviews.stream()
                .map(review -> review.reviewer().displayName() + " ranked " + review.ranking() + " because " + review.rationale())
                .collect(Collectors.joining("\n"));
        String scoreBoard = buildScoreBoard(reviews);
        return client.chat(config.chairman().modelId(), List.of(
                new OpenRouterClient.Message("system", "You are the chairman of an LLM council. Produce the final answer and briefly explain how the council converged."),
                new OpenRouterClient.Message("user", "User question:\n" + userPrompt
                        + "\n\nFirst opinions:\n" + responseBundle
                        + "\n\nPeer reviews:\n" + reviewBundle
                        + "\n\nAggregate ranking summary:\n" + scoreBoard)
        ));
    }

    String buildReviewPrompt(String userPrompt, Map<String, CouncilResponse> anonymized) {
        StringBuilder prompt = new StringBuilder("Question:\n")
                .append(userPrompt)
                .append("\n\nRank the following candidate answers from best to worst. Use their alias names only.\n");
        anonymized.forEach((alias, response) -> prompt.append("\n")
                .append(alias)
                .append(":\n")
                .append(response.response())
                .append("\n"));
        prompt.append("\nRespond exactly like:\nRANKING: Response B, Response A\nRATIONALE: ...");
        return prompt.toString();
    }

    String buildScoreBoard(List<ReviewResult> reviews) {
        Map<String, Integer> scoreBoard = new LinkedHashMap<>();
        for (ReviewResult review : reviews) {
            int score = review.ranking().size();
            for (String alias : review.ranking()) {
                scoreBoard.merge(alias, score--, Integer::sum);
            }
        }
        return scoreBoard.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
                .map(entry -> entry.getKey() + " => " + entry.getValue())
                .collect(Collectors.joining(", "));
    }
}

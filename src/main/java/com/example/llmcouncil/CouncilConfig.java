package com.example.llmcouncil;

import java.util.List;

public record CouncilConfig(
        String openRouterApiKey,
        String baseUrl,
        List<CouncilMember> councilMembers,
        CouncilMember chairman,
        double temperature
) {
    public static CouncilConfig fromEnvironment() {
        String apiKey = requireEnv("OPENROUTER_API_KEY");
        String baseUrl = System.getenv().getOrDefault("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions");
        double temperature = Double.parseDouble(System.getenv().getOrDefault("LLM_TEMPERATURE", "0.2"));

        List<CouncilMember> members = List.of(
                new CouncilMember("OpenAI", System.getenv().getOrDefault("COUNCIL_MODEL_1", "openai/gpt-4o-mini")),
                new CouncilMember("Anthropic", System.getenv().getOrDefault("COUNCIL_MODEL_2", "anthropic/claude-3.5-sonnet")),
                new CouncilMember("Google", System.getenv().getOrDefault("COUNCIL_MODEL_3", "google/gemini-2.0-flash-001"))
        );
        CouncilMember chairman = new CouncilMember(
                "Chairman",
                System.getenv().getOrDefault("CHAIRMAN_MODEL", members.get(0).modelId())
        );
        return new CouncilConfig(apiKey, baseUrl, members, chairman, temperature);
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required environment variable: " + name);
        }
        return value;
    }
}

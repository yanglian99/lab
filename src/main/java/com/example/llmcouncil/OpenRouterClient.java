package com.example.llmcouncil;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OpenRouterClient {
    private static final Pattern CONTENT_PATTERN = Pattern.compile("\"content\"\\s*:\\s*\"((?:\\\\.|[^\\\"])*)\"");

    private final CouncilConfig config;
    private final HttpClient httpClient;

    public OpenRouterClient(CouncilConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public String chat(String modelId, List<Message> messages) throws IOException, InterruptedException {
        String payload = buildPayload(modelId, messages);
        HttpRequest request = HttpRequest.newBuilder(URI.create(config.baseUrl()))
                .header("Authorization", "Bearer " + config.openRouterApiKey())
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://github.com/karpathy/llm-council")
                .header("X-Title", "llm-council-java")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .timeout(Duration.ofMinutes(2))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("OpenRouter request failed: " + response.statusCode() + "\n" + response.body());
        }
        return extractContent(response.body());
    }

    private String buildPayload(String modelId, List<Message> messages) {
        String messageJson = messages.stream()
                .map(message -> String.format("{\"role\":\"%s\",\"content\":\"%s\"}",
                        escapeJson(message.role()),
                        escapeJson(message.content())))
                .reduce((left, right) -> left + "," + right)
                .orElse("");
        return String.format("{\"model\":\"%s\",\"temperature\":%.2f,\"messages\":[%s]}",
                escapeJson(modelId),
                config.temperature(),
                messageJson);
    }

    static String escapeJson(String input) {
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    static String extractContent(String json) {
        Matcher matcher = CONTENT_PATTERN.matcher(json);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Unable to find assistant content in response: " + json);
        }
        return matcher.group(1)
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    public record Message(String role, String content) {
    }
}

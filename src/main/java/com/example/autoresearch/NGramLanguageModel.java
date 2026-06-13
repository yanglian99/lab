package com.example.autoresearch;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public final class NGramLanguageModel {
    private final ExperimentConfig config;
    private final Map<String, Map<Character, Integer>> counts = new HashMap<>();
    private final Map<String, Integer> contextTotals = new HashMap<>();
    private final Set<Character> vocabulary = new HashSet<>();

    public NGramLanguageModel(ExperimentConfig config) {
        this.config = config;
    }

    public void train(String text) {
        String padded = pad(text);
        Map<Character, Integer> frequencies = new HashMap<>();
        for (char c : text.toCharArray()) {
            frequencies.merge(c, 1, Integer::sum);
        }

        for (int i = config.contextLength(); i < padded.length(); i++) {
            char next = padded.charAt(i);
            if (frequencies.getOrDefault(next, 0) < config.minFrequency()) {
                continue;
            }
            String context = padded.substring(i - config.contextLength(), i);
            counts.computeIfAbsent(context, ignored -> new HashMap<>()).merge(next, 1, Integer::sum);
            contextTotals.merge(context, 1, Integer::sum);
            vocabulary.add(next);
        }
        if (vocabulary.isEmpty()) {
            for (char c : text.toCharArray()) {
                vocabulary.add(c);
            }
        }
    }

    public double bitsPerCharacter(String text) {
        String padded = pad(text);
        double negativeLog2Sum = 0.0;
        int tokens = 0;
        for (int i = config.contextLength(); i < padded.length(); i++) {
            String context = padded.substring(i - config.contextLength(), i);
            char next = padded.charAt(i);
            double probability = probability(context, next);
            negativeLog2Sum += -Math.log(probability) / Math.log(2);
            tokens++;
        }
        return tokens == 0 ? Double.POSITIVE_INFINITY : negativeLog2Sum / tokens;
    }

    private double probability(String context, char next) {
        Map<Character, Integer> nextCounts = counts.get(context);
        int observed = nextCounts == null ? 0 : nextCounts.getOrDefault(next, 0);
        int total = contextTotals.getOrDefault(context, 0);
        int vocabSize = Math.max(vocabulary.size(), 1);
        double smoothing = config.smoothing();
        if (total == 0) {
            return 1.0 / vocabSize;
        }
        return (observed + smoothing) / (total + smoothing * vocabSize);
    }

    private String pad(String text) {
        return "~".repeat(config.contextLength()) + text;
    }
}

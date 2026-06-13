package com.example.autoresearch;

import java.util.List;
import java.util.Random;

public final class SearchPolicy {
    private final Random random;

    public SearchPolicy(long seed) {
        this.random = new Random(seed);
    }

    public ExperimentConfig propose(ExperimentConfig incumbent) {
        List<ExperimentConfig> candidates = List.of(
                incumbent.withContextLength(Math.max(1, incumbent.contextLength() - 1)),
                incumbent.withContextLength(Math.min(8, incumbent.contextLength() + 1)),
                incumbent.withSmoothing(clamp(incumbent.smoothing() * 0.5, 0.05, 2.0)),
                incumbent.withSmoothing(clamp(incumbent.smoothing() * 1.5, 0.05, 2.0)),
                incumbent.withLowercase(!incumbent.lowercase()),
                incumbent.withMinFrequency(Math.min(4, incumbent.minFrequency() + 1)),
                incumbent.withMinFrequency(Math.max(1, incumbent.minFrequency() - 1))
        );
        return candidates.get(random.nextInt(candidates.size()));
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}

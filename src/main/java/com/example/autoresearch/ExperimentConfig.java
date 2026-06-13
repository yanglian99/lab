package com.example.autoresearch;

public record ExperimentConfig(int contextLength, double smoothing, boolean lowercase, int minFrequency) {
    public ExperimentConfig {
        if (contextLength < 1) {
            throw new IllegalArgumentException("contextLength must be >= 1");
        }
        if (smoothing <= 0.0) {
            throw new IllegalArgumentException("smoothing must be > 0");
        }
        if (minFrequency < 1) {
            throw new IllegalArgumentException("minFrequency must be >= 1");
        }
    }

    public String describe() {
        return "contextLength=" + contextLength
                + ", smoothing=" + smoothing
                + ", lowercase=" + lowercase
                + ", minFrequency=" + minFrequency;
    }

    public static ExperimentConfig baseline() {
        return new ExperimentConfig(4, 0.5, true, 1);
    }

    public ExperimentConfig withContextLength(int value) {
        return new ExperimentConfig(value, smoothing, lowercase, minFrequency);
    }

    public ExperimentConfig withSmoothing(double value) {
        return new ExperimentConfig(contextLength, value, lowercase, minFrequency);
    }

    public ExperimentConfig withLowercase(boolean value) {
        return new ExperimentConfig(contextLength, smoothing, value, minFrequency);
    }

    public ExperimentConfig withMinFrequency(int value) {
        return new ExperimentConfig(contextLength, smoothing, lowercase, value);
    }

    @Override
    public String toString() {
        return describe();
    }
}

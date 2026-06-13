package com.example.autoresearch;

public record ExperimentResult(ExperimentConfig config, double validationBitsPerByte) {
    public String summary() {
        return String.format("val_bpb=%.4f with %s", validationBitsPerByte, config.describe());
    }
}

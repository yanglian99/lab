package com.example.autoresearch;

import java.util.List;

public final class AutoResearchSelfTest {
    private AutoResearchSelfTest() {
    }

    public static void main(String[] args) {
        CorpusDataset dataset = new CorpusDataset(
                "hello world hello world hello world",
                "hello world");
        AutoResearchRunner runner = new AutoResearchRunner(7L);
        List<ExperimentResult> results = runner.run(dataset, 6);

        if (results.isEmpty()) {
            throw new IllegalStateException("Expected at least one experiment result.");
        }
        if (results.get(0).validationBitsPerByte() > results.get(results.size() - 1).validationBitsPerByte()) {
            throw new IllegalStateException("Expected results to be sorted by validation bits per byte.");
        }

        System.out.println("Self-test passed with best result: " + results.get(0).summary());
    }
}

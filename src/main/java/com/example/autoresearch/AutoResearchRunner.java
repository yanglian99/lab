package com.example.autoresearch;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class AutoResearchRunner {
    private final Trainer trainer = new Trainer();
    private final SearchPolicy searchPolicy;

    public AutoResearchRunner(long seed) {
        this.searchPolicy = new SearchPolicy(seed);
    }

    public List<ExperimentResult> run(CorpusDataset dataset, int experiments) {
        List<ExperimentResult> history = new ArrayList<>();
        ExperimentConfig bestConfig = ExperimentConfig.baseline();
        ExperimentResult bestResult = trainer.run(dataset, bestConfig);
        history.add(bestResult);

        for (int i = 1; i < experiments; i++) {
            ExperimentConfig proposal = searchPolicy.propose(bestConfig);
            ExperimentResult result = trainer.run(dataset, proposal);
            history.add(result);
            if (result.validationBitsPerByte() < bestResult.validationBitsPerByte()) {
                bestResult = result;
                bestConfig = proposal;
            }
        }

        history.sort(Comparator.comparingDouble(ExperimentResult::validationBitsPerByte));
        return history;
    }
}

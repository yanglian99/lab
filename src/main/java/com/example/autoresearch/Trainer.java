package com.example.autoresearch;

public final class Trainer {
    public ExperimentResult run(CorpusDataset dataset, ExperimentConfig config) {
        NGramLanguageModel model = new NGramLanguageModel(config);
        model.train(dataset.trainingText());
        double validationBitsPerByte = model.bitsPerCharacter(dataset.validationText());
        return new ExperimentResult(config, validationBitsPerByte);
    }
}

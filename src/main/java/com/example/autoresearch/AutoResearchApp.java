package com.example.autoresearch;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public final class AutoResearchApp {
    private AutoResearchApp() {
    }

    public static void main(String[] args) throws IOException {
        Path corpus = args.length > 0 ? Path.of(args[0]) : Path.of("sample-data.txt");
        int experiments = args.length > 1 ? Integer.parseInt(args[1]) : 12;

        CorpusDataset dataset = CorpusLoader.load(corpus, true);
        AutoResearchRunner runner = new AutoResearchRunner(42L);
        List<ExperimentResult> history = runner.run(dataset, experiments);

        System.out.println("autoresearch-java");
        System.out.println("Corpus: " + corpus.toAbsolutePath());
        System.out.println("Train chars: " + dataset.trainingText().length());
        System.out.println("Validation chars: " + dataset.validationText().length());
        System.out.println("Vocabulary size: " + dataset.vocabularySize());
        System.out.println();
        System.out.println("Top experiments:");
        history.stream().limit(Math.min(5, history.size())).forEach(result -> System.out.println(" - " + result.summary()));
    }
}

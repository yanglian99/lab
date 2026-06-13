package com.example.autoresearch;

public record CorpusDataset(String trainingText, String validationText) {
    public int vocabularySize() {
        return (int) (trainingText + validationText).chars().distinct().count();
    }
}

package com.example.autoresearch;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class CorpusLoader {
    private CorpusLoader() {
    }

    public static CorpusDataset load(Path path, boolean lowercase) throws IOException {
        String text = Files.readString(path);
        if (lowercase) {
            text = text.toLowerCase();
        }
        text = text.replace("\r\n", "\n");
        int split = Math.max(1, (int) Math.floor(text.length() * 0.9));
        String train = text.substring(0, split);
        String validation = text.substring(split);
        if (validation.isEmpty()) {
            validation = train;
        }
        return new CorpusDataset(train, validation);
    }
}

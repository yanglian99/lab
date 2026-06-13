# autoresearch-java

This repository is a Java reinterpretation of the ideas in `karpathy/autoresearch`.

## Goal
Run a compact autonomous research loop over a single editable training implementation.

## Files
- `src/main/java/com/example/autoresearch/AutoResearchApp.java` - CLI entrypoint.
- `src/main/java/com/example/autoresearch/NGramLanguageModel.java` - the primary experiment implementation.
- `src/main/java/com/example/autoresearch/SearchPolicy.java` - proposes mutated hyperparameters.
- `src/test/java/com/example/autoresearch/AutoResearchSelfTest.java` - smoke test.
- `sample-data.txt` - tiny local corpus for smoke tests.

## Suggested workflow
1. Compile with `javac -d out $(find src/main/java src/test/java -name '*.java')`.
2. Run `java -cp out com.example.autoresearch.AutoResearchSelfTest` to verify the baseline.
3. Run `java -cp out com.example.autoresearch.AutoResearchApp sample-data.txt 12` to execute the autonomous loop.
4. Modify `NGramLanguageModel` or the hyperparameter search policy, then compare the best `val_bpb`.

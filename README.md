# autoresearch-java

A compact Java port inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

Instead of reproducing the original Python + GPU GPT training stack exactly, this project ports the *workflow* into a pure-Java baseline that can run anywhere:

- load a text corpus,
- train a lightweight language model,
- evaluate validation bits per byte,
- mutate experiment settings automatically,
- keep the best result across a sequence of runs.

## Project layout

- `src/main/java/com/example/autoresearch/CorpusLoader.java` - corpus loading and train/validation split.
- `src/main/java/com/example/autoresearch/NGramLanguageModel.java` - configurable n-gram language model.
- `src/main/java/com/example/autoresearch/Trainer.java` - executes one experiment.
- `src/main/java/com/example/autoresearch/SearchPolicy.java` - proposes new hyperparameter mutations.
- `src/main/java/com/example/autoresearch/AutoResearchRunner.java` - autonomous experiment loop.
- `src/test/java/com/example/autoresearch/AutoResearchSelfTest.java` - dependency-free smoke test.
- `program.md` - concise instructions for an agent or human operator.

## Run

```bash
javac -d out $(find src/main/java src/test/java -name '*.java')
java -cp out com.example.autoresearch.AutoResearchSelfTest
java -cp out com.example.autoresearch.AutoResearchApp sample-data.txt 12
```

## Notes

- The scoring metric is validation bits per byte (`val_bpb`), mirroring the original repo's emphasis on a comparable language-model metric.
- The current Java baseline uses an n-gram model for portability and zero native dependencies.
- If you want a closer reproduction of the original project, the next step would be swapping `NGramLanguageModel` for a tensor-backed transformer implementation using DJL or ND4J.

# lab

This repository contains a dependency-free Java port of Andrej Karpathy's `microgpt.py` gist, preserving the same end-to-end structure: dataset loading, character tokenizer, scalar autograd engine, GPT forward pass, Adam training loop, and autoregressive sampling.

## Files

- `MicroGpt.java`: single-file Java implementation of microgpt.

## Run

```bash
javac MicroGpt.java
java MicroGpt
```

On the first run, the program attempts to download `input.txt` from the same names dataset used by the Python gist when the file is missing, and falls back to a small built-in sample dataset if networking is unavailable.

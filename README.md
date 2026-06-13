lab
===

Simplified AlphaGo-style Go AI (educational)

## What is included
- A compact Go engine (board, legal moves, captures, pass, terminal condition).
- A lightweight policy-value model based on handcrafted heuristics.
- Monte Carlo Tree Search (MCTS) with PUCT to pick moves.

## Run
```bash
python3 ai_go.py
```

## Notes
This is intentionally simplified for clarity:
- no ko/superko enforcement,
- simple scoring heuristic,
- no neural-network training loop.

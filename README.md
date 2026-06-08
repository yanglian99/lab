# Game of AI: Neural Maze

A small browser-based puzzle strategy MVP where an AI companion evaluates every legal move and recommends a safe path through a corrupted data vault.

## Game concept

- **Genre:** Puzzle strategy
- **AI role:** Companion AI that uses deterministic decision scoring for tactical recommendations
- **Objective:** Collect all three data cores, unlock the exit, and avoid the sentinel firewall
- **Target platform:** Web browser with native JavaScript modules and HTML Canvas

See the full one-page brief in [`docs/game-brief.md`](docs/game-brief.md).

## MVP features

- One playable 8x8 level/map
- Start, play, win/lose overlay, score, turns, core counter, and restart UI
- AI companion hint panel that updates after each move
- Deterministic sentinel behavior for repeatable playtesting
- Dependency-free implementation with unit-tested game logic

## Run locally

```bash
npm start
```

Then open <http://localhost:4173> in a browser.

## Controls

- Move with **WASD** or **arrow keys**
- Collect yellow data cores
- Reach the green exit after all cores are collected
- Avoid the red sentinel firewall

## Test

```bash
npm test
```

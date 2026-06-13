# World 1-1 Inspired 2D Platformer

A complete HTML5 Canvas platformer implemented in JavaScript ES modules. The game is inspired by the flow of Super Mario Bros. World 1-1 while using original code and simple canvas-rendered shapes.

## Features

- Mario-like player with left/right movement, jumping, gravity, acceleration, and state changes (small, big, dead).
- Tile-based level with bricks, question blocks, solid pipes, pits, staircase, flagpole, and castle.
- Horizontal camera scrolling across a full stage layout.
- Goomba enemies with stomp and side-collision behavior.
- Collectible coins, a mushroom power-up, a genuinely hidden 1-up block, and breakable bricks for big-player hits.
- Bonus underground coin room entered from an overworld pipe and exited near the end of the stage.
- Lives now persist across deaths with an automatic respawn flow until game over.
- HUD with score, coins, lives, level label, and countdown timer.
- Sound hooks for jump, coin, and power-up events via the audio manager.
- Clean module split for input, level data, entity behavior, game rules, and rendering.

## Project Structure

```text
index.html           # Canvas page shell and controls text
src/constants.js     # Shared game constants
src/input.js         # Keyboard input tracking
src/audio.js         # Sound hook manager
src/levelData.js     # Overworld + bonus room tile maps and scripted content
src/entities.js      # Player, Goomba, and Mushroom entities
src/level.js         # Level state + block / coin / pipe interaction
src/game.js          # Main gameplay loop, physics, collisions, camera, HUD state
src/renderer.js      # Canvas drawing for world, entities, and HUD
src/main.js          # Bootstraps the game loop
```

## How to Run

Because the game uses JavaScript modules, serve the repository with a local web server.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

### Option 2: VS Code Live Server

Open the repo in VS Code and run **Open with Live Server** on `index.html`.

## Controls

- **Move:** `Left / Right Arrow` or `A / D`
- **Jump:** `Space`, `Up Arrow`, or `W`
- **Enter pipe:** `Down Arrow` or `S` while standing on the enterable pipe
- **Restart:** `R` after victory or game over

## Level Sequence Included

- Start flat area for movement warm-up
- First Goomba encounter
- Question block containing a mushroom
- Pipe section with one enterable pipe
- Mid-level pits and longer progression
- Underground bonus room with coins
- Final staircase, flagpole, and castle

## Notes

- The rendering uses simple geometric sprites so the project remains self-contained.
- The audio system currently exposes hooks via `AudioManager.play(...)`, making it easy to add real sounds later.
- The hidden 1-up block is not rendered until discovered, matching the intended secret-block behavior more closely.

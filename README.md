# Chess vs AI

A lightweight browser chess game where you play White against a simple minimax AI.

## Run locally

Because this app is static HTML/CSS/JS, you can open `index.html` directly or serve it with a local HTTP server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Features

- Click-to-move chess board with legal move highlighting.
- AI opponent (Black) using minimax with alpha-beta pruning.
- Adjustable AI search depth (easy / normal / hard).
- New game button for quick resets.

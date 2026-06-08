# Game of AI: Neural Maze — One-Page Game Brief

## Concept

**Genre:** Puzzle strategy web game.

**AI role:** Companion AI. The player explores a compact data-vault maze while an in-game AI companion evaluates legal moves, scores risk, and recommends the next action. The MVP uses deterministic local AI so the game remains playable without network access; a later release can add OpenAI API-powered flavor text, coaching summaries, or NPC dialogue.

**High concept:** You are a breach runner trapped inside a corrupted AI vault. Three data cores must be recovered before the exit unlocks. A sentinel firewall patrols the same grid and moves toward your latest position after each valid turn. Your AI companion reads the map, threat distance, remaining objectives, and escape routes to provide short tactical guidance.

## Core Loop

1. Start a round from the title screen.
2. Read the AI companion recommendation.
3. Move one tile with WASD or arrow keys.
4. Collect data cores, avoid walls, and manage distance from the sentinel.
5. After each valid player move, the sentinel advances one tile using a deterministic chase rule.
6. The AI companion rescans the board and recommends the next move.
7. Continue until the player escapes or is caught.
8. Review final score and restart for a cleaner route.

## Win and Lose Conditions

**Win condition:** Collect all three data cores and step onto the exit gate.

**Lose condition:** The sentinel firewall moves onto the player's tile, or the player moves into the sentinel.

**Scoring:** Data cores award points, the final escape awards a larger completion bonus, and each turn applies a small route-efficiency cost. Bumping into walls also costs points, which nudges the player to follow clear route planning.

## Target Platform

**Primary target:** Web browser on desktop and tablet.

**Current MVP stack:** Native JavaScript modules with HTML Canvas and CSS. This keeps the prototype dependency-free while matching the React + Canvas direction in spirit: the game renderer is canvas-based, the HUD is DOM-based, and the logic is isolated for testability.

**Launch path:** Static hosting on Netlify or Vercel. A future backend can use Node.js or FastAPI only if OpenAI API calls, analytics ingestion, or authenticated leaderboards are added.

## MVP Scope

- One playable handcrafted level.
- One AI behavior mode: companion decision scoring.
- Basic UI: start, play, win/lose overlay, score, and restart.
- Deterministic sentinel behavior for consistent playtesting.
- Local fallback hint system that never blocks gameplay.

## AI Systems Plan

**Week 1 MVP:** Ship deterministic companion scoring. Each legal move is scored by distance to the next objective, distance from the sentinel, immediate reward opportunities, and available escape routes.

**Week 2 enhancement:** Add difficulty scaling by changing sentinel speed or tie-break behavior after a configurable number of turns. Optionally add OpenAI API-generated coaching blurbs after a round.

**Guardrails for optional LLM features:** Keep generated hints under a strict character limit, request family-friendly tactical language only, never let LLM output alter authoritative game state, and fall back to local deterministic hints if the API times out or returns invalid content.

## Playtest and Balance Plan

Run 10–20 sessions and track win rate, session length, turns to first core, deaths within two tiles of the sentinel, wall bumps, and restart frequency. Tune map walls, sentinel movement, score rewards, and AI hint wording until new players can complete a full round while still feeling pressure.

## Definition of Done for MVP

- A player can complete a full round from start to win or lose.
- The AI companion provides a consistent recommendation after every move.
- The sentinel behaves predictably and cannot move through walls.
- Score, turns, core count, threat level, and restart state update correctly.
- Logic tests cover legal movement, companion scoring, collection, win state, and lose state.

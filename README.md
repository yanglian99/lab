# PolyLab Tactics

PolyLab Tactics is a complete, runnable single-player turn-based 4X strategy prototype inspired by the feel of *The Battle of Polytopia*. It uses a Spring Boot backend to manage game state and a lightweight HTML5 Canvas frontend for input, rendering, fog of war, and turn flow.

## Features

- Procedurally generated square-tile map with plains, forests, mountains, shallow water, and water.
- Villages, cities, capitals, resources, and buildable improvements.
- Turn-based loop with player turns followed by heuristic AI turns.
- Fog of war based on friendly cities and units.
- Stars economy with city income and city growth through improvements.
- Technology tree with unlockable unit access.
- Four unit classes: Warrior, Archer, Rider, Defender.
- Movement, combat, retaliation, city capture, village capture, recruiting, research, and building.
- Win conditions:
  - Domination: own the only remaining capital.
  - Score mode: highest score after 40 turns.
- Clean engine-oriented backend structure:
  - `GameEngine`
  - `MapGenerator`
  - `UnitSystem`
  - `CombatSystem`
  - `AIPlayer`
  - `TechTree`

## Folder structure

```text
.
├── pom.xml
├── README.md
└── src
    └── main
        ├── java/com/example/polylab
        │   ├── PolylabApplication.java
        │   ├── controller/GameController.java
        │   └── game
        │       ├── ai/AIPlayer.java
        │       ├── engine/CombatSystem.java
        │       ├── engine/GameEngine.java
        │       ├── engine/TechTree.java
        │       ├── engine/UnitSystem.java
        │       ├── map/MapGenerator.java
        │       ├── model/*.java
        │       └── service/GameService.java
        └── resources
            ├── application.properties
            └── static
                ├── app.js
                └── index.html
```

## How to run locally

### Requirements

- Java 17+
- Maven 3.9+ (or use the Maven installed on your system)

### Start the game

```bash
mvn spring-boot:run
```

Then open:

```text
http://localhost:8080
```

## Example gameplay flow

1. Click **New Game**.
2. Select your warrior and move toward nearby villages revealed through fog of war.
3. Capture a village to found a new city.
4. Use stars to research economy or military technologies.
5. Recruit stronger units in your cities after unlocking their technologies.
6. Build tile improvements on fruit, animals, or fish to grow city population and increase income.
7. End your turn and let the AI expand, recruit, and attack weak enemies.
8. Capture enemy cities and eventually the enemy capital to win domination, or lead on score by turn 40.

## API overview

- `POST /api/game/new` — create a new game.
- `GET /api/game/{id}` — fetch current game state.
- `POST /api/game/{id}/move` — move a unit.
- `POST /api/game/{id}/attack` — attack an enemy unit.
- `POST /api/game/{id}/research` — research a tech.
- `POST /api/game/{id}/build` — build an improvement.
- `POST /api/game/{id}/recruit` — recruit a unit in a city.
- `POST /api/game/{id}/end-turn` — end the current turn.

## Notes and possible extras

This implementation is intentionally compact but extensible. The architecture leaves room for:

- save/load persistence
- multiplayer endpoints or WebSocket hooks
- tribe-specific bonuses
- richer animations and UI polish
- more buildings, units, and technologies

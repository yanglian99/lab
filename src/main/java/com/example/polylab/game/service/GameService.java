package com.example.polylab.game.service;

import com.example.polylab.game.engine.GameEngine;
import com.example.polylab.game.model.GameState;
import com.example.polylab.game.model.TechType;
import com.example.polylab.game.model.UnitType;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private final Map<String, GameState> games = new ConcurrentHashMap<>();
    private final GameEngine engine = new GameEngine();

    public GameState createGame() {
        GameState state = engine.newGame();
        games.put(state.getId(), state);
        return state;
    }

    public GameState getGame(String id) {
        return games.get(id);
    }

    public GameState move(String id, int unitId, int x, int y) { return engine.move(require(id), unitId, x, y); }
    public GameState attack(String id, int attackerId, int defenderId) { return engine.attack(require(id), attackerId, defenderId); }
    public GameState endTurn(String id) { return engine.endTurn(require(id)); }
    public GameState research(String id, TechType tech) { return engine.research(require(id), tech); }
    public GameState buildImprovement(String id, int x, int y) { return engine.buildImprovement(require(id), x, y); }
    public GameState recruit(String id, int cityId, UnitType type) { return engine.recruit(require(id), cityId, type); }

    private GameState require(String id) {
        GameState state = games.get(id);
        if (state == null) throw new IllegalArgumentException("Game not found");
        return state;
    }
}

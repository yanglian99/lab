package com.example.polylab.game.ai;

import com.example.polylab.game.engine.TechTree;
import com.example.polylab.game.engine.UnitSystem;
import com.example.polylab.game.model.City;
import com.example.polylab.game.model.GameState;
import com.example.polylab.game.model.Player;
import com.example.polylab.game.model.TechType;
import com.example.polylab.game.model.Tile;
import com.example.polylab.game.model.Unit;
import com.example.polylab.game.model.UnitType;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class AIPlayer {
    private final TechTree techTree;
    private final UnitSystem unitSystem;

    public AIPlayer(TechTree techTree, UnitSystem unitSystem) {
        this.techTree = techTree;
        this.unitSystem = unitSystem;
    }

    public void playTurn(GameState gameState, AiContext context) {
        Player ai = gameState.activePlayer();
        researchEconomy(ai);
        recruitIfPossible(gameState, ai, context);
        attackWeakEnemies(gameState, ai, context);
        expand(gameState, ai, context);
    }

    private void researchEconomy(Player ai) {
        List<TechType> priorities = List.of(TechType.ORGANIZATION, TechType.HUNTING, TechType.ARCHERY, TechType.RIDING, TechType.SHIELDS);
        for (TechType tech : priorities) {
            if (techTree.canResearch(ai, tech)) {
                ai.setStars(ai.getStars() - tech.cost());
                ai.getResearched().add(tech);
                ai.addScore(tech.cost());
                return;
            }
        }
    }

    private void recruitIfPossible(GameState gameState, Player ai, AiContext context) {
        for (City city : gameState.getCities().values()) {
            if (city.getOwnerId() != ai.getId()) continue;
            if (context.hasUnitAt(city.getX(), city.getY())) continue;
            for (UnitType type : List.of(UnitType.RIDER, UnitType.ARCHER, UnitType.DEFENDER, UnitType.WARRIOR)) {
                if (techTree.allowsUnit(ai, type) && ai.getStars() >= type.cost()) {
                    context.spawnUnit(ai.getId(), type, city.getX(), city.getY());
                    ai.setStars(ai.getStars() - type.cost());
                    return;
                }
            }
        }
    }

    private void attackWeakEnemies(GameState gameState, Player ai, AiContext context) {
        List<Unit> myUnits = gameState.getUnits().values().stream().filter(u -> u.getOwnerId() == ai.getId() && u.alive()).toList();
        for (Unit unit : myUnits) {
            Optional<Unit> target = gameState.getUnits().values().stream()
                    .filter(u -> u.getOwnerId() != ai.getId() && u.alive() && unitSystem.inRange(unit, u.getX(), u.getY()))
                    .min(Comparator.comparingInt(Unit::getHealth));
            target.ifPresent(enemy -> context.attack(unit.getId(), enemy.getId()));
        }
    }

    private void expand(GameState gameState, Player ai, AiContext context) {
        List<Unit> myUnits = gameState.getUnits().values().stream().filter(u -> u.getOwnerId() == ai.getId() && u.alive()).toList();
        for (Unit unit : myUnits) {
            Set<String> reachable = unitSystem.reachableTiles(unit, gameState.getMap());
            Optional<Tile> bestVillage = reachable.stream()
                    .map(key -> {
                        String[] parts = key.split(",");
                        return gameState.getMap().get(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
                    })
                    .filter(Tile::isVillage)
                    .findFirst();
            if (bestVillage.isPresent()) {
                Tile tile = bestVillage.get();
                context.move(unit.getId(), tile.getX(), tile.getY());
            } else if (!reachable.isEmpty()) {
                String key = reachable.iterator().next();
                String[] parts = key.split(",");
                context.move(unit.getId(), Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
            }
        }
    }

    public interface AiContext {
        void move(int unitId, int x, int y);
        void attack(int attackerId, int defenderId);
        void spawnUnit(int ownerId, UnitType type, int x, int y);
        boolean hasUnitAt(int x, int y);
    }
}

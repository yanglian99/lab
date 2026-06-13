package com.example.polylab.game.engine;

import com.example.polylab.game.ai.AIPlayer;
import com.example.polylab.game.map.MapGenerator;
import com.example.polylab.game.model.City;
import com.example.polylab.game.model.GameMap;
import com.example.polylab.game.model.GameState;
import com.example.polylab.game.model.ImprovementType;
import com.example.polylab.game.model.Player;
import com.example.polylab.game.model.ResourceType;
import com.example.polylab.game.model.TechType;
import com.example.polylab.game.model.Tile;
import com.example.polylab.game.model.Unit;
import com.example.polylab.game.model.UnitType;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public class GameEngine {
    private final MapGenerator mapGenerator = new MapGenerator();
    private final UnitSystem unitSystem = new UnitSystem();
    private final CombatSystem combatSystem = new CombatSystem();
    private final TechTree techTree = new TechTree();
    private final AIPlayer aiPlayer = new AIPlayer(techTree, unitSystem);

    public GameState newGame() {
        GameState state = new GameState();
        state.setId(UUID.randomUUID().toString());
        GameMap map = mapGenerator.generate(14, 10, System.currentTimeMillis());
        state.setMap(map);
        state.getPlayers().add(new Player(1, "Human", false, "Imperius"));
        state.getPlayers().add(new Player(2, "Bardur AI", true, "Bardur"));
        setupStartingPositions(state);
        return state;
    }

    private void setupStartingPositions(GameState state) {
        List<Tile> candidates = new ArrayList<>();
        for (int y = 0; y < state.getMap().getHeight(); y++) {
            for (int x = 0; x < state.getMap().getWidth(); x++) {
                Tile tile = state.getMap().get(x, y);
                if (tile.getTerrain().passableByLand()) candidates.add(tile);
            }
        }
        Tile humanStart = candidates.get(5);
        Tile aiStart = candidates.get(candidates.size() - 6);
        foundCity(state, 1, humanStart.getX(), humanStart.getY(), true);
        spawnUnit(state, 1, UnitType.WARRIOR, humanStart.getX(), humanStart.getY());
        foundCity(state, 2, aiStart.getX(), aiStart.getY(), true);
        spawnUnit(state, 2, UnitType.WARRIOR, aiStart.getX(), aiStart.getY());
        state.getPlayers().get(0).getResearched().add(TechType.ORGANIZATION);
        state.getPlayers().get(1).getResearched().add(TechType.HUNTING);
    }

    public GameState move(GameState state, int unitId, int x, int y) {
        Unit unit = requireFriendlyActiveUnit(state, unitId);
        if (unit.isMoved()) throw new IllegalStateException("Unit already moved.");
        if (!unitSystem.reachableTiles(unit, state.getMap()).contains(unitSystem.key(x, y))) {
            throw new IllegalStateException("Tile is out of range.");
        }
        Tile destination = state.getMap().get(x, y);
        if (destination.getOccupantUnitId() != null) throw new IllegalStateException("Tile occupied.");
        state.getMap().get(unit.getX(), unit.getY()).setOccupantUnitId(null);
        unit.setPosition(x, y);
        unit.setMoved(true);
        destination.setOccupantUnitId(unit.getId());
        resolveCaptures(state, unit, destination);
        state.setLog("Unit moved to (" + x + "," + y + ").");
        return state;
    }

    public GameState attack(GameState state, int attackerId, int defenderId) {
        Unit attacker = requireFriendlyActiveUnit(state, attackerId);
        Unit defender = state.getUnits().get(defenderId);
        if (defender == null || defender.getOwnerId() == attacker.getOwnerId()) throw new IllegalStateException("Invalid defender.");
        if (!unitSystem.inRange(attacker, defender.getX(), defender.getY())) throw new IllegalStateException("Target out of range.");
        if (attacker.isAttacked()) throw new IllegalStateException("Unit already attacked.");
        Tile defenderTile = state.getMap().get(defender.getX(), defender.getY());
        CombatSystem.CombatResult result = combatSystem.attack(attacker, defender, defenderTile.getTerrain(), true);
        attacker.setAttacked(true);
        if (!defender.alive()) {
            defenderTile.setOccupantUnitId(null);
            state.getUnits().remove(defenderId);
            state.activePlayer().addScore(5);
        }
        if (!attacker.alive()) {
            state.getMap().get(attacker.getX(), attacker.getY()).setOccupantUnitId(null);
            state.getUnits().remove(attackerId);
        }
        state.setLog("Combat dealt " + result.damageToDefender() + " and retaliation " + result.damageToAttacker() + ".");
        checkVictory(state);
        return state;
    }

    public GameState research(GameState state, TechType techType) {
        Player player = state.activePlayer();
        if (!techTree.canResearch(player, techType)) throw new IllegalStateException("Cannot research tech.");
        player.setStars(player.getStars() - techType.cost());
        player.getResearched().add(techType);
        player.addScore(techType.cost());
        state.setLog("Researched " + techType + ".");
        return state;
    }

    public GameState buildImprovement(GameState state, int x, int y) {
        Player player = state.activePlayer();
        Tile tile = state.getMap().get(x, y);
        City nearestOwned = state.getCities().values().stream()
                .filter(c -> c.getOwnerId() == player.getId())
                .min(Comparator.comparingInt(c -> Math.abs(c.getX() - x) + Math.abs(c.getY() - y)))
                .orElseThrow();
        if (player.getStars() < 2) throw new IllegalStateException("Need 2 stars.");
        ImprovementType improvement = switch (tile.getResource()) {
            case FRUIT -> ImprovementType.FARM;
            case ANIMALS -> ImprovementType.LUMBER_HUT;
            case FISH -> ImprovementType.PORT;
            default -> throw new IllegalStateException("No resource to improve.");
        };
        tile.setImprovement(improvement);
        player.setStars(player.getStars() - 2);
        City city = state.getCities().get(nearestOwned.getId());
        city.grow(1);
        player.addScore(3);
        state.setLog("Built " + improvement + " near " + city.getName() + ".");
        return state;
    }

    public GameState recruit(GameState state, int cityId, UnitType unitType) {
        Player player = state.activePlayer();
        City city = state.getCities().get(cityId);
        if (city == null || city.getOwnerId() != player.getId()) throw new IllegalStateException("Invalid city.");
        if (!techTree.allowsUnit(player, unitType)) throw new IllegalStateException("Tech missing.");
        if (player.getStars() < unitType.cost()) throw new IllegalStateException("Not enough stars.");
        if (state.getMap().get(city.getX(), city.getY()).getOccupantUnitId() != null) throw new IllegalStateException("City tile occupied.");
        player.setStars(player.getStars() - unitType.cost());
        spawnUnit(state, player.getId(), unitType, city.getX(), city.getY());
        state.setLog("Recruited " + unitType + ".");
        return state;
    }

    public GameState endTurn(GameState state) {
        awardIncome(state);
        state.setActivePlayerIndex((state.getActivePlayerIndex() + 1) % state.getPlayers().size());
        if (state.getActivePlayerIndex() == 0) {
            state.setTurnNumber(state.getTurnNumber() + 1);
        }
        state.getUnits().values().stream()
                .filter(unit -> unit.getOwnerId() == state.activePlayer().getId())
                .forEach(Unit::resetTurn);
        if (state.activePlayer().isAi() && "IN_PROGRESS".equals(state.getStatus())) {
            runAiTurn(state);
            return endTurn(state);
        }
        checkVictory(state);
        state.setLog("Turn passed to " + state.activePlayer().getName() + ".");
        return state;
    }

    private void awardIncome(GameState state) {
        Player player = state.activePlayer();
        int income = state.getCities().values().stream()
                .filter(city -> city.getOwnerId() == player.getId())
                .mapToInt(City::starsPerTurn)
                .sum();
        player.setStars(player.getStars() + income);
    }

    private void runAiTurn(GameState state) {
        aiPlayer.playTurn(state, new AIPlayer.AiContext() {
            @Override
            public void move(int unitId, int x, int y) {
                try { GameEngine.this.move(state, unitId, x, y); } catch (Exception ignored) {}
            }

            @Override
            public void attack(int attackerId, int defenderId) {
                try { GameEngine.this.attack(state, attackerId, defenderId); } catch (Exception ignored) {}
            }

            @Override
            public void spawnUnit(int ownerId, UnitType type, int x, int y) {
                spawnUnit(state, ownerId, type, x, y);
            }

            @Override
            public boolean hasUnitAt(int x, int y) {
                return state.getMap().get(x, y).getOccupantUnitId() != null;
            }
        });
    }

    private Unit requireFriendlyActiveUnit(GameState state, int unitId) {
        Unit unit = state.getUnits().get(unitId);
        if (unit == null || unit.getOwnerId() != state.activePlayer().getId()) throw new IllegalStateException("Unit not controllable.");
        return unit;
    }

    private void resolveCaptures(GameState state, Unit unit, Tile tile) {
        if (tile.isVillage()) {
            tile.setVillage(false);
            foundCity(state, unit.getOwnerId(), tile.getX(), tile.getY(), false);
            state.activePlayer().addScore(10);
            state.setLog("Village captured and converted into a city.");
            return;
        }
        if (tile.getCityId() != null) {
            City city = state.getCities().get(tile.getCityId());
            if (city.getOwnerId() != unit.getOwnerId()) {
                city.setOwnerId(unit.getOwnerId());
                state.activePlayer().addScore(city.isCapital() ? 20 : 12);
                state.setLog((city.isCapital() ? "Captured enemy capital!" : "Captured enemy city.") );
                checkVictory(state);
            }
        }
    }

    private void foundCity(GameState state, int ownerId, int x, int y, boolean capital) {
        int cityId = state.getNextCityId();
        City city = new City(cityId, ownerId, (capital ? "Capital " : "City ") + cityId, x, y, capital);
        state.getCities().put(cityId, city);
        Tile tile = state.getMap().get(x, y);
        tile.setCityId(cityId);
        tile.setVillage(false);
    }

    public Unit spawnUnit(GameState state, int ownerId, UnitType unitType, int x, int y) {
        Unit unit = new Unit(state.getNextUnitId(), ownerId, unitType, x, y);
        state.getUnits().put(unit.getId(), unit);
        state.getMap().get(x, y).setOccupantUnitId(unit.getId());
        return unit;
    }

    private void checkVictory(GameState state) {
        long remainingCapitals = state.getCities().values().stream().filter(City::isCapital)
                .map(City::getOwnerId).distinct().count();
        if (remainingCapitals <= 1) {
            int winnerId = state.getCities().values().stream().filter(City::isCapital).findFirst().map(City::getOwnerId).orElse(1);
            state.setStatus("DOMINATION_WIN");
            state.setWinnerId(winnerId);
        } else if (state.getTurnNumber() > state.getMaxTurns()) {
            Player winner = state.getPlayers().stream().max(Comparator.comparingInt(Player::getScore)).orElseThrow();
            state.setStatus("SCORE_WIN");
            state.setWinnerId(winner.getId());
        }
    }
}

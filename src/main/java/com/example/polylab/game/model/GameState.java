package com.example.polylab.game.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class GameState {
    private String id;
    private GameMap map;
    private final List<Player> players = new ArrayList<>();
    private final Map<Integer, Unit> units = new LinkedHashMap<>();
    private final Map<Integer, City> cities = new LinkedHashMap<>();
    private int activePlayerIndex;
    private int turnNumber = 1;
    private int maxTurns = 40;
    private int nextUnitId = 1;
    private int nextCityId = 1;
    private String status = "IN_PROGRESS";
    private Integer winnerId;
    private String log = "Welcome commander.";

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public GameMap getMap() { return map; }
    public void setMap(GameMap map) { this.map = map; }
    public List<Player> getPlayers() { return players; }
    public Map<Integer, Unit> getUnits() { return units; }
    public Map<Integer, City> getCities() { return cities; }
    public int getActivePlayerIndex() { return activePlayerIndex; }
    public void setActivePlayerIndex(int activePlayerIndex) { this.activePlayerIndex = activePlayerIndex; }
    public int getTurnNumber() { return turnNumber; }
    public void setTurnNumber(int turnNumber) { this.turnNumber = turnNumber; }
    public int getMaxTurns() { return maxTurns; }
    public void setMaxTurns(int maxTurns) { this.maxTurns = maxTurns; }
    public int getNextUnitId() { return nextUnitId++; }
    public int getNextCityId() { return nextCityId++; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getWinnerId() { return winnerId; }
    public void setWinnerId(Integer winnerId) { this.winnerId = winnerId; }
    public String getLog() { return log; }
    public void setLog(String log) { this.log = log; }

    public Player activePlayer() {
        return players.get(activePlayerIndex);
    }
}

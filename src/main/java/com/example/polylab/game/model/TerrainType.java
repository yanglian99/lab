package com.example.polylab.game.model;

public enum TerrainType {
    PLAIN(1, 0),
    FOREST(2, 1),
    MOUNTAIN(99, 2),
    WATER(99, 0),
    SHALLOW_WATER(2, 0);

    private final int movementCost;
    private final int defenseBonus;

    TerrainType(int movementCost, int defenseBonus) {
        this.movementCost = movementCost;
        this.defenseBonus = defenseBonus;
    }

    public int movementCost() {
        return movementCost;
    }

    public int defenseBonus() {
        return defenseBonus;
    }

    public boolean passableByLand() {
        return this != WATER;
    }
}

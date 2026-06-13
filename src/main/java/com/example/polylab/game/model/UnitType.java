package com.example.polylab.game.model;

public enum UnitType {
    WARRIOR(10, 3, 2, 1, 1, 2),
    ARCHER(8, 3, 1, 2, 2, 3),
    RIDER(10, 3, 1, 1, 2, 3),
    DEFENDER(15, 2, 4, 1, 1, 3);

    private final int maxHealth;
    private final int attack;
    private final int defense;
    private final int range;
    private final int movement;
    private final int cost;

    UnitType(int maxHealth, int attack, int defense, int range, int movement, int cost) {
        this.maxHealth = maxHealth;
        this.attack = attack;
        this.defense = defense;
        this.range = range;
        this.movement = movement;
        this.cost = cost;
    }

    public int maxHealth() { return maxHealth; }
    public int attack() { return attack; }
    public int defense() { return defense; }
    public int range() { return range; }
    public int movement() { return movement; }
    public int cost() { return cost; }
}

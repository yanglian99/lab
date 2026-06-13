package com.example.polylab.game.model;

public class Unit {
    private final int id;
    private final int ownerId;
    private final UnitType type;
    private int x;
    private int y;
    private int health;
    private boolean moved;
    private boolean attacked;

    public Unit(int id, int ownerId, UnitType type, int x, int y) {
        this.id = id;
        this.ownerId = ownerId;
        this.type = type;
        this.x = x;
        this.y = y;
        this.health = type.maxHealth();
    }

    public int getId() { return id; }
    public int getOwnerId() { return ownerId; }
    public UnitType getType() { return type; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getHealth() { return health; }
    public boolean isMoved() { return moved; }
    public boolean isAttacked() { return attacked; }
    public void setPosition(int x, int y) { this.x = x; this.y = y; }
    public void setHealth(int health) { this.health = health; }
    public void setMoved(boolean moved) { this.moved = moved; }
    public void setAttacked(boolean attacked) { this.attacked = attacked; }
    public void resetTurn() { this.moved = false; this.attacked = false; }
    public boolean alive() { return health > 0; }
}

package com.example.polylab.game.model;

public class City {
    private final int id;
    private int ownerId;
    private final String name;
    private final int x;
    private final int y;
    private final boolean capital;
    private int population = 1;
    private int level = 1;

    public City(int id, int ownerId, String name, int x, int y, boolean capital) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.x = x;
        this.y = y;
        this.capital = capital;
    }

    public int getId() { return id; }
    public int getOwnerId() { return ownerId; }
    public void setOwnerId(int ownerId) { this.ownerId = ownerId; }
    public String getName() { return name; }
    public int getX() { return x; }
    public int getY() { return y; }
    public boolean isCapital() { return capital; }
    public int getPopulation() { return population; }
    public int getLevel() { return level; }

    public void grow(int amount) {
        population += amount;
        level = 1 + population / 2;
    }

    public int starsPerTurn() {
        return level + (capital ? 1 : 0);
    }
}

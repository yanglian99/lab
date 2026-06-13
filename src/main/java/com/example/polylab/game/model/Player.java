package com.example.polylab.game.model;

import java.util.HashSet;
import java.util.Set;

public class Player {
    private final int id;
    private final String name;
    private final boolean ai;
    private final String tribe;
    private int stars = 5;
    private int score = 0;
    private final Set<TechType> researched = new HashSet<>();

    public Player(int id, String name, boolean ai, String tribe) {
        this.id = id;
        this.name = name;
        this.ai = ai;
        this.tribe = tribe;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public boolean isAi() { return ai; }
    public String getTribe() { return tribe; }
    public int getStars() { return stars; }
    public void setStars(int stars) { this.stars = stars; }
    public int getScore() { return score; }
    public void addScore(int delta) { this.score += delta; }
    public Set<TechType> getResearched() { return researched; }
}

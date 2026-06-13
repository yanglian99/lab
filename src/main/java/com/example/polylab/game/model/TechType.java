package com.example.polylab.game.model;

import java.util.List;

public enum TechType {
    ORGANIZATION(4, List.of()),
    HUNTING(4, List.of()),
    FISHING(4, List.of()),
    ARCHERY(6, List.of(HUNTING)),
    RIDING(6, List.of(ORGANIZATION)),
    SHIELDS(6, List.of(ORGANIZATION)),
    FORESTRY(5, List.of(HUNTING));

    private final int cost;
    private final List<TechType> prerequisites;

    TechType(int cost, List<TechType> prerequisites) {
        this.cost = cost;
        this.prerequisites = prerequisites;
    }

    public int cost() {
        return cost;
    }

    public List<TechType> prerequisites() {
        return prerequisites;
    }
}

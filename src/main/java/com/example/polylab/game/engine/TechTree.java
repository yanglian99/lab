package com.example.polylab.game.engine;

import com.example.polylab.game.model.Player;
import com.example.polylab.game.model.TechType;
import com.example.polylab.game.model.UnitType;

public class TechTree {
    public boolean canResearch(Player player, TechType tech) {
        return !player.getResearched().contains(tech)
                && player.getResearched().containsAll(tech.prerequisites())
                && player.getStars() >= tech.cost();
    }

    public boolean allowsUnit(Player player, UnitType unitType) {
        return switch (unitType) {
            case WARRIOR -> true;
            case ARCHER -> player.getResearched().contains(TechType.ARCHERY);
            case RIDER -> player.getResearched().contains(TechType.RIDING);
            case DEFENDER -> player.getResearched().contains(TechType.SHIELDS);
        };
    }
}

package com.example.polylab.game.engine;

import com.example.polylab.game.model.TerrainType;
import com.example.polylab.game.model.Unit;

public class CombatSystem {
    public CombatResult attack(Unit attacker, Unit defender, TerrainType defenderTerrain, boolean retaliation) {
        int damage = Math.max(1, (attacker.getType().attack() * 4) - ((defender.getType().defense() + defenderTerrain.defenseBonus()) * 2));
        defender.setHealth(Math.max(0, defender.getHealth() - damage));
        int retaliationDamage = 0;
        if (retaliation && defender.alive() && attacker.getType().range() == 1) {
            retaliationDamage = Math.max(1, (defender.getType().attack() * 3) - (attacker.getType().defense() * 2));
            attacker.setHealth(Math.max(0, attacker.getHealth() - retaliationDamage));
        }
        return new CombatResult(damage, retaliationDamage, !defender.alive(), !attacker.alive());
    }

    public record CombatResult(int damageToDefender, int damageToAttacker, boolean defenderKilled, boolean attackerKilled) {}
}

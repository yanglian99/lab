package com.example.polylab.game.engine;

import com.example.polylab.game.model.GameMap;
import com.example.polylab.game.model.Tile;
import com.example.polylab.game.model.Unit;

import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class UnitSystem {
    public Set<String> reachableTiles(Unit unit, GameMap map) {
        Set<String> visited = new HashSet<>();
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        Map<String, Integer> cost = new HashMap<>();
        queue.add(new int[]{unit.getX(), unit.getY()});
        cost.put(key(unit.getX(), unit.getY()), 0);
        while (!queue.isEmpty()) {
            int[] current = queue.poll();
            for (Tile neighbor : map.neighbors(current[0], current[1])) {
                if (!neighbor.getTerrain().passableByLand()) continue;
                int nextCost = cost.get(key(current[0], current[1])) + neighbor.getTerrain().movementCost();
                String key = key(neighbor.getX(), neighbor.getY());
                if (nextCost <= unit.getType().movement() && (!cost.containsKey(key) || nextCost < cost.get(key))) {
                    cost.put(key, nextCost);
                    visited.add(key);
                    queue.add(new int[]{neighbor.getX(), neighbor.getY()});
                }
            }
        }
        visited.remove(key(unit.getX(), unit.getY()));
        return visited;
    }

    public boolean inRange(Unit unit, int targetX, int targetY) {
        return Math.abs(unit.getX() - targetX) + Math.abs(unit.getY() - targetY) <= unit.getType().range();
    }

    public String key(int x, int y) {
        return x + "," + y;
    }
}

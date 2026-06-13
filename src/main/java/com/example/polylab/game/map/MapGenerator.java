package com.example.polylab.game.map;

import com.example.polylab.game.model.GameMap;
import com.example.polylab.game.model.ResourceType;
import com.example.polylab.game.model.TerrainType;
import com.example.polylab.game.model.Tile;

import java.util.Random;

public class MapGenerator {
    public GameMap generate(int width, int height, long seed) {
        Random random = new Random(seed);
        GameMap map = new GameMap(width, height);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                double noise = random.nextDouble();
                TerrainType terrain = noise < 0.13 ? TerrainType.WATER
                        : noise < 0.20 ? TerrainType.SHALLOW_WATER
                        : noise < 0.35 ? TerrainType.FOREST
                        : noise < 0.45 ? TerrainType.MOUNTAIN
                        : TerrainType.PLAIN;
                ResourceType resource = resourceFor(terrain, random);
                map.set(x, y, new Tile(x, y, terrain, resource));
            }
        }
        placeVillages(map, random, Math.max(4, width * height / 18));
        return map;
    }

    private ResourceType resourceFor(TerrainType terrain, Random random) {
        double roll = random.nextDouble();
        return switch (terrain) {
            case PLAIN -> roll < 0.15 ? ResourceType.FRUIT : ResourceType.NONE;
            case FOREST -> roll < 0.18 ? ResourceType.ANIMALS : ResourceType.NONE;
            case SHALLOW_WATER, WATER -> roll < 0.15 ? ResourceType.FISH : ResourceType.NONE;
            default -> ResourceType.NONE;
        };
    }

    private void placeVillages(GameMap map, Random random, int count) {
        int placed = 0;
        while (placed < count) {
            int x = random.nextInt(map.getWidth());
            int y = random.nextInt(map.getHeight());
            Tile tile = map.get(x, y);
            if (tile.getTerrain().passableByLand() && !tile.isVillage()) {
                tile.setVillage(true);
                placed++;
            }
        }
    }
}

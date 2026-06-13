package com.example.polylab.game.model;

import java.util.ArrayList;
import java.util.List;

public class GameMap {
    private final int width;
    private final int height;
    private final Tile[][] tiles;

    public GameMap(int width, int height) {
        this.width = width;
        this.height = height;
        this.tiles = new Tile[height][width];
    }

    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public Tile[][] getTiles() { return tiles; }
    public Tile get(int x, int y) { return tiles[y][x]; }
    public void set(int x, int y, Tile tile) { tiles[y][x] = tile; }
    public boolean inBounds(int x, int y) { return x >= 0 && y >= 0 && x < width && y < height; }

    public List<Tile> neighbors(int x, int y) {
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        List<Tile> result = new ArrayList<>();
        for (int[] d : dirs) {
            int nx = x + d[0];
            int ny = y + d[1];
            if (inBounds(nx, ny)) result.add(get(nx, ny));
        }
        return result;
    }
}

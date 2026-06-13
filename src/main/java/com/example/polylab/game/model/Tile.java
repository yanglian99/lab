package com.example.polylab.game.model;

public class Tile {
    private final int x;
    private final int y;
    private TerrainType terrain;
    private ResourceType resource;
    private ImprovementType improvement;
    private boolean village;
    private Integer cityId;
    private Integer occupantUnitId;

    public Tile(int x, int y, TerrainType terrain, ResourceType resource) {
        this.x = x;
        this.y = y;
        this.terrain = terrain;
        this.resource = resource;
    }

    public int getX() { return x; }
    public int getY() { return y; }
    public TerrainType getTerrain() { return terrain; }
    public void setTerrain(TerrainType terrain) { this.terrain = terrain; }
    public ResourceType getResource() { return resource; }
    public void setResource(ResourceType resource) { this.resource = resource; }
    public ImprovementType getImprovement() { return improvement; }
    public void setImprovement(ImprovementType improvement) { this.improvement = improvement; }
    public boolean isVillage() { return village; }
    public void setVillage(boolean village) { this.village = village; }
    public Integer getCityId() { return cityId; }
    public void setCityId(Integer cityId) { this.cityId = cityId; }
    public Integer getOccupantUnitId() { return occupantUnitId; }
    public void setOccupantUnitId(Integer occupantUnitId) { this.occupantUnitId = occupantUnitId; }
}

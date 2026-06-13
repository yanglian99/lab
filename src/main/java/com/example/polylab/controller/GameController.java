package com.example.polylab.controller;

import com.example.polylab.game.model.GameState;
import com.example.polylab.game.model.TechType;
import com.example.polylab.game.model.UnitType;
import com.example.polylab.game.service.GameService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game")
public class GameController {
    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping("/new")
    public GameState newGame() {
        return gameService.createGame();
    }

    @GetMapping("/{id}")
    public GameState getGame(@PathVariable String id) {
        return gameService.getGame(id);
    }

    @PostMapping("/{id}/move")
    public GameState move(@PathVariable String id, @RequestBody MoveRequest request) {
        return gameService.move(id, request.unitId(), request.x(), request.y());
    }

    @PostMapping("/{id}/attack")
    public GameState attack(@PathVariable String id, @RequestBody AttackRequest request) {
        return gameService.attack(id, request.attackerId(), request.defenderId());
    }

    @PostMapping("/{id}/end-turn")
    public GameState endTurn(@PathVariable String id) {
        return gameService.endTurn(id);
    }

    @PostMapping("/{id}/research")
    public GameState research(@PathVariable String id, @RequestBody ResearchRequest request) {
        return gameService.research(id, TechType.valueOf(request.tech()));
    }

    @PostMapping("/{id}/build")
    public GameState build(@PathVariable String id, @RequestBody BuildRequest request) {
        return gameService.buildImprovement(id, request.x(), request.y());
    }

    @PostMapping("/{id}/recruit")
    public GameState recruit(@PathVariable String id, @RequestBody RecruitRequest request) {
        return gameService.recruit(id, request.cityId(), UnitType.valueOf(request.unitType()));
    }

    public record MoveRequest(int unitId, int x, int y) {}
    public record AttackRequest(int attackerId, int defenderId) {}
    public record ResearchRequest(String tech) {}
    public record BuildRequest(int x, int y) {}
    public record RecruitRequest(int cityId, String unitType) {}
}

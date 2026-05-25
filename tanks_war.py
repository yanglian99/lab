#!/usr/bin/env python3
"""Terminal Tanks War game for two players."""

from __future__ import annotations

import random

GRID_SIZE = 10
MAX_HEALTH = 3


class Tank:
    def __init__(self, name: str, symbol: str) -> None:
        self.name = name
        self.symbol = symbol
        self.health = MAX_HEALTH
        self.position = (0, 0)

    @property
    def alive(self) -> bool:
        return self.health > 0


def create_empty_grid(size: int) -> list[list[str]]:
    return [["." for _ in range(size)] for _ in range(size)]


def render_grid(size: int, tanks: list[Tank], reveal_enemy: bool = False) -> None:
    grid = create_empty_grid(size)
    for index, tank in enumerate(tanks):
        x, y = tank.position
        if reveal_enemy or index == 0:
            grid[y][x] = tank.symbol
        else:
            grid[y][x] = "?"

    print("\n   " + " ".join(str(i) for i in range(size)))
    for y, row in enumerate(grid):
        print(f"{y:2} " + " ".join(row))


def random_empty_position(occupied: set[tuple[int, int]], size: int) -> tuple[int, int]:
    while True:
        pos = (random.randint(0, size - 1), random.randint(0, size - 1))
        if pos not in occupied:
            return pos


def setup_tanks() -> list[Tank]:
    tank_a = Tank("Player 1", "A")
    tank_b = Tank("Player 2", "B")

    occupied: set[tuple[int, int]] = set()
    tank_a.position = random_empty_position(occupied, GRID_SIZE)
    occupied.add(tank_a.position)
    tank_b.position = random_empty_position(occupied, GRID_SIZE)

    return [tank_a, tank_b]


def parse_coordinates(text: str, size: int) -> tuple[int, int] | None:
    parts = text.strip().split()
    if len(parts) != 2:
        return None
    try:
        x, y = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= x < size and 0 <= y < size):
        return None
    return (x, y)


def fire(attacker: Tank, defender: Tank) -> bool:
    print(f"{attacker.name}, enter target coordinates as: x y")
    while True:
        guess = input("> ")
        target = parse_coordinates(guess, GRID_SIZE)
        if target is None:
            print("Invalid coordinates. Use two numbers between 0 and 9.")
            continue
        if target == defender.position:
            defender.health -= 1
            print(f"Hit! {defender.name} now has {defender.health} health.")
            return True
        print("Miss!")
        return False


def move_tank(tank: Tank) -> None:
    x, y = tank.position
    options = {
        "w": (x, y - 1),
        "s": (x, y + 1),
        "a": (x - 1, y),
        "d": (x + 1, y),
    }

    print(f"{tank.name}, choose move: w(up), s(down), a(left), d(right), or stay")
    command = input("> ").strip().lower()
    if command not in options:
        return

    nx, ny = options[command]
    if 0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE:
        tank.position = (nx, ny)


def game_loop() -> None:
    print("=== Tanks War ===")
    print("Destroy the enemy tank with 3 successful hits.")

    tanks = setup_tanks()

    turn = 0
    while tanks[0].alive and tanks[1].alive:
        attacker = tanks[turn % 2]
        defender = tanks[(turn + 1) % 2]

        print(f"\n--- {attacker.name}'s turn ---")
        render_grid(GRID_SIZE, [attacker, defender])
        move_tank(attacker)
        fire(attacker, defender)

        turn += 1

    winner = tanks[0] if tanks[0].alive else tanks[1]
    print(f"\n{winner.name} wins the war! 🎉")


if __name__ == "__main__":
    game_loop()

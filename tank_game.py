#!/usr/bin/env python3
"""Simple turn-based tank battle game with player-defined shot strategy."""

from __future__ import annotations

import random
from dataclasses import dataclass

BOARD_SIZE = 8
TANK_HEALTH = 3


@dataclass
class Tank:
    name: str
    x: int
    y: int
    health: int = TANK_HEALTH

    @property
    def alive(self) -> bool:
        return self.health > 0


def clamp(value: int, min_value: int, max_value: int) -> int:
    return max(min_value, min(max_value, value))


def parse_strategy(strategy_text: str) -> list[tuple[int, int]]:
    """Parse shots strategy like: A1,B2,H8."""
    shots: list[tuple[int, int]] = []
    for token in strategy_text.replace(" ", "").split(","):
        if not token:
            continue
        col = token[0].upper()
        row_text = token[1:]
        if col < "A" or col > chr(ord("A") + BOARD_SIZE - 1):
            raise ValueError(f"Invalid column '{col}' in '{token}'")
        if not row_text.isdigit():
            raise ValueError(f"Invalid row in '{token}'")
        row = int(row_text)
        if row < 1 or row > BOARD_SIZE:
            raise ValueError(f"Row out of range in '{token}'")
        x = ord(col) - ord("A")
        y = row - 1
        shots.append((x, y))
    if not shots:
        raise ValueError("Strategy must include at least one shot")
    return shots


def format_coord(x: int, y: int) -> str:
    return f"{chr(ord('A') + x)}{y + 1}"


def random_position(exclude: tuple[int, int] | None = None) -> tuple[int, int]:
    while True:
        x = random.randint(0, BOARD_SIZE - 1)
        y = random.randint(0, BOARD_SIZE - 1)
        if exclude is None or (x, y) != exclude:
            return x, y


def fire(attacker: Tank, defender: Tank, target: tuple[int, int]) -> bool:
    tx, ty = target
    print(f"{attacker.name} fires at {format_coord(tx, ty)}")
    if defender.x == tx and defender.y == ty:
        defender.health -= 1
        print(f"💥 Hit! {defender.name} health is now {defender.health}")
        if defender.alive:
            dx = random.choice([-1, 0, 1])
            dy = random.choice([-1, 0, 1])
            defender.x = clamp(defender.x + dx, 0, BOARD_SIZE - 1)
            defender.y = clamp(defender.y + dy, 0, BOARD_SIZE - 1)
            print(f"{defender.name} moved after being hit!")
        return True

    print("Miss.")
    return False


def enemy_shot(player: Tank) -> tuple[int, int]:
    # Enemy AI: 35% chance to shoot near player's last known area, otherwise random.
    if random.random() < 0.35:
        return (
            clamp(player.x + random.choice([-1, 0, 1]), 0, BOARD_SIZE - 1),
            clamp(player.y + random.choice([-1, 0, 1]), 0, BOARD_SIZE - 1),
        )
    return random_position()


def run_game() -> None:
    print("=== Tank Tactics ===")
    print("Board coordinates are A1 through H8.")
    strategy_text = input("Enter your shots strategy (example: A1,B3,C5,D2): ")

    try:
        strategy = parse_strategy(strategy_text)
    except ValueError as exc:
        print(f"Error: {exc}")
        return

    player = Tank("Player", *random_position())
    enemy = Tank("Enemy", *random_position(exclude=(player.x, player.y)))

    print("\nBattle started!")
    print("Each tank has 3 health. A hit causes damage and may force movement.")

    round_number = 0
    while player.alive and enemy.alive:
        shot = strategy[round_number % len(strategy)]
        print(f"\n--- Round {round_number + 1} ---")
        fire(player, enemy, shot)
        if not enemy.alive:
            break

        fire(enemy, player, enemy_shot(player))
        if not player.alive:
            break

        round_number += 1

    print("\n=== Result ===")
    if player.alive and not enemy.alive:
        print("🏆 You win! Your strategy destroyed the enemy tank.")
    elif enemy.alive and not player.alive:
        print("☠️ You lost. Try a different shot strategy.")
    else:
        print("It's a draw.")


if __name__ == "__main__":
    run_game()

# Tanks War

A small terminal game where two players control tanks and try to destroy each other.

## Run

```bash
python3 tanks_war.py
```

## Rules

- Grid size: 10x10.
- Each tank starts with 3 health.
- On each turn, a player can move (`w`, `a`, `s`, `d`) and then fire by entering target coordinates (`x y`).
- A successful hit removes 1 health from the enemy.
- First player to reduce enemy health to 0 wins.

"""
Simplified AlphaGo-style Go AI.

Includes:
- Small Go engine (captures, legal moves, passing, game over)
- Lightweight policy-value model (handcrafted features + tiny linear model)
- MCTS with PUCT using policy priors and value rollouts

This is intentionally compact and educational, not tournament strength.
"""
from __future__ import annotations

from dataclasses import dataclass
import math
import random
from typing import List, Optional, Tuple

Coord = Tuple[int, int]
Move = Optional[Coord]  # None means pass


class GoBoard:
    def __init__(self, size: int = 9):
        self.size = size
        self.grid = [[0 for _ in range(size)] for _ in range(size)]  # 0 empty, 1 black, -1 white
        self.to_play = 1
        self.passes = 0

    def clone(self) -> "GoBoard":
        b = GoBoard(self.size)
        b.grid = [row[:] for row in self.grid]
        b.to_play = self.to_play
        b.passes = self.passes
        return b

    def neighbors(self, r: int, c: int):
        if r > 0:
            yield (r - 1, c)
        if r < self.size - 1:
            yield (r + 1, c)
        if c > 0:
            yield (r, c - 1)
        if c < self.size - 1:
            yield (r, c + 1)

    def _group_and_liberties(self, r: int, c: int):
        color = self.grid[r][c]
        stack = [(r, c)]
        seen = set(stack)
        group = []
        libs = set()
        while stack:
            x, y = stack.pop()
            group.append((x, y))
            for nx, ny in self.neighbors(x, y):
                v = self.grid[nx][ny]
                if v == 0:
                    libs.add((nx, ny))
                elif v == color and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    stack.append((nx, ny))
        return group, libs

    def _remove_group(self, group):
        for r, c in group:
            self.grid[r][c] = 0

    def play(self, move: Move) -> bool:
        if move is None:
            self.passes += 1
            self.to_play *= -1
            return True

        r, c = move
        if not (0 <= r < self.size and 0 <= c < self.size):
            return False
        if self.grid[r][c] != 0:
            return False

        self.grid[r][c] = self.to_play
        self.passes = 0
        enemy = -self.to_play

        # Capture neighboring enemy groups with no liberties
        captured_any = False
        for nr, nc in list(self.neighbors(r, c)):
            if self.grid[nr][nc] == enemy:
                g, libs = self._group_and_liberties(nr, nc)
                if not libs:
                    self._remove_group(g)
                    captured_any = True

        # Suicide check
        g, libs = self._group_and_liberties(r, c)
        if not libs and not captured_any:
            self.grid[r][c] = 0
            return False

        self.to_play *= -1
        return True

    def legal_moves(self) -> List[Move]:
        moves: List[Move] = []
        for r in range(self.size):
            for c in range(self.size):
                if self.grid[r][c] != 0:
                    continue
                test = self.clone()
                if test.play((r, c)):
                    moves.append((r, c))
        moves.append(None)
        return moves

    def game_over(self) -> bool:
        return self.passes >= 2

    def score_simple(self) -> int:
        # area-like quick score: stones + empty intersections closest by adjacency flood
        black = sum(1 for r in range(self.size) for c in range(self.size) if self.grid[r][c] == 1)
        white = sum(1 for r in range(self.size) for c in range(self.size) if self.grid[r][c] == -1)
        return black - white


class PolicyValueModel:
    """Tiny handcrafted policy+value model.

    In real AlphaGo this is a deep net; here we use heuristics to emulate behavior.
    """

    def __init__(self, seed: int = 0):
        random.seed(seed)

    def evaluate(self, board: GoBoard) -> Tuple[dict, float]:
        legal = board.legal_moves()
        priors = {}
        for m in legal:
            priors[m] = self._policy_score(board, m)

        total = sum(max(v, 1e-6) for v in priors.values())
        for m in priors:
            priors[m] = max(priors[m], 1e-6) / total

        value = self._value_score(board)
        return priors, value

    def _policy_score(self, board: GoBoard, move: Move) -> float:
        if move is None:
            return 0.02
        r, c = move
        center = (board.size - 1) / 2
        dist_center = abs(r - center) + abs(c - center)
        score = 1.0 / (1.0 + 0.2 * dist_center)

        # Prefer moves adjacent to stones (fights/connections)
        adj = 0
        cap_bonus = 0
        for nr, nc in board.neighbors(r, c):
            v = board.grid[nr][nc]
            if v != 0:
                adj += 1
            if v == -board.to_play:
                g, libs = board._group_and_liberties(nr, nc)
                if len(libs) == 1 and (r, c) in libs:
                    cap_bonus += len(g)
        score += 0.2 * adj + 0.5 * cap_bonus
        return max(0.01, score)

    def _value_score(self, board: GoBoard) -> float:
        diff = board.score_simple() * board.to_play
        # squashed to [-1, 1]
        return math.tanh(diff / (board.size * board.size * 0.2))


@dataclass
class Edge:
    prior: float
    visit_count: int = 0
    value_sum: float = 0.0
    child: Optional["Node"] = None

    @property
    def q(self) -> float:
        return self.value_sum / self.visit_count if self.visit_count else 0.0


class Node:
    def __init__(self, board: GoBoard):
        self.board = board
        self.edges: dict[Move, Edge] = {}
        self.expanded = False


class MCTS:
    def __init__(self, model: PolicyValueModel, c_puct: float = 1.5):
        self.model = model
        self.c_puct = c_puct

    def search(self, root_board: GoBoard, simulations: int = 200) -> Move:
        root = Node(root_board.clone())
        self._expand(root)

        for _ in range(simulations):
            self._simulate(root)

        # choose move by visit count
        best_move, _ = max(root.edges.items(), key=lambda kv: kv[1].visit_count)
        return best_move

    def _expand(self, node: Node) -> float:
        if node.board.game_over():
            s = node.board.score_simple()
            if s == 0:
                return 0.0
            winner = 1 if s > 0 else -1
            return 1.0 if winner == node.board.to_play else -1.0

        priors, value = self.model.evaluate(node.board)
        node.edges = {m: Edge(p) for m, p in priors.items()}
        node.expanded = True
        return value

    def _simulate(self, root: Node):
        path = []
        node = root

        while node.expanded and node.edges:
            move, edge = self._select(node)
            path.append(edge)
            if edge.child is None:
                b = node.board.clone()
                ok = b.play(move)
                if not ok:
                    edge.prior = 1e-6
                    return
                edge.child = Node(b)
            node = edge.child

        value = self._expand(node)

        # backup with perspective flips each ply
        for edge in reversed(path):
            edge.visit_count += 1
            edge.value_sum += value
            value = -value

    def _select(self, node: Node):
        total_visits = sum(e.visit_count for e in node.edges.values()) + 1

        def ucb(item):
            _, e = item
            u = self.c_puct * e.prior * math.sqrt(total_visits) / (1 + e.visit_count)
            return e.q + u

        return max(node.edges.items(), key=ucb)


def play_demo(size: int = 7, sims: int = 100, max_turns: int = 80):
    board = GoBoard(size=size)
    model = PolicyValueModel(seed=42)
    ai = MCTS(model)

    for _ in range(max_turns):
        if board.game_over():
            break
        move = ai.search(board, simulations=sims)
        board.play(move)

    score = board.score_simple()
    if score > 0:
        result = "Black wins"
    elif score < 0:
        result = "White wins"
    else:
        result = "Draw"
    print(f"Result: {result}, score={score}")


if __name__ == "__main__":
    play_demo()

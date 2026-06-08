export const TILE = {
  EMPTY: 0,
  WALL: 1,
  CORE: 2,
  EXIT: 3,
};

export const DIRECTIONS = {
  up: { x: 0, y: -1, label: 'up' },
  down: { x: 0, y: 1, label: 'down' },
  left: { x: -1, y: 0, label: 'left' },
  right: { x: 1, y: 0, label: 'right' },
};

export const LEVEL = [
  [0, 0, 0, 1, 0, 0, 2, 3],
  [0, 1, 0, 1, 0, 1, 1, 0],
  [0, 1, 2, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 2, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
];

export const initialState = () => ({
  status: 'ready',
  player: { x: 0, y: 7 },
  sentinel: { x: 7, y: 0 },
  collected: new Set(),
  score: 0,
  turns: 0,
  message: 'Collect all data cores, then reach the exit.',
});

export function cloneLevel(level = LEVEL) {
  return level.map((row) => [...row]);
}

export function positionKey(position) {
  return `${position.x},${position.y}`;
}

export function inBounds(position, level = LEVEL) {
  return position.y >= 0 && position.y < level.length && position.x >= 0 && position.x < level[0].length;
}

export function isWalkable(position, level = LEVEL) {
  return inBounds(position, level) && level[position.y][position.x] !== TILE.WALL;
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getCorePositions(level = LEVEL) {
  const cores = [];
  level.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile === TILE.CORE) cores.push({ x, y });
    });
  });
  return cores;
}

export function getExitPosition(level = LEVEL) {
  for (let y = 0; y < level.length; y += 1) {
    for (let x = 0; x < level[y].length; x += 1) {
      if (level[y][x] === TILE.EXIT) return { x, y };
    }
  }
  return null;
}

export function getLegalMoves(position, level = LEVEL) {
  return Object.values(DIRECTIONS)
    .map((direction) => ({
      direction: direction.label,
      position: { x: position.x + direction.x, y: position.y + direction.y },
    }))
    .filter((move) => isWalkable(move.position, level));
}

function nearestTargetDistance(position, targets) {
  if (!targets.length) return 0;
  return Math.min(...targets.map((target) => manhattan(position, target)));
}

export function scoreMoves(state, level = LEVEL) {
  const cores = getCorePositions(level).filter((core) => !state.collected.has(positionKey(core)));
  const exit = getExitPosition(level);
  const targets = cores.length ? cores : [exit];
  const moves = getLegalMoves(state.player, level);

  return moves
    .map((move) => {
      const tile = level[move.position.y][move.position.x];
      const distanceToGoal = nearestTargetDistance(move.position, targets);
      const sentinelDistance = manhattan(move.position, state.sentinel);
      const coreBonus = tile === TILE.CORE && !state.collected.has(positionKey(move.position)) ? 35 : 0;
      const exitBonus = tile === TILE.EXIT && cores.length === 0 ? 60 : 0;
      const dangerPenalty = sentinelDistance <= 1 ? 80 : sentinelDistance === 2 ? 30 : 0;
      const wallEscapeBonus = getLegalMoves(move.position, level).length * 3;
      const score = 100 - distanceToGoal * 12 + sentinelDistance * 5 + coreBonus + exitBonus + wallEscapeBonus - dangerPenalty;

      return { ...move, score, distanceToGoal, sentinelDistance };
    })
    .sort((a, b) => b.score - a.score);
}

export function getCompanionHint(state, level = LEVEL) {
  if (state.status === 'won') return 'Vault secured. Great route planning.';
  if (state.status === 'lost') return 'The firewall caught you. Restart and keep at least two tiles of distance.';

  const [best] = scoreMoves(state, level);
  if (!best) return 'No safe route detected. Restart the breach.';

  const urgency = best.sentinelDistance <= 2 ? 'Danger is close' : 'Route is stable';
  const target = getCorePositions(level).some((core) => !state.collected.has(positionKey(core))) ? 'next data core' : 'exit gate';
  return `${urgency}. Recommended move: ${best.direction.toUpperCase()} toward the ${target} (confidence ${Math.max(1, Math.round(best.score))}).`;
}

export function moveSentinel(state, level = LEVEL) {
  const legalMoves = getLegalMoves(state.sentinel, level);
  if (!legalMoves.length) return state.sentinel;

  return legalMoves
    .map((move) => ({ ...move, distance: manhattan(move.position, state.player) }))
    .sort((a, b) => a.distance - b.distance || a.direction.localeCompare(b.direction))[0].position;
}

export function applyMove(state, directionName, level = LEVEL) {
  if (state.status !== 'playing') return state;

  const direction = DIRECTIONS[directionName];
  if (!direction) return { ...state, message: 'Unknown input.' };

  const nextPlayer = { x: state.player.x + direction.x, y: state.player.y + direction.y };
  if (!isWalkable(nextPlayer, level)) {
    return { ...state, score: Math.max(0, state.score - 2), message: 'Blocked by an encrypted wall.' };
  }

  const collected = new Set(state.collected);
  const tile = level[nextPlayer.y][nextPlayer.x];
  let score = Math.max(0, state.score - 1);
  let message = 'Keep moving.';

  if (tile === TILE.CORE && !collected.has(positionKey(nextPlayer))) {
    collected.add(positionKey(nextPlayer));
    score += 50;
    message = 'Data core recovered.';
  }

  let nextState = {
    ...state,
    player: nextPlayer,
    collected,
    score,
    turns: state.turns + 1,
    message,
  };

  if (positionKey(nextPlayer) === positionKey(state.sentinel)) {
    return { ...nextState, status: 'lost', message: 'The sentinel firewall intercepted you.' };
  }

  const exit = getExitPosition(level);
  if (tile === TILE.EXIT && collected.size === getCorePositions(level).length) {
    return { ...nextState, status: 'won', score: score + 100, message: 'You escaped with every data core.' };
  }

  const sentinel = moveSentinel(nextState, level);
  nextState = { ...nextState, sentinel };

  if (positionKey(sentinel) === positionKey(nextPlayer)) {
    return { ...nextState, status: 'lost', message: 'The sentinel firewall caught your trail.' };
  }

  if (exit && tile === TILE.EXIT) {
    nextState.message = 'The exit needs all three data cores first.';
  }

  return nextState;
}

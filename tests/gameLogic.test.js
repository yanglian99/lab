import assert from 'node:assert/strict';
import {
  LEVEL,
  applyMove,
  getCompanionHint,
  getLegalMoves,
  initialState,
  isWalkable,
  scoreMoves,
} from '../src/gameLogic.js';

function playingState(overrides = {}) {
  return { ...initialState(), status: 'playing', ...overrides };
}

const start = initialState();
assert.equal(start.player.x, 0);
assert.equal(start.player.y, 7);
assert.equal(start.status, 'ready');

assert.equal(isWalkable({ x: 3, y: 7 }, LEVEL), false, 'walls are not walkable');
assert.equal(isWalkable({ x: 0, y: 6 }, LEVEL), true, 'floor is walkable');

const legalMoves = getLegalMoves(start.player, LEVEL).map((move) => move.direction).sort();
assert.deepEqual(legalMoves, ['right', 'up'], 'starting tile has two legal moves');

const scored = scoreMoves(playingState(), LEVEL);
assert.ok(scored.length > 0, 'companion scores legal moves');
assert.ok(scored[0].score >= scored.at(-1).score, 'scores are sorted best first');
assert.match(getCompanionHint(playingState(), LEVEL), /Recommended move:/);

const blocked = playingState({ player: { x: 2, y: 7 }, sentinel: { x: 7, y: 7 } });
const afterBlocked = applyMove(blocked, 'right', LEVEL);
assert.equal(afterBlocked.player.x, 2, 'blocked wall input does not move through walls');
assert.equal(afterBlocked.score, Math.max(0, blocked.score - 2), 'wall bumps cost score');

let collecting = playingState({ player: { x: 1, y: 2 }, sentinel: { x: 7, y: 7 } });
collecting = applyMove(collecting, 'right', LEVEL);
assert.equal(collecting.collected.size, 1, 'moving onto a data core collects it');
assert.ok(collecting.score >= 49, 'data core awards points after turn cost');

const allCores = new Set(['2,2', '6,6', '6,0']);
const winning = applyMove(playingState({ player: { x: 6, y: 0 }, sentinel: { x: 0, y: 7 }, collected: allCores }), 'right', LEVEL);
assert.equal(winning.status, 'won', 'exit wins after all cores are collected');

const losing = applyMove(playingState({ player: { x: 6, y: 0 }, sentinel: { x: 7, y: 0 } }), 'right', LEVEL);
assert.equal(losing.status, 'lost', 'moving into sentinel loses the round');

console.log('All game logic tests passed.');

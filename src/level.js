import { TILE, TILE_SIZE } from './constants.js';
import { Goomba, Mushroom } from './entities.js';
import { levelData } from './levelData.js';

const cloneArea = (area) => ({
  ...area,
  tiles: area.tiles.map((row) => [...row]),
  pipes: area.pipes.map((pipe) => ({ ...pipe, exit: pipe.exit ? { ...pipe.exit } : null })),
  questionBlocks: area.questionBlocks.map((block) => ({ ...block })),
  hiddenBlocks: area.hiddenBlocks.map((block) => ({ ...block })),
  coins: area.coins.map((coin) => ({ ...coin, collected: false })),
  enemies: area.enemies.map((enemy) => ({ ...enemy })),
});

export class LevelManager {
  constructor() {
    this.areas = {
      overworld: cloneArea(levelData.overworld),
      bonus: cloneArea(levelData.bonus),
    };
    this.currentArea = 'overworld';
    this.loadAreaEntities();
  }

  get area() {
    return this.areas[this.currentArea];
  }

  loadAreaEntities() {
    Object.values(this.areas).forEach((area) => {
      area.enemyEntities = area.enemies.map((enemy) => new Goomba(enemy.x, enemy.y));
      area.items = [];
    });
  }

  switchArea(name) {
    this.currentArea = name;
    return this.area.start;
  }

  tileAt(tx, ty) {
    if (ty < 0 || ty >= this.area.height || tx < 0 || tx >= this.area.width) return TILE.EMPTY;
    return this.area.tiles[ty][tx];
  }

  findQuestionBlock(tx, ty) {
    return this.area.questionBlocks.find((block) => block.x === tx && block.y === ty && !block.used);
  }

  findHiddenBlock(tx, ty) {
    return this.area.hiddenBlocks.find((block) => block.x === tx && block.y === ty && !block.used);
  }

  isHiddenBlockSolid(tx, ty) {
    const block = this.area.hiddenBlocks.find((entry) => entry.x === tx && entry.y === ty);
    return Boolean(block?.discovered && !block.used);
  }

  isSolid(tx, ty) {
    return [
      TILE.GROUND,
      TILE.BRICK,
      TILE.QUESTION,
      TILE.USED,
      TILE.PIPE_TOP_LEFT,
      TILE.PIPE_TOP_RIGHT,
      TILE.PIPE_BODY_LEFT,
      TILE.PIPE_BODY_RIGHT,
      TILE.CASTLE,
      TILE.STAIR,
      TILE.HIDDEN_1UP,
    ].includes(this.tileAt(tx, ty)) || this.isHiddenBlockSolid(tx, ty);
  }

  getPipeAt(tx, ty) {
    return this.area.pipes.find((pipe) => tx >= pipe.x && tx < pipe.x + pipe.width && ty >= pipe.y && ty < pipe.y + pipe.height);
  }

  findCoinAt(tx, ty) {
    return this.area.coins.find((coin) => !coin.collected && coin.x === tx && coin.y === ty);
  }

  collectCoin(tx, ty) {
    const coin = this.findCoinAt(tx, ty);
    if (coin) {
      coin.collected = true;
      return true;
    }
    return false;
  }

  activateBlock(tx, ty, playerState = 'small') {
    const question = this.findQuestionBlock(tx, ty);
    if (question) {
      question.used = true;
      this.area.tiles[ty][tx] = TILE.USED;
      if (question.contains === 'mushroom') {
        this.area.items.push(new Mushroom(tx, ty));
        return { type: 'mushroom' };
      }
      return { type: question.contains };
    }

    const hidden = this.findHiddenBlock(tx, ty);
    if (hidden) {
      hidden.discovered = true;
      this.area.tiles[ty][tx] = TILE.USED;
      hidden.used = true;
      return { type: hidden.contains };
    }

    if (this.tileAt(tx, ty) === TILE.BRICK) {
      if (playerState === 'big') {
        this.area.tiles[ty][tx] = TILE.EMPTY;
        return { type: 'brick-break' };
      }
      return { type: 'brick-bump' };
    }

    return null;
  }

  worldToTile(value) {
    return Math.floor(value / TILE_SIZE);
  }
}

import { ENEMY, GRAVITY, ITEM, PLAYER, TILE_SIZE } from './constants.js';

export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.remove = false;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }
}

export class Player extends Entity {
  constructor(spawnX, spawnY) {
    super(spawnX, spawnY, PLAYER.small.width, PLAYER.small.height);
    this.facing = 1;
    this.state = 'small';
    this.mode = 'alive';
    this.jumpCut = false;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.invulnerableTimer = 0;
  }

  getDimensions() {
    return PLAYER[this.state];
  }

  becomeBig() {
    if (this.state === 'big') return;
    const previousBottom = this.bottom;
    this.state = 'big';
    this.width = PLAYER.big.width;
    this.height = PLAYER.big.height;
    this.y = previousBottom - this.height;
  }

  shrink() {
    if (this.state === 'small') {
      this.mode = 'dead';
      return;
    }
    const previousBottom = this.bottom;
    this.state = 'small';
    this.width = PLAYER.small.width;
    this.height = PLAYER.small.height;
    this.y = previousBottom - this.height;
    this.invulnerableTimer = 1.5;
  }
}

export class Goomba extends Entity {
  constructor(tileX, tileY) {
    const width = ENEMY.goomba.width;
    const height = ENEMY.goomba.height;
    super(tileX * TILE_SIZE + (TILE_SIZE - width) / 2, tileY * TILE_SIZE + (TILE_SIZE - height), width, height);
    this.type = 'goomba';
    this.vx = -ENEMY.goomba.speed;
    this.flattenedTimer = 0;
    this.dead = false;
  }

  update(dt) {
    if (this.dead) {
      this.flattenedTimer -= dt;
      if (this.flattenedTimer <= 0) {
        this.remove = true;
      }
      return;
    }
    this.vy = Math.min(this.vy + GRAVITY * dt, 900);
  }

  stomp() {
    this.dead = true;
    this.vx = 0;
    this.vy = 0;
    this.flattenedTimer = 0.45;
    this.height = 16;
  }
}

export class Mushroom extends Entity {
  constructor(tileX, tileY) {
    const width = ITEM.mushroom.width;
    const height = ITEM.mushroom.height;
    super(tileX * TILE_SIZE + (TILE_SIZE - width) / 2, tileY * TILE_SIZE + (TILE_SIZE - height), width, height);
    this.type = 'mushroom';
    this.vx = ITEM.mushroom.speed;
    this.spawnTimer = 0.35;
    this.initialY = this.y + height;
    this.y = this.initialY;
  }

  update(dt) {
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      const progress = 1 - Math.max(this.spawnTimer, 0) / 0.35;
      this.y = this.initialY - this.height * progress;
      return;
    }
    this.vy = Math.min(this.vy + GRAVITY * dt, 900);
  }
}

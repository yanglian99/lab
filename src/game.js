import { AudioManager } from './audio.js';
import { GRAVITY, PLAYER, TILE_SIZE, VIEWPORT_HEIGHT, VIEWPORT_WIDTH, LEVEL_TIME } from './constants.js';
import { Player } from './entities.js';
import { LevelManager } from './level.js';

const aabb = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export class Game {
  constructor(input) {
    this.input = input;
    this.audio = new AudioManager();
    this.reset();
  }

  reset(savedStats = null) {
    this.level = new LevelManager();
    const spawn = this.level.area.start;
    this.player = new Player(spawn.x * TILE_SIZE + 9, spawn.y * TILE_SIZE + 6);
    if (savedStats) {
      this.player.score = savedStats.score;
      this.player.coins = savedStats.coins;
      this.player.lives = savedStats.lives;
    }
    this.cameraX = 0;
    this.timer = LEVEL_TIME;
    this.gameState = 'running';
    this.message = '';
    this.victoryWalk = false;
    this.respawnTimer = 0;
  }

  update(dt) {
    if (this.gameState === 'respawning') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.reset(this.savedStats);
      }
      return;
    }

    if (this.gameState !== 'running') {
      if (this.input.wasPressed('KeyR')) {
        this.reset();
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.killPlayer();
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateItems(dt);
    this.collectCoins();
    this.handlePipeEntry();
    this.checkGoal();
    this.updateCamera();
  }

  updatePlayer(dt) {
    const player = this.player;
    if (player.invulnerableTimer > 0) {
      player.invulnerableTimer -= dt;
    }

    let move = 0;
    if (!this.victoryWalk) {
      if (this.input.isDown('ArrowLeft', 'KeyA')) move -= 1;
      if (this.input.isDown('ArrowRight', 'KeyD')) move += 1;
    } else {
      move = 1;
    }

    const accel = player.onGround ? PLAYER.runAcceleration : PLAYER.airAcceleration;
    player.vx += move * accel * dt;
    if (move === 0) {
      const friction = PLAYER.friction * dt;
      if (Math.abs(player.vx) <= friction) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * friction;
    }
    player.vx = Math.max(-PLAYER.maxRunSpeed, Math.min(PLAYER.maxRunSpeed, player.vx));

    if (!this.victoryWalk && player.onGround && this.input.wasPressed('Space', 'ArrowUp', 'KeyW')) {
      player.vy = PLAYER.jumpVelocity;
      player.onGround = false;
      this.audio.play('jump');
    }

    if (!this.input.isDown('Space', 'ArrowUp', 'KeyW') && player.vy < -200) {
      player.vy += 1600 * dt;
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, PLAYER.maxFallSpeed);

    this.moveHorizontal(player, dt);
    this.moveVertical(player, dt);

    if (player.y > VIEWPORT_HEIGHT + 200) {
      this.killPlayer();
    }
  }

  moveHorizontal(entity, dt) {
    entity.x += entity.vx * dt;
    const left = Math.floor(entity.left / TILE_SIZE);
    const right = Math.floor((entity.right - 1) / TILE_SIZE);
    const top = Math.floor(entity.top / TILE_SIZE);
    const bottom = Math.floor((entity.bottom - 1) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (const tx of [left, right]) {
        if (!this.level.isSolid(tx, ty)) continue;
        const tileLeft = tx * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;
        if (entity.vx > 0) {
          entity.x = tileLeft - entity.width;
        } else if (entity.vx < 0) {
          entity.x = tileRight;
        }
        entity.vx = 0;
      }
    }
  }

  moveVertical(entity, dt) {
    entity.y += entity.vy * dt;
    entity.onGround = false;
    const left = Math.floor(entity.left / TILE_SIZE);
    const right = Math.floor((entity.right - 1) / TILE_SIZE);
    const top = Math.floor(entity.top / TILE_SIZE);
    const bottom = Math.floor((entity.bottom - 1) / TILE_SIZE);

    for (let tx = left; tx <= right; tx += 1) {
      for (const ty of [top, bottom]) {
        const playerHeadHit = entity === this.player && entity.vy < 0;
        const hiddenBlockHit = playerHeadHit && Boolean(this.level.findHiddenBlock(tx, ty));
        if (!this.level.isSolid(tx, ty) && !hiddenBlockHit) continue;

        const tileTop = ty * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;
        if (entity.vy > 0) {
          entity.y = tileTop - entity.height;
          entity.vy = 0;
          entity.onGround = true;
        } else if (entity.vy < 0) {
          entity.y = tileBottom;
          entity.vy = 0;
          const result = this.level.activateBlock(tx, ty, this.player.state);
          if (entity === this.player && result) {
            this.handleBlockReward(result.type);
          }
        }
      }
    }
  }

  handleBlockReward(type) {
    if (type === 'coin') {
      this.player.score += 200;
      this.player.coins += 1;
      this.audio.play('coin');
    } else if (type === '1up') {
      this.player.lives += 1;
      this.player.score += 1000;
    } else if (type === 'mushroom') {
      this.player.score += 250;
      this.audio.play('powerup');
    } else if (type === 'brick-break') {
      this.player.score += 50;
    } else if (type === 'brick-bump') {
      this.player.score += 10;
    }
    if (this.player.coins >= 100) {
      this.player.coins -= 100;
      this.player.lives += 1;
    }
  }

  updateEnemies(dt) {
    this.level.area.enemyEntities.forEach((enemy) => {
      if (enemy.remove) return;
      enemy.update(dt);
      if (enemy.dead) return;
      enemy.x += enemy.vx * dt;
      const frontTx = enemy.vx > 0 ? Math.floor(enemy.right / TILE_SIZE) : Math.floor((enemy.left - 1) / TILE_SIZE);
      const topTy = Math.floor(enemy.top / TILE_SIZE);
      const bottomTy = Math.floor((enemy.bottom - 1) / TILE_SIZE);
      let hitWall = false;
      for (let ty = topTy; ty <= bottomTy; ty += 1) {
        if (this.level.isSolid(frontTx, ty)) hitWall = true;
      }
      const footX = enemy.vx > 0 ? enemy.right + 2 : enemy.left - 2;
      const groundTx = Math.floor(footX / TILE_SIZE);
      const groundTy = Math.floor(enemy.bottom / TILE_SIZE);
      if (hitWall || !this.level.isSolid(groundTx, groundTy)) {
        enemy.x -= enemy.vx * dt;
        enemy.vx *= -1;
      }
      this.moveVertical(enemy, dt);

      if (aabb(this.player, enemy)) {
        const stomp = this.player.vy > 0 && this.player.bottom - enemy.top < 24;
        if (stomp && !enemy.dead) {
          enemy.stomp();
          this.player.vy = -420;
          this.player.score += 100;
        } else if (this.player.invulnerableTimer <= 0) {
          this.player.shrink();
          if (this.player.mode === 'dead') {
            this.killPlayer();
          }
        }
      }
    });
    this.level.area.enemyEntities = this.level.area.enemyEntities.filter((enemy) => !enemy.remove);
  }

  updateItems(dt) {
    this.level.area.items.forEach((item) => {
      if (item.remove) return;
      item.update(dt);
      if (item.spawnTimer > 0) return;
      item.x += item.vx * dt;
      const frontTx = item.vx > 0 ? Math.floor(item.right / TILE_SIZE) : Math.floor((item.left - 1) / TILE_SIZE);
      const topTy = Math.floor(item.top / TILE_SIZE);
      const bottomTy = Math.floor((item.bottom - 1) / TILE_SIZE);
      for (let ty = topTy; ty <= bottomTy; ty += 1) {
        if (this.level.isSolid(frontTx, ty)) {
          item.x -= item.vx * dt;
          item.vx *= -1;
          break;
        }
      }
      this.moveVertical(item, dt);
      if (aabb(this.player, item)) {
        if (item.type === 'mushroom') {
          this.player.becomeBig();
          this.player.score += 1000;
          this.audio.play('powerup');
        }
        item.remove = true;
      }
    });
    this.level.area.items = this.level.area.items.filter((item) => !item.remove);
  }

  collectCoins() {
    const left = Math.floor(this.player.left / TILE_SIZE);
    const right = Math.floor((this.player.right - 1) / TILE_SIZE);
    const top = Math.floor(this.player.top / TILE_SIZE);
    const bottom = Math.floor((this.player.bottom - 1) / TILE_SIZE);
    for (let tx = left; tx <= right; tx += 1) {
      for (let ty = top; ty <= bottom; ty += 1) {
        if (this.level.collectCoin(tx, ty)) {
          this.player.score += 100;
          this.player.coins += 1;
          this.audio.play('coin');
        }
      }
    }
    if (this.player.coins >= 100) {
      this.player.coins -= 100;
      this.player.lives += 1;
    }
  }

  handlePipeEntry() {
    if (!this.player.onGround || !this.input.isDown('ArrowDown', 'KeyS')) return;
    const centerTx = Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE);
    const feetTy = Math.floor((this.player.bottom - 4) / TILE_SIZE);
    const pipe = this.level.getPipeAt(centerTx, feetTy);
    if (pipe?.enterable && pipe.exit) {
      this.level.switchArea(pipe.exit.area);
      this.player.x = pipe.exit.x * TILE_SIZE + 9;
      this.player.y = pipe.exit.y * TILE_SIZE + 6;
      this.player.vx = 0;
      this.player.vy = 0;
      this.cameraX = 0;
    }
  }

  checkGoal() {
    const finishWorldX = this.level.area.finishX * TILE_SIZE;
    if (this.level.currentArea === 'overworld' && this.player.x >= finishWorldX) {
      this.victoryWalk = true;
      if (this.player.onGround && this.player.x > finishWorldX + TILE_SIZE) {
        this.gameState = 'won';
        this.message = 'Course Clear!';
      }
    }
  }

  updateCamera() {
    const areaWidthPx = this.level.area.width * TILE_SIZE;
    this.cameraX = Math.max(0, Math.min(areaWidthPx - VIEWPORT_WIDTH, this.player.x - VIEWPORT_WIDTH * 0.35));
  }

  killPlayer() {
    if (this.gameState !== 'running') return;
    this.player.mode = 'dead';
    this.player.lives -= 1;
    if (this.player.lives > 0) {
      this.savedStats = {
        score: this.player.score,
        coins: this.player.coins,
        lives: this.player.lives,
      };
      this.gameState = 'respawning';
      this.message = 'Life Lost';
      this.respawnTimer = 1.1;
      return;
    }
    this.gameState = 'lost';
    this.message = 'Game Over';
  }
}

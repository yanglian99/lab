import { COLORS, TILE, TILE_SIZE, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(game) {
    const { ctx } = this;
    const { cameraX, player, level, timer, gameState, message } = game;
    const area = level.area;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = area.background === 'underground' ? '#111827' : COLORS.sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawParallax(area.background, cameraX);
    this.drawTiles(area, cameraX);
    this.drawCoins(area, cameraX);
    this.drawItems(area, cameraX);
    this.drawEnemies(area, cameraX);
    this.drawPlayer(player, cameraX);
    this.drawHud(player, timer, area.name);

    if (gameState !== 'running') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 42px Arial';
      ctx.fillText(message, VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 - 20);
      ctx.font = '24px Arial';
      ctx.fillText('Press R to restart', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 + 30);
      ctx.textAlign = 'left';
    }
  }

  drawParallax(background, cameraX) {
    const { ctx } = this;
    if (background === 'overworld') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i += 1) {
        const x = ((i * 220 - cameraX * 0.25) % 1320) - 80;
        ctx.beginPath();
        ctx.arc(x + 40, 90, 28, Math.PI, 0);
        ctx.arc(x + 70, 90, 22, Math.PI, 0);
        ctx.arc(x + 10, 90, 18, Math.PI, 0);
        ctx.fill();
      }
    }
  }

  drawTiles(area, cameraX) {
    const { ctx } = this;
    for (let y = 0; y < area.height; y += 1) {
      for (let x = 0; x < area.width; x += 1) {
        const tile = area.tiles[y][x];
        if (tile === TILE.EMPTY) continue;
        const screenX = x * TILE_SIZE - cameraX;
        if (screenX < -TILE_SIZE || screenX > VIEWPORT_WIDTH) continue;
        const screenY = y * TILE_SIZE;

        switch (tile) {
          case TILE.GROUND:
            ctx.fillStyle = COLORS.ground;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = COLORS.dirt;
            ctx.fillRect(screenX + 4, screenY + 24, TILE_SIZE - 8, 20);
            break;
          case TILE.BRICK:
            ctx.fillStyle = COLORS.brick;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#6b2f00';
            ctx.strokeRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;
          case TILE.QUESTION:
            ctx.fillStyle = COLORS.question;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#8a5a00';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('?', screenX + 15, screenY + 32);
            break;
          case TILE.USED:
            ctx.fillStyle = '#caa472';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            break;
          case TILE.PIPE_TOP_LEFT:
          case TILE.PIPE_TOP_RIGHT:
          case TILE.PIPE_BODY_LEFT:
          case TILE.PIPE_BODY_RIGHT:
            ctx.fillStyle = tile === TILE.PIPE_TOP_LEFT || tile === TILE.PIPE_TOP_RIGHT ? '#22c55e' : COLORS.pipe;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = COLORS.pipeDark;
            ctx.fillRect(screenX + 6, screenY + 4, 10, TILE_SIZE - 8);
            break;
          case TILE.FLAGPOLE:
            ctx.fillStyle = '#d1d5db';
            ctx.fillRect(screenX + 20, screenY, 8, TILE_SIZE);
            if (y === 2) {
              ctx.fillStyle = COLORS.flag;
              ctx.fillRect(screenX - 12, screenY + 6, 28, 18);
            }
            break;
          case TILE.CASTLE:
            ctx.fillStyle = COLORS.castle;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            break;
          case TILE.STAIR:
            ctx.fillStyle = COLORS.stair;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            break;
          default:
            break;
        }
      }
    }
  }

  drawCoins(area, cameraX) {
    const { ctx } = this;
    area.coins.filter((coin) => !coin.collected).forEach((coin) => {
      const x = coin.x * TILE_SIZE + TILE_SIZE / 2 - cameraX;
      const y = coin.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawPlayer(player, cameraX) {
    const { ctx } = this;
    if (player.mode === 'dead') return;
    const x = player.x - cameraX;
    ctx.fillStyle = player.state === 'big' ? '#ef4444' : '#dc2626';
    ctx.fillRect(x + 6, player.y + 10, player.width - 12, player.height - 10);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x + 4, player.y, player.width - 8, 14);
    ctx.fillStyle = '#f5cfa0';
    ctx.fillRect(x + 7, player.y + 14, player.width - 14, 16);
  }

  drawEnemies(area, cameraX) {
    const { ctx } = this;
    area.enemyEntities.forEach((enemy) => {
      if (enemy.remove) return;
      const x = enemy.x - cameraX;
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x, enemy.y + (enemy.dead ? 18 : 0), enemy.width, enemy.height);
      if (!enemy.dead) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 7, enemy.y + 10, 6, 6);
        ctx.fillRect(x + 21, enemy.y + 10, 6, 6);
      }
    });
  }

  drawItems(area, cameraX) {
    const { ctx } = this;
    area.items.forEach((item) => {
      if (item.remove) return;
      const x = item.x - cameraX;
      ctx.fillStyle = item.type === 'mushroom' ? '#ef4444' : '#22c55e';
      ctx.fillRect(x, item.y, item.width, item.height);
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(x + 4, item.y + 10, item.width - 8, 10);
    });
  }

  drawHud(player, timer, areaName) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`MARIO ${String(player.score).padStart(6, '0')}`, 24, 36);
    ctx.fillText(`COINS ${String(player.coins).padStart(2, '0')}`, 270, 36);
    ctx.fillText(`LIVES ${player.lives}`, 430, 36);
    ctx.fillText(areaName.toUpperCase(), 560, 36);
    ctx.fillText(`TIME ${Math.max(0, Math.ceil(timer))}`, 810, 36);
  }
}

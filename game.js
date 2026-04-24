const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restart');

const state = {
  gravity: 0.36,
  holdPower: 0,
  charging: false,
  jumping: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('jump-best-score') || 0),
  cameraX: 0,
};

const player = {
  x: 100,
  y: 0,
  radius: 16,
  vy: 0,
  targetX: 100,
};

const platforms = [];

function randomGap() {
  return 85 + Math.random() * 80;
}

function randomWidth() {
  return 70 + Math.random() * 50;
}

function makePlatform(x) {
  return {
    x,
    y: 600 + (Math.random() * 12 - 6),
    width: randomWidth(),
    height: 18,
  };
}

function reset() {
  platforms.length = 0;
  platforms.push({ x: 70, y: 610, width: 90, height: 18 });
  let x = 200;
  for (let i = 0; i < 6; i += 1) {
    platforms.push(makePlatform(x));
    x += randomGap() + platforms.at(-1).width;
  }

  state.holdPower = 0;
  state.charging = false;
  state.jumping = false;
  state.gameOver = false;
  state.score = 0;
  state.cameraX = 0;

  player.x = platforms[0].x + platforms[0].width / 2;
  player.y = platforms[0].y - player.radius;
  player.vy = 0;
  player.targetX = player.x;

  renderHUD();
}

function renderHUD() {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(state.best);
}

function startCharge() {
  if (state.gameOver || state.jumping || state.charging) return;
  state.charging = true;
  state.holdPower = 0;
}

function releaseJump() {
  if (!state.charging || state.gameOver) return;
  state.charging = false;
  state.jumping = true;

  const power = Math.min(state.holdPower, 1.9);
  const distance = 60 + power * 170;
  player.targetX = player.x + distance;
  player.vy = -(5.2 + power * 2.8);
}

function nearestLandingPlatform(x) {
  return platforms.find((p) => x >= p.x && x <= p.x + p.width);
}

function ensurePlatforms() {
  while (platforms.at(-1).x - state.cameraX < canvas.width + 280) {
    const last = platforms.at(-1);
    const next = makePlatform(last.x + last.width + randomGap());
    platforms.push(next);
  }

  while (platforms.length > 0 && platforms[0].x + platforms[0].width < state.cameraX - 220) {
    platforms.shift();
  }
}

function update() {
  if (state.charging) {
    state.holdPower += 0.02;
  }

  if (state.jumping) {
    const dx = (player.targetX - player.x) * 0.13;
    player.x += dx;
    player.y += player.vy;
    player.vy += state.gravity;

    const platform = nearestLandingPlatform(player.x);
    if (platform && player.vy >= 0 && player.y >= platform.y - player.radius) {
      player.y = platform.y - player.radius;
      player.vy = 0;
      state.jumping = false;

      if (Math.abs((platform.x + platform.width / 2) - player.x) < 10) {
        state.score += 2;
      } else {
        state.score += 1;
      }
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('jump-best-score', String(state.best));
      }
      renderHUD();
    }

    if (!platform && player.y > canvas.height + 80) {
      state.gameOver = true;
      state.jumping = false;
    }
  }

  const focus = player.x - 130;
  if (focus > state.cameraX) {
    state.cameraX += (focus - state.cameraX) * 0.08;
  }

  ensurePlatforms();
}

function drawRoundedRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of platforms) {
    const px = p.x - state.cameraX;
    drawRoundedRect(px, p.y, p.width, p.height, 8, '#476585');
    drawRoundedRect(px + 5, p.y - 4, p.width - 10, 6, 5, '#6d8cb0');
  }

  const showPower = state.charging ? Math.min(state.holdPower / 2, 1) : 0;
  if (showPower > 0) {
    drawRoundedRect(16, 20, 130, 14, 8, '#dce9ff');
    drawRoundedRect(16, 20, 130 * showPower, 14, 8, '#2d6fe8');
  }

  const playerX = player.x - state.cameraX;
  const squeeze = state.charging ? 1 - Math.min(state.holdPower * 0.09, 0.28) : 1;
  const width = player.radius * 2 / squeeze;
  const height = player.radius * 2 * squeeze;

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.ellipse(playerX, player.y + (player.radius * (1 - squeeze)), width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.gameOver) {
    ctx.fillStyle = 'rgb(0 0 0 / 60%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '20px sans-serif';
    ctx.fillText(`得分：${state.score}`, canvas.width / 2, canvas.height / 2 + 28);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    startCharge();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    releaseJump();
  }
});

canvas.addEventListener('pointerdown', startCharge);
canvas.addEventListener('pointerup', releaseJump);
canvas.addEventListener('pointerleave', releaseJump);
restartBtn.addEventListener('click', reset);

bestEl.textContent = String(state.best);
reset();
loop();

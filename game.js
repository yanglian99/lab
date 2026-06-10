const canvas = document.querySelector('#arena');
const ctx = canvas.getContext('2d');
const playerHealthEl = document.querySelector('#player-health');
const enemyHealthEl = document.querySelector('#enemy-health');
const scoreEl = document.querySelector('#score');
const restartButton = document.querySelector('#restart');

const keys = new Set();
const bullets = [];
const particles = [];
let gameOver = false;
let score = 0;
let lastEnemyShot = 0;
let lastPlayerShot = 0;
let animationFrameId;

const player = {
  x: 180,
  y: 280,
  radius: 22,
  bodyAngle: 0,
  turretAngle: 0,
  speed: 3.6,
  health: 100,
  color: '#38bdf8',
};

const enemy = {
  x: 720,
  y: 280,
  radius: 24,
  bodyAngle: Math.PI,
  turretAngle: Math.PI,
  speed: 1.85,
  health: 100,
  color: '#fb7185',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resetGame() {
  player.x = 180;
  player.y = 280;
  player.bodyAngle = 0;
  player.turretAngle = 0;
  player.health = 100;

  enemy.x = 720;
  enemy.y = 280;
  enemy.bodyAngle = Math.PI;
  enemy.turretAngle = Math.PI;
  enemy.health = 100;

  bullets.length = 0;
  particles.length = 0;
  score = 0;
  gameOver = false;
  lastEnemyShot = 0;
  lastPlayerShot = 0;
  updateHud();
  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(loop);
}

function updateHud() {
  playerHealthEl.textContent = Math.max(0, Math.round(player.health));
  enemyHealthEl.textContent = Math.max(0, Math.round(enemy.health));
  scoreEl.textContent = score;
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.has('w')) dy -= 1;
  if (keys.has('s')) dy += 1;
  if (keys.has('a')) dx -= 1;
  if (keys.has('d')) dx += 1;

  if (dx || dy) {
    const mag = Math.hypot(dx, dy);
    dx /= mag;
    dy /= mag;
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.bodyAngle = Math.atan2(dy, dx);
  }

  if (keys.has('arrowleft')) player.turretAngle -= 0.075;
  if (keys.has('arrowright')) player.turretAngle += 0.075;

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
}

function moveEnemy(time) {
  enemy.turretAngle = angleTo(enemy, player);
  enemy.bodyAngle += Math.sin(time / 600) * 0.012;

  const desiredDistance = 285;
  const gap = distance(enemy, player);
  const chaseAngle = angleTo(enemy, player) + (gap < desiredDistance ? Math.PI : 0);
  const strafeAngle = chaseAngle + Math.PI / 2;

  enemy.x += Math.cos(strafeAngle) * enemy.speed * 0.75 + Math.cos(chaseAngle) * enemy.speed * 0.45;
  enemy.y += Math.sin(strafeAngle) * enemy.speed * 0.75 + Math.sin(chaseAngle) * enemy.speed * 0.45;
  enemy.x = clamp(enemy.x, enemy.radius, canvas.width - enemy.radius);
  enemy.y = clamp(enemy.y, enemy.radius, canvas.height - enemy.radius);

  if (time - lastEnemyShot > 920 && enemy.health > 0) {
    shoot(enemy, enemy.turretAngle, 'enemy');
    lastEnemyShot = time;
  }
}

function shoot(source, angle, owner) {
  bullets.push({
    x: source.x + Math.cos(angle) * (source.radius + 10),
    y: source.y + Math.sin(angle) * (source.radius + 10),
    vx: Math.cos(angle) * 7.4,
    vy: Math.sin(angle) * 7.4,
    radius: 5,
    owner,
    life: 100,
  });
}

function makeSparks(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      color,
      life: 24 + Math.random() * 18,
    });
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life -= 1;

    const target = bullet.owner === 'player' ? enemy : player;
    if (distance(bullet, target) < bullet.radius + target.radius) {
      target.health -= bullet.owner === 'player' ? 14 : 10;
      if (bullet.owner === 'player') score += 25;
      makeSparks(bullet.x, bullet.y, bullet.owner === 'player' ? '#facc15' : '#fb7185');
      bullets.splice(i, 1);
      continue;
    }

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > canvas.width + 20 ||
      bullet.y > canvas.height + 20
    ) {
      bullets.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    particle.life -= 1;
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function drawGrid() {
  ctx.fillStyle = '#06101d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.11)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawRobot(robot, label) {
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.bodyAngle);
  ctx.fillStyle = robot.color;
  ctx.shadowColor = robot.color;
  ctx.shadowBlur = 16;
  ctx.fillRect(-robot.radius, -robot.radius, robot.radius * 2, robot.radius * 2);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(-8, -robot.radius, 16, robot.radius * 2);
  ctx.restore();

  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.turretAngle);
  ctx.fillStyle = '#e5f3ff';
  ctx.fillRect(0, -5, robot.radius + 18, 10);
  ctx.beginPath();
  ctx.arc(0, 0, robot.radius * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e5f3ff';
  ctx.font = '700 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, robot.x, robot.y - robot.radius - 14);
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.fillStyle = bullet.owner === 'player' ? '#facc15' : '#fb7185';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / 32, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawEndMessage() {
  const won = enemy.health <= 0;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.74)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = won ? '#34d399' : '#fb7185';
  ctx.font = '900 58px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'VICTORY' : 'BOT DESTROYED', canvas.width / 2, canvas.height / 2 - 16);
  ctx.fillStyle = '#e5f3ff';
  ctx.font = '700 22px system-ui';
  ctx.fillText('Press Restart to battle again', canvas.width / 2, canvas.height / 2 + 34);
}

function loop(time) {
  if (!gameOver) {
    movePlayer();
    moveEnemy(time);
    updateBullets();
    updateParticles();

    if (player.health <= 0 || enemy.health <= 0) {
      gameOver = true;
      if (enemy.health <= 0) score += 500;
    }
  }

  drawGrid();
  drawParticles();
  drawRobot(player, 'YOU');
  drawRobot(enemy, 'SENTRY');
  drawBullets();
  updateHud();

  if (gameOver) drawEndMessage();
  animationFrameId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);

  if (key === ' ' && !gameOver) {
    const now = performance.now();
    if (now - lastPlayerShot > 230) {
      shoot(player, player.turretAngle, 'player');
      lastPlayerShot = now;
    }
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

restartButton.addEventListener('click', resetGame);

resetGame();

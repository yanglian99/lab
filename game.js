const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = {
  round: document.getElementById('round'),
  health: document.getElementById('health'),
  enemies: document.getElementById('enemies'),
  score: document.getElementById('score'),
};

const TAU = Math.PI * 2;
const ARENA = { width: canvas.width, height: canvas.height };
const keys = new Set();
const mouse = { x: ARENA.width / 2, y: ARENA.height / 2, down: false };

const state = {
  round: 1,
  score: 0,
  gameOver: false,
  victoryTimer: 0,
  message: 'Destroy the enemy tanks.',
  particles: [],
  bullets: [],
  enemies: [],
  pickups: [],
  obstacles: [],
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function wrapAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

function makePlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    angle: -Math.PI / 2,
    turretAngle: -Math.PI / 2,
    radius: 18,
    speed: 0,
    health: 100,
    maxHealth: 100,
    reload: 0,
    boost: 100,
    trail: [],
  };
}

let player = makePlayer();

function createObstacles() {
  const obstacles = [];
  const count = 5;
  for (let i = 0; i < count; i += 1) {
    let attempt = 0;
    while (attempt < 100) {
      const obstacle = {
        x: rand(100, ARENA.width - 180),
        y: rand(80, ARENA.height - 160),
        w: rand(60, 140),
        h: rand(50, 110),
      };
      const center = { x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2 };
      if (distance(center, player) > 150 && obstacles.every((other) => !rectOverlap(obstacle, other, 32))) {
        obstacles.push(obstacle);
        break;
      }
      attempt += 1;
    }
  }
  return obstacles;
}

function rectOverlap(a, b, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function circleIntersectsRect(circle, rect) {
  const testX = clamp(circle.x, rect.x, rect.x + rect.w);
  const testY = clamp(circle.y, rect.y, rect.y + rect.h);
  return Math.hypot(circle.x - testX, circle.y - testY) <= circle.radius;
}

function clearLineOfSight(a, b) {
  for (const obstacle of state.obstacles) {
    for (let t = 0; t <= 1; t += 0.05) {
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (x > obstacle.x && x < obstacle.x + obstacle.w && y > obstacle.y && y < obstacle.y + obstacle.h) {
        return false;
      }
    }
  }
  return true;
}

function spawnEnemy() {
  let enemy;
  let attempt = 0;
  while (attempt < 200) {
    enemy = {
      x: rand(40, ARENA.width - 40),
      y: rand(40, ARENA.height - 40),
      angle: rand(-Math.PI, Math.PI),
      turretAngle: rand(-Math.PI, Math.PI),
      radius: 16,
      health: 32 + state.round * 10,
      maxHealth: 32 + state.round * 10,
      reload: rand(0.2, 0.8),
      radar: rand(-1, 1),
      color: `hsl(${rand(0, 30)}, 80%, ${rand(54, 66)}%)`,
    };
    const valid = distance(enemy, player) > 220 && !state.obstacles.some((o) => circleIntersectsRect(enemy, o)) && state.enemies.every((e) => distance(enemy, e) > 60);
    if (valid) return enemy;
    attempt += 1;
  }
  return enemy;
}

function spawnRound() {
  state.obstacles = createObstacles();
  state.enemies = [];
  state.pickups = [];
  state.bullets = [];
  for (let i = 0; i < 3 + state.round; i += 1) {
    state.enemies.push(spawnEnemy());
  }
  state.message = `Round ${state.round}: ${state.enemies.length} hostile bots incoming.`;
}

function restartGame() {
  player = makePlayer();
  state.round = 1;
  state.score = 0;
  state.gameOver = false;
  state.particles = [];
  state.victoryTimer = 0;
  spawnRound();
}

function fireBullet(owner, speed, damage) {
  const angle = owner.turretAngle;
  state.bullets.push({
    x: owner.x + Math.cos(angle) * (owner.radius + 6),
    y: owner.y + Math.sin(angle) * (owner.radius + 6),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: owner === player ? 4 : 3.5,
    life: 1.6,
    owner,
    damage,
  });
}

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: Math.cos((i / amount) * TAU + rand(-0.3, 0.3)) * rand(35, 110),
      vy: Math.sin((i / amount) * TAU + rand(-0.3, 0.3)) * rand(35, 110),
      life: rand(0.25, 0.7),
      color,
    });
  }
}

function resolveTankMovement(tank, dx, dy, dt) {
  const next = { x: tank.x + dx * dt, y: tank.y + dy * dt, radius: tank.radius };
  if (next.x < tank.radius || next.x > ARENA.width - tank.radius) return;
  if (next.y < tank.radius || next.y > ARENA.height - tank.radius) return;
  if (state.obstacles.some((o) => circleIntersectsRect(next, o))) return;
  tank.x = next.x;
  tank.y = next.y;
}

function updatePlayer(dt) {
  const move = { x: 0, y: 0 };
  if (keys.has('w')) move.y -= 1;
  if (keys.has('s')) move.y += 1;
  if (keys.has('a')) move.x -= 1;
  if (keys.has('d')) move.x += 1;
  const moving = move.x !== 0 || move.y !== 0;
  let speed = 180;
  if (keys.has('shift') && player.boost > 0) {
    speed = 280;
    player.boost = Math.max(0, player.boost - 28 * dt);
  } else {
    player.boost = Math.min(100, player.boost + 18 * dt);
  }
  if (moving) {
    const len = Math.hypot(move.x, move.y);
    move.x /= len;
    move.y /= len;
    player.angle = Math.atan2(move.y, move.x);
    resolveTankMovement(player, move.x * speed, move.y * speed, dt);
    player.trail.push({ x: player.x, y: player.y, life: 0.35 });
    if (player.trail.length > 18) player.trail.shift();
  }

  player.turretAngle = angleTo(player, mouse);
  player.reload = Math.max(0, player.reload - dt);
  if ((mouse.down || keys.has(' ')) && player.reload === 0) {
    fireBullet(player, 420, 18);
    player.reload = 0.22;
  }

  for (const pickup of state.pickups) {
    if (!pickup.collected && distance(player, pickup) < player.radius + pickup.radius + 4) {
      pickup.collected = true;
      player.health = Math.min(player.maxHealth, player.health + 24);
      addBurst(pickup.x, pickup.y, '#7ef29a', 18);
      state.message = 'Repair core collected.';
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.reload = Math.max(0, enemy.reload - dt);
    const dist = distance(enemy, player);
    const sight = clearLineOfSight(enemy, player);
    const targetAngle = angleTo(enemy, player);
    if (dist > 140 || !sight) {
      enemy.angle += enemy.radar * dt;
      resolveTankMovement(enemy, Math.cos(enemy.angle) * (70 + state.round * 6), Math.sin(enemy.angle) * (70 + state.round * 6), dt);
      if (Math.random() < 0.02) enemy.radar *= -1;
    } else {
      const retreat = dist < 110 ? -1 : 1;
      resolveTankMovement(enemy, Math.cos(targetAngle) * 90 * retreat, Math.sin(targetAngle) * 90 * retreat, dt);
      enemy.angle = targetAngle;
    }
    const turn = wrapAngle(targetAngle - enemy.turretAngle);
    enemy.turretAngle += clamp(turn, -2.2 * dt, 2.2 * dt);

    if (sight && Math.abs(turn) < 0.18 && enemy.reload === 0) {
      fireBullet(enemy, 310 + state.round * 10, 12 + state.round * 1.5);
      enemy.reload = rand(0.55, 1.05);
    }
  }
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.x < 0 || bullet.x > ARENA.width || bullet.y < 0 || bullet.y > ARENA.height) bullet.life = 0;
    if (state.obstacles.some((o) => circleIntersectsRect(bullet, o))) {
      bullet.life = 0;
      addBurst(bullet.x, bullet.y, 'rgba(255,255,255,0.7)', 6);
      continue;
    }

    if (bullet.owner !== player && distance(bullet, player) < player.radius + bullet.radius) {
      bullet.life = 0;
      player.health = Math.max(0, player.health - bullet.damage);
      addBurst(bullet.x, bullet.y, '#7cd2ff', 10);
      state.message = 'You were hit.';
      if (player.health === 0) {
        state.gameOver = true;
        state.message = 'System failure. Press R to restart.';
      }
    }

    if (bullet.owner === player) {
      for (const enemy of state.enemies) {
        if (distance(bullet, enemy) < enemy.radius + bullet.radius) {
          bullet.life = 0;
          enemy.health -= bullet.damage;
          addBurst(bullet.x, bullet.y, enemy.color, 10);
          if (enemy.health <= 0) {
            state.score += 100;
            if (Math.random() < 0.25) {
              state.pickups.push({ x: enemy.x, y: enemy.y, radius: 10, collected: false });
            }
          }
          break;
        }
      }
    }
  }

  state.bullets = state.bullets.filter((bullet) => bullet.life > 0);
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  player.trail.forEach((p) => { p.life -= dt; });
  player.trail = player.trail.filter((p) => p.life > 0);
}

function updateRound(dt) {
  if (state.gameOver) return;
  if (state.enemies.length === 0) {
    state.victoryTimer += dt;
    if (state.victoryTimer > 1.6) {
      state.round += 1;
      state.victoryTimer = 0;
      player.health = Math.min(player.maxHealth, player.health + 12);
      spawnRound();
    } else {
      state.message = 'Arena clear. Preparing next wave...';
    }
  } else {
    state.victoryTimer = 0;
  }
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(124, 210, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTank(tank, color, isPlayer = false) {
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-tank.radius, -tank.radius + 2, tank.radius * 2, tank.radius * 2 - 4, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-tank.radius - 4, -tank.radius - 2, 7, tank.radius * 2 + 4);
  ctx.fillRect(tank.radius - 3, -tank.radius - 2, 7, tank.radius * 2 + 4);
  ctx.restore();

  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.turretAngle);
  ctx.fillStyle = isPlayer ? '#bff0ff' : '#ffd7cf';
  ctx.fillRect(-4, -5, tank.radius + 18, 10);
  ctx.beginPath();
  ctx.arc(0, 0, tank.radius * 0.62, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(tank.x - 20, tank.y - tank.radius - 18, 40, 5);
  ctx.fillStyle = isPlayer ? '#7ef29a' : '#ff8a80';
  ctx.fillRect(tank.x - 20, tank.y - tank.radius - 18, 40 * Math.max(0, tank.health / tank.maxHealth), 5);
}

function draw() {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height);
  drawGrid();

  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.fillRect(12, 12, ARENA.width - 24, ARENA.height - 24);

  for (const obstacle of state.obstacles) {
    ctx.fillStyle = '#657388';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 12);
    ctx.fill();
    ctx.stroke();
  }

  for (const trail of player.trail) {
    ctx.fillStyle = `rgba(124, 210, 255, ${trail.life * 0.35})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, 9 * trail.life, 0, TAU);
    ctx.fill();
  }

  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    ctx.fillStyle = '#7ef29a';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(pickup.x - 5, pickup.y);
    ctx.lineTo(pickup.x + 5, pickup.y);
    ctx.moveTo(pickup.x, pickup.y - 5);
    ctx.lineTo(pickup.x, pickup.y + 5);
    ctx.stroke();
  }

  drawTank(player, '#49c6ff', true);
  state.enemies.forEach((enemy) => drawTank(enemy, enemy.color));

  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.owner === player ? '#bff0ff' : '#ffb3a7';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
    ctx.fill();
  }

  for (const particle of state.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life * 1.4);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(7,17,31,0.72)';
  ctx.fillRect(16, ARENA.height - 70, 350, 42);
  ctx.strokeStyle = 'rgba(124,210,255,0.18)';
  ctx.strokeRect(16, ARENA.height - 70, 350, 42);
  ctx.fillStyle = '#edf7ff';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(state.message, 28, ARENA.height - 43);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(ARENA.width - 196, ARENA.height - 70, 160, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(ARENA.width - 196, ARENA.height - 70, 1.6 * player.boost, 12);
  ctx.fillStyle = '#edf7ff';
  ctx.fillText('Boost', ARENA.width - 196, ARENA.height - 80);

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(3,7,13,0.72)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.fillStyle = '#edf7ff';
    ctx.textAlign = 'center';
    ctx.font = '700 42px Inter, sans-serif';
    ctx.fillText('Tank Destroyed', ARENA.width / 2, ARENA.height / 2 - 18);
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('Press R to restart the simulation', ARENA.width / 2, ARENA.height / 2 + 22);
    ctx.textAlign = 'start';
  }
}

function updateHud() {
  hud.round.textContent = state.round;
  hud.health.textContent = Math.round(player.health);
  hud.enemies.textContent = state.enemies.length;
  hud.score.textContent = state.score;
}

let previous = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - previous) / 1000);
  previous = now;
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateParticles(dt);
  updateRound(dt);
  draw();
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'r', ' '].includes(key) || key === 'shift') event.preventDefault();
  keys.add(key);
  if (key === 'r') restartGame();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * ARENA.width;
  mouse.y = ((event.clientY - rect.top) / rect.height) * ARENA.height;
});
canvas.addEventListener('mousedown', () => { mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });

restartGame();
requestAnimationFrame(loop);

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");

const healthEl = document.querySelector("#health");
const ammoEl = document.querySelector("#ammo");
const scoreEl = document.querySelector("#score");
const waveEl = document.querySelector("#wave");

const TILE = 64;
const FOV = Math.PI / 3;
const MAX_DEPTH = TILE * 18;
const STRAFE_SPEED = 170;
const RUN_SPEED = 210;
const TURN_SPEED = 2.7;
const ENEMY_RADIUS = 20;
const keys = new Set();

const map = [
  "################",
  "#......#.......#",
  "#..##..#..###..#",
  "#......#.......#",
  "###..####..##..#",
  "#..............#",
  "#..##..####..###",
  "#...#.........#",
  "#...#..##..#..#",
  "#......##.....#",
  "#..##......##.#",
  "#.............#",
  "################",
].map((row) => row.padEnd(16, "#"));

const playerStart = { x: TILE * 2.4, y: TILE * 2.4, angle: 0.2 };
let player;
let enemies;
let particles;
let lastTime = 0;
let score = 0;
let wave = 1;
let running = false;
let muzzleFlash = 0;
let damagePulse = 0;
let gameMessage = "";

function resetGame() {
  player = { ...playerStart, health: 100, ammo: 50, reloadTimer: 0 };
  enemies = [];
  particles = [];
  score = 0;
  wave = 1;
  damagePulse = 0;
  gameMessage = "";
  spawnWave();
  updateHud();
}

function spawnWave() {
  const spawnPoints = [
    [13.5, 1.5], [12.5, 5.5], [2.5, 9.5], [9.5, 10.5], [6.5, 5.5], [13.5, 10.5],
  ];
  const count = Math.min(4 + wave * 2, 18);
  for (let i = 0; i < count; i++) {
    const [x, y] = spawnPoints[i % spawnPoints.length];
    enemies.push({
      x: x * TILE + Math.random() * 24 - 12,
      y: y * TILE + Math.random() * 24 - 12,
      health: 34 + wave * 8,
      speed: 56 + wave * 5,
      biteCooldown: Math.random(),
      bob: Math.random() * Math.PI * 2,
    });
  }
}

function isWall(x, y) {
  const mx = Math.floor(x / TILE);
  const my = Math.floor(y / TILE);
  return !map[my] || map[my][mx] === "#";
}

function tryMove(entity, dx, dy) {
  const nextX = entity.x + dx;
  const nextY = entity.y + dy;
  if (!isWall(nextX, entity.y)) entity.x = nextX;
  if (!isWall(entity.x, nextY)) entity.y = nextY;
}

function castRay(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  let distance = 0;
  let hitX = player.x;
  let hitY = player.y;

  while (distance < MAX_DEPTH) {
    hitX = player.x + cos * distance;
    hitY = player.y + sin * distance;
    if (isWall(hitX, hitY)) break;
    distance += 4;
  }

  const shade = Math.max(0.18, 1 - distance / MAX_DEPTH);
  return { distance, shade, hitX, hitY };
}

function update(dt) {
  if (!running) return;

  player.reloadTimer = Math.max(0, player.reloadTimer - dt);
  muzzleFlash = Math.max(0, muzzleFlash - dt * 5);
  damagePulse = Math.max(0, damagePulse - dt * 2.5);

  if (keys.has("ArrowLeft")) player.angle -= TURN_SPEED * dt;
  if (keys.has("ArrowRight")) player.angle += TURN_SPEED * dt;

  let forward = 0;
  let strafe = 0;
  if (keys.has("KeyW")) forward += 1;
  if (keys.has("KeyS")) forward -= 1;
  if (keys.has("KeyD")) strafe += 1;
  if (keys.has("KeyA")) strafe -= 1;

  const dx = Math.cos(player.angle) * forward * RUN_SPEED * dt + Math.cos(player.angle + Math.PI / 2) * strafe * STRAFE_SPEED * dt;
  const dy = Math.sin(player.angle) * forward * RUN_SPEED * dt + Math.sin(player.angle + Math.PI / 2) * strafe * STRAFE_SPEED * dt;
  tryMove(player, dx, dy);

  for (const enemy of enemies) {
    enemy.bob += dt * 5;
    enemy.biteCooldown -= dt;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance > 42) {
      tryMove(enemy, Math.cos(angle) * enemy.speed * dt, Math.sin(angle) * enemy.speed * dt);
    } else if (enemy.biteCooldown <= 0) {
      player.health = Math.max(0, player.health - 9);
      enemy.biteCooldown = 0.85;
      damagePulse = 1;
      if (player.health === 0) endGame("You were dragged into the rift. Press R to restart.");
    }
  }

  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    return particle.life > 0;
  });

  if (enemies.length === 0) {
    wave += 1;
    player.ammo += 18;
    player.health = Math.min(100, player.health + 12);
    spawnWave();
  }

  updateHud();
}

function shoot() {
  if (!running || player.reloadTimer > 0 || player.ammo <= 0) return;
  player.ammo -= 1;
  player.reloadTimer = 0.18;
  muzzleFlash = 1;

  let best = null;
  let bestAngle = 0.09;
  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    const wallHit = castRay(Math.atan2(dy, dx));
    if (Math.abs(angle) < bestAngle && distance < wallHit.distance + ENEMY_RADIUS) {
      best = enemy;
      bestAngle = Math.abs(angle);
    }
  }

  if (best) {
    best.health -= 28;
    addBurst(best.x, best.y, "#ffcf75");
    if (best.health <= 0) {
      score += 100;
      addBurst(best.x, best.y, "#e24a2b", 18);
      enemies = enemies.filter((enemy) => enemy !== best);
    }
  }
  updateHud();
}

function addBurst(x, y, color, amount = 8) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({ x, y, color, life: 0.35 + Math.random() * 0.25, vx: Math.cos(angle) * (40 + Math.random() * 90), vy: Math.sin(angle) * (40 + Math.random() * 90) });
  }
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function render() {
  drawSkyAndFloor();
  drawWalls();
  drawSprites();
  drawWeapon();
  drawCrosshair();
  drawMinimap();

  if (damagePulse > 0) {
    ctx.fillStyle = `rgba(210, 20, 15, ${damagePulse * 0.32})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (gameMessage) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(0, canvas.height / 2 - 54, canvas.width, 108);
    ctx.fillStyle = "#ffd28b";
    ctx.font = "bold 28px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(gameMessage, canvas.width / 2, canvas.height / 2 + 10);
  }
}

function drawSkyAndFloor() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1d1424");
  gradient.addColorStop(0.48, "#3f2017");
  gradient.addColorStop(0.5, "#251610");
  gradient.addColorStop(1, "#080606");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 180, 70, 0.06)";
  for (let y = canvas.height / 2; y < canvas.height; y += 18) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function drawWalls() {
  const columns = 240;
  const columnWidth = canvas.width / columns;
  for (let i = 0; i < columns; i++) {
    const rayAngle = player.angle - FOV / 2 + (i / columns) * FOV;
    const hit = castRay(rayAngle);
    const corrected = hit.distance * Math.cos(rayAngle - player.angle);
    const wallHeight = Math.min(canvas.height * 1.8, (TILE * canvas.height) / corrected);
    const x = i * columnWidth;
    const y = canvas.height / 2 - wallHeight / 2;
    const brick = ((Math.floor(hit.hitX / 16) + Math.floor(hit.hitY / 16)) % 2) * 18;
    const light = Math.floor(hit.shade * 150 + brick);
    ctx.fillStyle = `rgb(${light + 40}, ${Math.floor(light * 0.58)}, ${Math.floor(light * 0.38)})`;
    ctx.fillRect(x, y, columnWidth + 1, wallHeight);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.46 - hit.shade * 0.2})`;
    ctx.fillRect(x, y, columnWidth + 1, wallHeight);
  }
}

function drawSprites() {
  const sprites = [
    ...particles.map((particle) => ({ ...particle, type: "particle" })),
    ...enemies.map((enemy) => ({ ...enemy, type: "enemy" })),
  ].sort((a, b) => distanceTo(b) - distanceTo(a));

  for (const sprite of sprites) {
    const dx = sprite.x - player.x;
    const dy = sprite.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    if (Math.abs(angle) > FOV * 0.68 || distance < 4) continue;
    const wallHit = castRay(Math.atan2(dy, dx));
    if (distance > wallHit.distance + ENEMY_RADIUS) continue;

    const screenX = canvas.width / 2 + (angle / (FOV / 2)) * (canvas.width / 2);
    const size = Math.min(280, (TILE * canvas.height) / distance);
    const screenY = canvas.height / 2 - size / 2;

    if (sprite.type === "enemy") drawEnemy(screenX, screenY + Math.sin(sprite.bob) * 5, size, sprite.health);
    else drawParticle(screenX, screenY + size / 2, Math.max(3, size * 0.08), sprite.color, sprite.life);
  }
}

function drawEnemy(x, y, size, health) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#1a0707";
  ctx.fillRect(-size * 0.28, size * 0.22, size * 0.56, size * 0.55);
  ctx.fillStyle = "#7f1f18";
  ctx.fillRect(-size * 0.36, 0, size * 0.72, size * 0.46);
  ctx.fillStyle = "#cc4b2b";
  ctx.fillRect(-size * 0.25, size * 0.08, size * 0.5, size * 0.23);
  ctx.fillStyle = "#ffe078";
  ctx.fillRect(-size * 0.17, size * 0.16, size * 0.1, size * 0.06);
  ctx.fillRect(size * 0.07, size * 0.16, size * 0.1, size * 0.06);
  ctx.fillStyle = health < 30 ? "#ffdd64" : "#3d0b0a";
  ctx.fillRect(-size * 0.22, size * 0.35, size * 0.44, size * 0.05);
  ctx.restore();
}

function drawParticle(x, y, size, color, life) {
  ctx.globalAlpha = Math.min(1, life * 3);
  ctx.fillStyle = color;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}

function drawWeapon() {
  const bob = Math.sin(performance.now() / 90) * 5;
  ctx.fillStyle = "#201414";
  ctx.fillRect(canvas.width / 2 - 68, canvas.height - 132 + bob, 136, 132);
  ctx.fillStyle = "#5b3525";
  ctx.fillRect(canvas.width / 2 - 48, canvas.height - 92 + bob, 96, 92);
  ctx.fillStyle = "#b27a4b";
  ctx.fillRect(canvas.width / 2 - 24, canvas.height - 148 + bob, 48, 80);
  ctx.fillStyle = "#2a1a18";
  ctx.fillRect(canvas.width / 2 - 14, canvas.height - 156 + bob, 28, 34);
  if (muzzleFlash > 0) {
    ctx.fillStyle = `rgba(255, 220, 85, ${muzzleFlash})`;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 165 + bob, 45 * muzzleFlash, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrosshair() {
  ctx.strokeStyle = "rgba(255, 230, 160, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 13, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 - 4, canvas.height / 2);
  ctx.moveTo(canvas.width / 2 + 4, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 + 13, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 - 13);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 - 4);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 + 4);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 + 13);
  ctx.stroke();
}

function drawMinimap() {
  const scale = 4;
  ctx.save();
  ctx.translate(14, canvas.height - map.length * scale - 46);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(-6, -6, map[0].length * scale + 12, map.length * scale + 12);
  map.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      ctx.fillStyle = cell === "#" ? "#89522d" : "#231615";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  ctx.fillStyle = "#ffe078";
  ctx.fillRect((player.x / TILE) * scale - 2, (player.y / TILE) * scale - 2, 4, 4);
  ctx.fillStyle = "#e24a2b";
  enemies.forEach((enemy) => ctx.fillRect((enemy.x / TILE) * scale - 1, (enemy.y / TILE) * scale - 1, 2, 2));
  ctx.restore();
}

function distanceTo(entity) {
  return Math.hypot(entity.x - player.x, entity.y - player.y);
}

function updateHud() {
  healthEl.textContent = player.health;
  ammoEl.textContent = player.ammo;
  scoreEl.textContent = score;
  waveEl.textContent = wave;
}

function endGame(message) {
  running = false;
  gameMessage = message;
}

function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  overlay.classList.add("hidden");
  resetGame();
  running = true;
  canvas.focus();
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") shoot();
  if (event.code === "KeyR") {
    overlay.classList.add("hidden");
    resetGame();
    running = true;
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
canvas.addEventListener("click", shoot);
canvas.addEventListener("mousemove", (event) => {
  if (!running) return;
  player.angle += event.movementX * 0.0035;
});

resetGame();
requestAnimationFrame(loop);

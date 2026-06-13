const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

const map = [
  '################',
  '#..............#',
  '#..##....###...#',
  '#..............#',
  '#....#.........#',
  '#....#...E.....#',
  '#..............#',
  '#..E....####...#',
  '#..............#',
  '#......#.......#',
  '#...........E..#',
  '#..............#',
  '#...####.......#',
  '#..............#',
  '#......E.......#',
  '################',
];

const tileSize = 1;
const fov = Math.PI / 3;
const maxDepth = 20;
const keys = new Set();
let lastTime = performance.now();
let pointerLocked = false;

const player = {
  x: 2.5,
  y: 2.5,
  angle: 0,
  health: 100,
  ammo: 24,
  kills: 0,
};

const initialEnemies = [
  { x: 10.5, y: 5.5 },
  { x: 3.5, y: 7.5 },
  { x: 12.5, y: 10.5 },
  { x: 7.5, y: 14.5 },
];
let enemies = [];

function resetGame() {
  player.x = 2.5;
  player.y = 2.5;
  player.angle = 0;
  player.health = 100;
  player.ammo = 24;
  player.kills = 0;
  enemies = initialEnemies.map((enemy, index) => ({
    ...enemy,
    id: index,
    alive: true,
    cooldown: Math.random() * 1.2,
  }));
  setLog('Sector reset. Rip and tear.');
}

function setLog(message) {
  logEl.textContent = message;
}

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  return map[my]?.[mx] === '#' || !map[my] || !map[my][mx];
}

function movePlayer(dt) {
  let speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.7;
  const step = speed * dt;
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyW')) { dx += Math.cos(player.angle) * step; dy += Math.sin(player.angle) * step; }
  if (keys.has('KeyS')) { dx -= Math.cos(player.angle) * step; dy -= Math.sin(player.angle) * step; }
  if (keys.has('KeyA')) { dx += Math.cos(player.angle - Math.PI / 2) * step; dy += Math.sin(player.angle - Math.PI / 2) * step; }
  if (keys.has('KeyD')) { dx += Math.cos(player.angle + Math.PI / 2) * step; dy += Math.sin(player.angle + Math.PI / 2) * step; }

  const nextX = player.x + dx;
  const nextY = player.y + dy;
  if (!isWall(nextX, player.y)) player.x = nextX;
  if (!isWall(player.x, nextY)) player.y = nextY;

  if (keys.has('ArrowLeft')) player.angle -= 1.8 * dt;
  if (keys.has('ArrowRight')) player.angle += 1.8 * dt;
}

function castRay(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  for (let depth = 0; depth < maxDepth; depth += 0.02) {
    const x = player.x + cos * depth;
    const y = player.y + sin * depth;
    if (isWall(x, y)) {
      return { depth, x, y };
    }
  }
  return { depth: maxDepth, x: player.x, y: player.y };
}

function shoot() {
  if (player.ammo <= 0) {
    setLog('Dry fire. Find your rhythm, not ammo.');
    return;
  }
  player.ammo -= 1;

  let bestTarget = null;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angleToEnemy = Math.atan2(dy, dx);
    const diff = Math.atan2(Math.sin(angleToEnemy - player.angle), Math.cos(angleToEnemy - player.angle));
    if (Math.abs(diff) < 0.08) {
      const wallDistance = castRay(angleToEnemy).depth;
      if (distance < wallDistance + 0.1 && (!bestTarget || distance < bestTarget.distance)) {
        bestTarget = { enemy, distance };
      }
    }
  }

  if (bestTarget) {
    bestTarget.enemy.alive = false;
    player.kills += 1;
    setLog(`Target down. ${enemies.filter((enemy) => enemy.alive).length} demons remain.`);
  } else {
    setLog('Shot missed. Lead the target and fire again.');
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0.9) {
      const speed = 0.7 * dt;
      const nextX = enemy.x + (dx / distance) * speed;
      const nextY = enemy.y + (dy / distance) * speed;
      if (!isWall(nextX, enemy.y)) enemy.x = nextX;
      if (!isWall(enemy.x, nextY)) enemy.y = nextY;
    }

    enemy.cooldown -= dt;
    if (distance < 1.4 && enemy.cooldown <= 0) {
      player.health = Math.max(0, player.health - 8);
      enemy.cooldown = 1.1;
      setLog('You were hit. Keep moving!');
      if (player.health <= 0) {
        setLog('Mission failed. Press R to restart the arena.');
      }
    }
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
  sky.addColorStop(0, '#401109');
  sky.addColorStop(1, '#8a3b11');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  const floor = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
  floor.addColorStop(0, '#2a201d');
  floor.addColorStop(1, '#080808');
  ctx.fillStyle = floor;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}

function drawWalls() {
  for (let column = 0; column < canvas.width; column++) {
    const rayAngle = player.angle - fov / 2 + (column / canvas.width) * fov;
    const hit = castRay(rayAngle);
    const correctedDepth = hit.depth * Math.cos(rayAngle - player.angle);
    const wallHeight = Math.min(canvas.height, (canvas.height / correctedDepth) * 0.9);
    const shade = Math.max(0, 220 - correctedDepth * 18);
    ctx.fillStyle = `rgb(${shade}, ${Math.max(25, shade * 0.38)}, ${Math.max(10, shade * 0.18)})`;
    ctx.fillRect(column, (canvas.height - wallHeight) / 2, 1, wallHeight);
  }
}

function drawSprites() {
  const visibleEnemies = enemies
    .filter((enemy) => enemy.alive)
    .map((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.hypot(dx, dy);
      const angleToEnemy = Math.atan2(dy, dx) - player.angle;
      const normalizedAngle = Math.atan2(Math.sin(angleToEnemy), Math.cos(angleToEnemy));
      return { enemy, distance, angle: normalizedAngle };
    })
    .filter(({ angle, distance }) => Math.abs(angle) < fov / 2 + 0.2 && distance > 0.2)
    .sort((a, b) => b.distance - a.distance);

  for (const { enemy, distance, angle } of visibleEnemies) {
    const screenX = (0.5 + angle / fov) * canvas.width;
    const size = Math.min(280, canvas.height / distance);
    const wallDistance = castRay(player.angle + angle).depth;
    if (distance > wallDistance) continue;

    const x = screenX - size / 2;
    const y = canvas.height / 2 - size / 2;

    ctx.fillStyle = '#7d0000';
    ctx.fillRect(x + size * 0.25, y + size * 0.15, size * 0.5, size * 0.68);
    ctx.fillStyle = '#ff3b1f';
    ctx.beginPath();
    ctx.arc(screenX, y + size * 0.2, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd3c4';
    ctx.fillRect(screenX - size * 0.14, y + size * 0.34, size * 0.1, size * 0.12);
    ctx.fillRect(screenX + size * 0.04, y + size * 0.34, size * 0.1, size * 0.12);
  }
}

function drawWeapon() {
  const bob = Math.sin(performance.now() / 140) * 4;
  ctx.fillStyle = '#202020';
  ctx.fillRect(canvas.width / 2 - 80, canvas.height - 120 + bob, 160, 100);
  ctx.fillStyle = '#505050';
  ctx.fillRect(canvas.width / 2 - 18, canvas.height - 170 + bob, 36, 90);
  ctx.fillStyle = '#ff7a18';
  ctx.fillRect(canvas.width / 2 - 8, canvas.height - 182 + bob, 16, 20);
}

function drawMinimap() {
  const scale = 8;
  const offsetX = 12;
  const offsetY = canvas.height - map.length * scale - 12;
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      ctx.fillStyle = map[y][x] === '#' ? '#a74a1f' : '#1d1d1d';
      ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale - 1, scale - 1);
    }
  }
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    ctx.fillStyle = '#ff3030';
    ctx.fillRect(offsetX + enemy.x * scale - 2, offsetY + enemy.y * scale - 2, 4, 4);
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(offsetX + player.x * scale, offsetY + player.y * scale, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(offsetX + player.x * scale, offsetY + player.y * scale);
  ctx.lineTo(offsetX + player.x * scale + Math.cos(player.angle) * 8, offsetY + player.y * scale + Math.sin(player.angle) * 8);
  ctx.stroke();
  ctx.restore();
}

function updateHud() {
  const living = enemies.filter((enemy) => enemy.alive).length;
  statusEl.innerHTML = `
    <strong>Health:</strong> ${player.health}<br />
    <strong>Ammo:</strong> ${player.ammo}<br />
    <strong>Kills:</strong> ${player.kills}/${enemies.length}<br />
    <strong>Threats:</strong> ${living}
  `;

  if (living === 0) {
    setLog('Arena clear. Press R to run it again.');
  }
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  if (player.health > 0 && enemies.some((enemy) => enemy.alive)) {
    movePlayer(dt);
    updateEnemies(dt);
  }

  drawBackground();
  drawWalls();
  drawSprites();
  drawWeapon();
  drawMinimap();
  updateHud();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
  }
  if (event.code === 'KeyR') {
    resetGame();
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));

canvas.addEventListener('click', async () => {
  try {
    await canvas.requestPointerLock();
  } catch {
    pointerLocked = false;
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (pointerLocked) {
    setLog('Pointer locked. Hunt every red target in the maze.');
  }
});

document.addEventListener('mousemove', (event) => {
  if (!pointerLocked || player.health <= 0) return;
  player.angle += event.movementX * 0.0025;
});

resetGame();
requestAnimationFrame(frame);

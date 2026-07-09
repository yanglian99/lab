const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = {
  health: document.querySelector('#health'),
  ammo: document.querySelector('#ammo'),
  kills: document.querySelector('#kills'),
  total: document.querySelector('#total'),
  message: document.querySelector('#message'),
};

const map = [
  '############',
  '#....#.....#',
  '#.##.#.###.#',
  '#.#......#.#',
  '#.#.####.#.#',
  '#...#......#',
  '###.#.####.#',
  '#.....#....#',
  '#.#####.##.#',
  '#..........#',
  '############',
];
const tile = 48;
const keys = new Set();
let player, demons, shots, particles, gameOver, victory;

function reset() {
  player = { x: 78, y: 78, angle: 0, health: 100, ammo: 30, cooldown: 0 };
  demons = [
    { x: 430, y: 80, hp: 2 }, { x: 500, y: 270, hp: 2 },
    { x: 170, y: 440, hp: 2 }, { x: 455, y: 440, hp: 2 },
    { x: 790, y: 175, hp: 2 }, { x: 780, y: 430, hp: 2 },
  ];
  shots = [];
  particles = [];
  gameOver = false;
  victory = false;
  ui.total.textContent = demons.length;
  ui.message.textContent = 'Clear the dungeon before the imps catch you.';
}

function wallAt(x, y) {
  const row = Math.floor(y / tile);
  const col = Math.floor(x / tile);
  return map[row]?.[col] === '#';
}

function moveEntity(entity, dx, dy) {
  if (!wallAt(entity.x + dx, entity.y)) entity.x += dx;
  if (!wallAt(entity.x, entity.y + dy)) entity.y += dy;
}

function fire() {
  if (player.cooldown || player.ammo <= 0 || gameOver || victory) return;
  player.ammo--;
  player.cooldown = 18;
  shots.push({ x: player.x, y: player.y, vx: Math.cos(player.angle) * 13, vy: Math.sin(player.angle) * 13, life: 34 });
  ui.message.textContent = 'Boom!';
}

function update() {
  if (keys.has('r')) reset();
  if (gameOver || victory) return;

  const speed = 3.2;
  if (keys.has('arrowleft')) player.angle -= 0.065;
  if (keys.has('arrowright')) player.angle += 0.065;
  let dx = 0, dy = 0;
  if (keys.has('w')) { dx += Math.cos(player.angle) * speed; dy += Math.sin(player.angle) * speed; }
  if (keys.has('s')) { dx -= Math.cos(player.angle) * speed; dy -= Math.sin(player.angle) * speed; }
  if (keys.has('a')) { dx += Math.cos(player.angle - Math.PI / 2) * speed; dy += Math.sin(player.angle - Math.PI / 2) * speed; }
  if (keys.has('d')) { dx += Math.cos(player.angle + Math.PI / 2) * speed; dy += Math.sin(player.angle + Math.PI / 2) * speed; }
  moveEntity(player, dx, dy);
  if (player.cooldown) player.cooldown--;

  for (const demon of demons) {
    const angle = Math.atan2(player.y - demon.y, player.x - demon.x);
    moveEntity(demon, Math.cos(angle) * 1.1, Math.sin(angle) * 1.1);
    if (Math.hypot(player.x - demon.x, player.y - demon.y) < 28) {
      player.health -= 0.45;
      ui.message.textContent = 'The imps are clawing you!';
    }
  }

  for (const shot of shots) {
    shot.x += shot.vx; shot.y += shot.vy; shot.life--;
    if (wallAt(shot.x, shot.y)) shot.life = 0;
    for (const demon of demons) {
      if (Math.hypot(shot.x - demon.x, shot.y - demon.y) < 24 && shot.life > 0) {
        demon.hp--; shot.life = 0;
        particles.push({ x: demon.x, y: demon.y, life: 18 });
      }
    }
  }
  shots = shots.filter(s => s.life > 0);
  demons = demons.filter(d => d.hp > 0);
  particles = particles.filter(p => --p.life > 0);

  if (player.health <= 0) { gameOver = true; ui.message.textContent = 'You were overrun. Press R to restart.'; }
  if (demons.length === 0) { victory = true; ui.message.textContent = 'Dungeon cleared! Press R to play again.'; }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
    ctx.fillStyle = map[y][x] === '#' ? '#50251d' : '#231818';
    ctx.fillRect(x * tile, y * tile, tile, tile);
    ctx.strokeStyle = '#0006'; ctx.strokeRect(x * tile, y * tile, tile, tile);
  }

  ctx.strokeStyle = '#ffcf69'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.angle) * 35, player.y + Math.sin(player.angle) * 35); ctx.stroke();
  ctx.fillStyle = '#4ad0ff'; ctx.beginPath(); ctx.arc(player.x, player.y, 16, 0, Math.PI * 2); ctx.fill();

  for (const demon of demons) {
    ctx.fillStyle = '#b51e1e'; ctx.beginPath(); ctx.arc(demon.x, demon.y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34f'; ctx.fillRect(demon.x - 9, demon.y - 4, 6, 6); ctx.fillRect(demon.x + 3, demon.y - 4, 6, 6);
  }
  ctx.fillStyle = '#ffe66b';
  for (const shot of shots) { ctx.beginPath(); ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2); ctx.fill(); }
  for (const p of particles) { ctx.strokeStyle = `rgba(255,80,20,${p.life / 18})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 25 - p.life, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();

  if (gameOver || victory) {
    ctx.fillStyle = '#0009'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = victory ? '#ffd36b' : '#ff6060'; ctx.font = 'bold 54px Trebuchet MS'; ctx.textAlign = 'center';
    ctx.fillText(victory ? 'VICTORY' : 'GAME OVER', canvas.width / 2, canvas.height / 2);
  }
  ui.health.textContent = Math.max(0, Math.ceil(player.health));
  ui.ammo.textContent = player.ammo;
  ui.kills.textContent = Number(ui.total.textContent) - demons.length;
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.code === 'Space') fire(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
reset(); loop();

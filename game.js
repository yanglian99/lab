const canvas = document.querySelector('#arena');
const ctx = canvas.getContext('2d');

const ui = {
  wave: document.querySelector('#waveLabel'),
  score: document.querySelector('#scoreLabel'),
  hull: document.querySelector('#hullLabel'),
  fleet: document.querySelector('#fleetLabel'),
  enemies: document.querySelector('#enemyLabel'),
  orders: document.querySelector('#ordersLabel'),
  overlay: document.querySelector('#overlay'),
  overlayTitle: document.querySelector('#overlayTitle'),
  overlayText: document.querySelector('#overlayText'),
};

const formations = {
  wedge: [[0, 0], [-36, 38], [36, 38], [-72, 78], [72, 78], [0, 86]],
  wall: [[-92, 0], [-55, 0], [-18, 0], [18, 0], [55, 0], [92, 0]],
  orbital: [[0, -74], [64, -36], [64, 36], [0, 74], [-64, 36], [-64, -36]],
};

let state;
let keys = new Set();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min, max) => Math.random() * (max - min) + min;

function resetGame() {
  state = {
    running: true,
    formation: 'wedge',
    target: { x: canvas.width * 0.46, y: canvas.height * 0.55 },
    carrier: { x: canvas.width * 0.5, y: canvas.height * 0.78, hp: 100, radius: 22 },
    ships: [],
    enemies: [],
    bolts: [],
    particles: [],
    wave: 1,
    score: 0,
    spawnTimer: 0,
    waveTimer: 0,
    message: 'Move to center',
  };

  for (let i = 0; i < 6; i += 1) {
    state.ships.push({
      x: state.carrier.x + rand(-45, 45),
      y: state.carrier.y + rand(-26, 26),
      hp: 36,
      cooldown: rand(0, 0.45),
      radius: 9,
    });
  }

  document.querySelectorAll('.command').forEach((button) => {
    button.classList.toggle('active', button.dataset.formation === state.formation);
  });
  ui.overlay.classList.add('hidden');
  updateUi();
}

function spawnEnemy() {
  const side = Math.floor(rand(0, 4));
  const margin = 36;
  const enemy = {
    x: side === 0 ? -margin : side === 1 ? canvas.width + margin : rand(80, canvas.width - 80),
    y: side === 2 ? -margin : side === 3 ? canvas.height + margin : rand(50, canvas.height - 90),
    hp: 24 + state.wave * 4,
    maxHp: 24 + state.wave * 4,
    speed: rand(34, 52) + state.wave * 2,
    radius: 12,
    cooldown: rand(0.4, 1.2),
  };
  state.enemies.push(enemy);
}

function setFormation(name) {
  state.formation = name;
  state.message = `${name[0].toUpperCase()}${name.slice(1)} formation`;
  document.querySelectorAll('.command').forEach((button) => {
    button.classList.toggle('active', button.dataset.formation === name);
  });
  updateUi();
}

function issueMove(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  state.target = {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
  state.message = `Move to ${Math.round(state.target.x)}, ${Math.round(state.target.y)}`;
  addParticles(state.target.x, state.target.y, '#ffd166', 18);
  updateUi();
}

function closestEnemy(ship, range = 185) {
  let best = null;
  let bestDistance = range;
  for (const enemy of state.enemies) {
    const d = dist(ship, enemy);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function fireBolt(from, to, friendly) {
  state.bolts.push({
    x: from.x,
    y: from.y,
    tx: to.x,
    ty: to.y,
    target: to,
    friendly,
    speed: friendly ? 520 : 360,
    damage: friendly ? 12 : 8,
    life: 1.2,
  });
}

function addParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-90, 90),
      vy: rand(-90, 90),
      life: rand(0.25, 0.7),
      maxLife: 0.7,
      color,
    });
  }
}

function updateShips(dt) {
  const slots = formations[state.formation];
  state.ships.forEach((ship, index) => {
    const slot = slots[index % slots.length];
    const desired = { x: state.target.x + slot[0], y: state.target.y + slot[1] };
    const dx = desired.x - ship.x;
    const dy = desired.y - ship.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = keys.has('Shift') ? 225 : 155;
    ship.x += (dx / length) * Math.min(speed * dt, length);
    ship.y += (dy / length) * Math.min(speed * dt, length);
    ship.x = clamp(ship.x, 18, canvas.width - 18);
    ship.y = clamp(ship.y, 18, canvas.height - 18);

    ship.cooldown -= dt;
    const target = closestEnemy(ship);
    if (target && ship.cooldown <= 0) {
      fireBolt(ship, target, true);
      ship.cooldown = 0.42;
    }
  });
}

function updateEnemies(dt) {
  state.spawnTimer -= dt;
  state.waveTimer += dt;
  const maxEnemies = 4 + state.wave * 2;
  if (state.spawnTimer <= 0 && state.enemies.length < maxEnemies) {
    spawnEnemy();
    state.spawnTimer = Math.max(0.42, 1.5 - state.wave * 0.08);
  }

  for (const enemy of state.enemies) {
    const livingShips = state.ships.filter((ship) => ship.hp > 0);
    const target = livingShips.length && Math.random() > 0.35
      ? livingShips.reduce((best, ship) => (dist(enemy, ship) < dist(enemy, best) ? ship : best), livingShips[0])
      : state.carrier;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;

    if (length > 118) {
      enemy.x += (dx / length) * enemy.speed * dt;
      enemy.y += (dy / length) * enemy.speed * dt;
    }

    enemy.cooldown -= dt;
    if (length < 190 && enemy.cooldown <= 0) {
      fireBolt(enemy, target, false);
      enemy.cooldown = rand(0.9, 1.45);
    }
  }
}

function updateBolts(dt) {
  for (const bolt of state.bolts) {
    if (bolt.target && (bolt.target.hp <= 0 || (bolt.target !== state.carrier && !state.enemies.includes(bolt.target) && !state.ships.includes(bolt.target)))) {
      bolt.life = 0;
      continue;
    }

    const target = bolt.target || { x: bolt.tx, y: bolt.ty };
    const dx = target.x - bolt.x;
    const dy = target.y - bolt.y;
    const length = Math.hypot(dx, dy) || 1;
    bolt.x += (dx / length) * bolt.speed * dt;
    bolt.y += (dy / length) * bolt.speed * dt;
    bolt.life -= dt;

    if (Math.hypot(target.x - bolt.x, target.y - bolt.y) < 13) {
      target.hp -= bolt.damage;
      bolt.life = 0;
      addParticles(target.x, target.y, bolt.friendly ? '#49d8ff' : '#ff5e78', 7);
      if (target.hp <= 0 && target !== state.carrier) {
        addParticles(target.x, target.y, bolt.friendly ? '#ffd166' : '#ff5e78', 18);
        if (bolt.friendly) state.score += 100;
      }
    }
  }

  state.bolts = state.bolts.filter((bolt) => bolt.life > 0);
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  state.ships = state.ships.filter((ship) => ship.hp > 0);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateWave() {
  if (state.waveTimer > 30 || state.score >= state.wave * 900) {
    state.wave += 1;
    state.waveTimer = 0;
    state.carrier.hp = clamp(state.carrier.hp + 14, 0, 100);
    if (state.ships.length < 6) {
      state.ships.push({ x: state.carrier.x, y: state.carrier.y - 24, hp: 36, cooldown: 0, radius: 9 });
    }
    state.message = `Wave ${state.wave}: enemy pattern shifted`;
    addParticles(state.carrier.x, state.carrier.y, '#7ef29a', 28);
  }
}

function endGame(victory) {
  state.running = false;
  ui.overlayTitle.textContent = victory ? 'Fleet Trial Passed' : 'Carrier Disabled';
  ui.overlayText.textContent = victory
    ? `You cleared the command trial with ${state.score} points. The instructors are already designing a harder scenario.`
    : `Your squadron scored ${state.score} points before the carrier fell. Try a tighter formation and keep drones away from the hull.`;
  ui.overlay.classList.remove('hidden');
}

function update(dt) {
  if (!state.running) return;
  updateShips(dt);
  updateEnemies(dt);
  updateBolts(dt);
  updateParticles(dt);
  updateWave();

  if (state.carrier.hp <= 0 || state.ships.length === 0) endGame(false);
  if (state.wave >= 7) endGame(true);
  updateUi();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(73, 216, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawShip(ship, color = '#49d8ff') {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.target.x, state.target.y, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(state.target.x - 24, state.target.y);
  ctx.lineTo(state.target.x + 24, state.target.y);
  ctx.moveTo(state.target.x, state.target.y - 24);
  ctx.lineTo(state.target.x, state.target.y + 24);
  ctx.stroke();

  ctx.fillStyle = '#7ef29a';
  ctx.shadowColor = '#7ef29a';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(state.carrier.x, state.carrier.y, state.carrier.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#04101d';
  ctx.fillRect(state.carrier.x - 15, state.carrier.y - 4, 30, 8);

  state.ships.forEach((ship) => drawShip(ship));

  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = '#ff5e78';
    ctx.shadowColor = '#ff5e78';
    ctx.shadowBlur = 16;
    ctx.rotate(performance.now() / 900);
    ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(enemy.x - 16, enemy.y + 18, 32, 3);
    ctx.fillStyle = '#ff5e78';
    ctx.fillRect(enemy.x - 16, enemy.y + 18, 32 * Math.max(0, enemy.hp / enemy.maxHp), 3);
  }

  for (const bolt of state.bolts) {
    ctx.strokeStyle = bolt.friendly ? '#49d8ff' : '#ff5e78';
    ctx.lineWidth = bolt.friendly ? 3 : 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(bolt.x, bolt.y);
    ctx.lineTo(bolt.x + (bolt.friendly ? -8 : 8), bolt.y + 8);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateUi() {
  ui.wave.textContent = state.wave;
  ui.score.textContent = state.score;
  ui.hull.textContent = `${Math.max(0, Math.round(state.carrier.hp))}%`;
  ui.fleet.textContent = `${state.ships.length} ship${state.ships.length === 1 ? '' : 's'}`;
  ui.enemies.textContent = state.enemies.length;
  ui.orders.textContent = state.message;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.querySelectorAll('.command').forEach((button) => {
  button.addEventListener('click', () => setFormation(button.dataset.formation));
});

canvas.addEventListener('click', (event) => issueMove(event.clientX, event.clientY));
document.querySelector('#restartButton').addEventListener('click', resetGame);
document.querySelector('#overlayRestart').addEventListener('click', resetGame);
window.addEventListener('keydown', (event) => keys.add(event.key));
window.addEventListener('keyup', (event) => keys.delete(event.key));

resetGame();
requestAnimationFrame(loop);

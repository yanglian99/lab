const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const healthEl = document.querySelector('#health');
const timeEl = document.querySelector('#time');
const pulseEl = document.querySelector('#pulse');
const overlay = document.querySelector('#overlay');
const statusTitle = document.querySelector('#status-title');
const statusCopy = document.querySelector('#status-copy');
const startButton = document.querySelector('#start');

const keys = new Set();
const center = { x: canvas.width / 2, y: canvas.height / 2 };
let state;
let lastFrame = 0;
let animationId;

function reset() {
  state = {
    running: false,
    paused: false,
    over: false,
    won: false,
    score: 0,
    health: 100,
    timeLeft: 90,
    spawnTimer: 0,
    pulseCooldown: 0,
    pulseWave: 0,
    player: { x: center.x, y: center.y + 135, radius: 16, speed: 270 },
    drones: [],
    sparks: [],
  };
  updateHud();
  draw();
}

function startGame() {
  reset();
  state.running = true;
  overlay.classList.add('hidden');
  lastFrame = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  if (state.running && !state.paused && !state.over) update(dt);
  draw();
  if (state.running) animationId = requestAnimationFrame(loop);
}

function update(dt) {
  state.timeLeft -= dt;
  state.spawnTimer -= dt;
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulseWave = Math.max(0, state.pulseWave - dt * 360);

  movePlayer(dt);
  spawnDrones();
  updateDrones(dt);
  updateSparks(dt);
  checkEndState();
  updateHud();
}

function movePlayer(dt) {
  const p = state.player;
  const dx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  const dy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  p.x = clamp(p.x + (dx / length) * p.speed * dt, p.radius, canvas.width - p.radius);
  p.y = clamp(p.y + (dy / length) * p.speed * dt, p.radius, canvas.height - p.radius);
}

function spawnDrones() {
  if (state.spawnTimer > 0) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.hypot(canvas.width, canvas.height) / 2 + 40;
  const difficulty = 1 + (90 - state.timeLeft) / 90;
  state.drones.push({
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
    radius: 12,
    speed: 58 + Math.random() * 42 + difficulty * 24,
    hue: Math.random() > 0.8 ? '#ffd166' : '#ff2d3f',
  });
  state.spawnTimer = Math.max(0.18, 0.78 - difficulty * 0.18 - Math.random() * 0.18);
}

function updateDrones(dt) {
  const p = state.player;
  state.drones = state.drones.filter((drone) => {
    const targetAngle = Math.atan2(center.y - drone.y, center.x - drone.x);
    drone.x += Math.cos(targetAngle) * drone.speed * dt;
    drone.y += Math.sin(targetAngle) * drone.speed * dt;

    if (distance(drone, p) < drone.radius + p.radius) {
      destroyDrone(drone, 10);
      return false;
    }

    if (distance(drone, center) < drone.radius + 34) {
      state.health -= 12;
      burst(drone.x, drone.y, '#ff9aa2', 16);
      return false;
    }

    return true;
  });
}

function updateSparks(dt) {
  state.sparks = state.sparks.filter((spark) => {
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    return spark.life > 0;
  });
}

function pulseBlast() {
  if (!state.running || state.paused || state.over || state.pulseCooldown > 0) return;
  state.pulseCooldown = 8;
  state.pulseWave = 190;
  const p = state.player;
  state.drones = state.drones.filter((drone) => {
    if (distance(drone, p) <= 150) {
      destroyDrone(drone, 20);
      return false;
    }
    return true;
  });
}

function destroyDrone(drone, points) {
  state.score += points;
  burst(drone.x, drone.y, drone.hue, 12);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 150;
    state.sparks.push({ x, y, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.35 });
  }
}

function checkEndState() {
  if (state.health <= 0) finish(false, 'Core Breached', 'The drones cracked the command core. Reboot and try again.');
  if (state.timeLeft <= 0) finish(true, 'Lockdown Secured', `Final score: ${state.score}. The city survives another alert.`);
}

function finish(won, title, copy) {
  state.over = true;
  state.running = false;
  state.won = won;
  statusTitle.textContent = title;
  statusCopy.textContent = copy;
  startButton.textContent = 'Restart';
  overlay.classList.remove('hidden');
  updateHud();
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
  statusTitle.textContent = 'Paused';
  statusCopy.textContent = 'Press P to resume the defense.';
  startButton.textContent = 'Restart';
  overlay.classList.toggle('hidden', !state.paused);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawCore();
  state.drones.forEach(drawDrone);
  drawPlayer();
  drawSparks();
}

function drawGrid() {
  ctx.fillStyle = '#12050a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,45,63,.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) line(x, 0, x, canvas.height);
  for (let y = 0; y < canvas.height; y += 48) line(0, y, canvas.width, y);
}

function drawCore() {
  const danger = 1 - state.health / 100;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 42 + Math.sin(performance.now() / 130) * 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, ${Math.round(209 - danger * 120)}, 102, .18)`;
  ctx.fill();
  ctx.strokeStyle = state.health > 35 ? '#ffd166' : '#ff2d3f';
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(center.y - p.y, center.x - p.x));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (state.pulseWave > 0) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 190 - state.pulseWave, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawDrone(drone) {
  ctx.beginPath();
  ctx.arc(drone.x, drone.y, drone.radius, 0, Math.PI * 2);
  ctx.fillStyle = drone.hue;
  ctx.shadowColor = drone.hue;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawSparks() {
  state.sparks.forEach((spark) => {
    ctx.globalAlpha = Math.max(spark.life * 2, 0);
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x, spark.y, 3, 3);
    ctx.globalAlpha = 1;
  });
}

function updateHud() {
  scoreEl.textContent = state.score;
  healthEl.textContent = `${Math.max(0, Math.ceil(state.health))}%`;
  timeEl.textContent = Math.max(0, Math.ceil(state.timeLeft));
  pulseEl.textContent = state.pulseCooldown ? `${Math.ceil(state.pulseCooldown)}s` : 'Ready';
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === ' ' || key === 'enter') pulseBlast();
  if (key === 'p') togglePause();
});

window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener('click', startGame);
reset();

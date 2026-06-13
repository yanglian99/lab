const board = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const alertLevelEl = document.getElementById('alert-level');
const integrityEl = document.getElementById('integrity');
const waveEl = document.getElementById('wave');
const dangerBarEl = document.getElementById('danger-bar');
const statusMessageEl = document.getElementById('status-message');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlay-title');
const overlayTextEl = document.getElementById('overlay-text');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

const ALERT_LEVELS = [
  { label: 'GREEN', threshold: 0.25 },
  { label: 'YELLOW', threshold: 0.5 },
  { label: 'ORANGE', threshold: 0.75 },
  { label: 'RED', threshold: 1 },
];

const state = {
  running: false,
  paused: false,
  score: 0,
  integrity: 100,
  wave: 1,
  spawnTimer: 0,
  danger: 0.08,
  enemies: [],
  lastTime: 0,
  rafId: 0,
};

function resetGame() {
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.integrity = 100;
  state.wave = 1;
  state.spawnTimer = 0;
  state.danger = 0.08;
  state.lastTime = 0;

  for (const enemy of state.enemies) {
    enemy.element.remove();
  }
  state.enemies = [];

  hideOverlay();
  updateHud();
  statusMessageEl.textContent = 'Mission active. Neutralize incoming drones.';
  cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(gameLoop);
}

function updateHud() {
  scoreEl.textContent = state.score;
  integrityEl.textContent = `${Math.max(0, Math.round(state.integrity))}%`;
  waveEl.textContent = state.wave;
  dangerBarEl.style.width = `${Math.min(100, state.danger * 100)}%`;

  const currentAlert = ALERT_LEVELS.find((level) => state.danger <= level.threshold) ?? ALERT_LEVELS.at(-1);
  alertLevelEl.textContent = currentAlert.label;
}

function showOverlay(title, text) {
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
  overlayEl.classList.add('visible');
}

function hideOverlay() {
  overlayEl.classList.remove('visible');
}

function createEnemy() {
  const enemyEl = document.createElement('button');
  enemyEl.type = 'button';
  enemyEl.className = 'enemy';

  const size = 28 + Math.random() * 32 + state.wave * 1.5;
  const x = 8 + Math.random() * 84;
  const speed = 0.04 + Math.random() * 0.05 + state.wave * 0.006;
  const enemy = {
    x,
    y: -10,
    speed,
    size,
    element: enemyEl,
    destroyed: false,
  };

  enemyEl.style.setProperty('--size', `${size}px`);
  enemyEl.style.left = `${x}%`;
  enemyEl.style.top = `${enemy.y}%`;
  enemyEl.setAttribute('aria-label', 'Incoming hostile drone');

  enemyEl.addEventListener('click', () => destroyEnemy(enemy, true));
  board.appendChild(enemyEl);
  state.enemies.push(enemy);
}

function destroyEnemy(enemy, intercepted) {
  if (enemy.destroyed) return;

  enemy.destroyed = true;
  enemy.element.classList.add('hit');
  window.setTimeout(() => enemy.element.remove(), 180);

  if (intercepted) {
    state.score += 10;
    state.danger = Math.max(0.08, state.danger - 0.03);
    statusMessageEl.textContent = 'Direct hit. Airspace temporarily stabilized.';
  } else {
    state.integrity -= 12;
    state.danger = Math.min(1, state.danger + 0.09);
    statusMessageEl.textContent = 'Impact detected. City core integrity falling.';
  }

  state.enemies = state.enemies.filter((item) => item !== enemy);
  updateProgression();
  updateHud();

  if (state.integrity <= 0) {
    endGame(false);
  }
}

function updateProgression() {
  state.wave = 1 + Math.floor(state.score / 120);
  state.danger = Math.min(1, state.danger + 0.0025 * state.wave);
}

function endGame(victory) {
  state.running = false;
  cancelAnimationFrame(state.rafId);

  const title = victory ? 'Sector Secure' : 'City Lost';
  const text = victory
    ? `You held the line through wave ${state.wave} with a score of ${state.score}. Launch again for a harder run.`
    : `The defense grid failed at wave ${state.wave} with a score of ${state.score}. Restart and protect the city.`;

  showOverlay(title, text);
  statusMessageEl.textContent = victory ? 'Threats contained.' : 'Mission failed.';
}

function spawnInterval() {
  return Math.max(280, 900 - state.wave * 65 - state.danger * 180);
}

function gameLoop(timestamp) {
  if (!state.running || state.paused) return;

  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;
  state.spawnTimer += delta;

  if (state.spawnTimer >= spawnInterval()) {
    createEnemy();
    state.spawnTimer = 0;
  }

  for (const enemy of [...state.enemies]) {
    enemy.y += enemy.speed * delta;
    enemy.element.style.top = `${enemy.y}%`;

    if (enemy.y >= 87) {
      destroyEnemy(enemy, false);
    }
  }

  if (state.score >= 600) {
    endGame(true);
    return;
  }

  updateHud();
  state.rafId = requestAnimationFrame(gameLoop);
}

startButton.addEventListener('click', resetGame);

pauseButton.addEventListener('click', () => {
  if (!state.running) return;

  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? 'Resume' : 'Pause';

  if (state.paused) {
    showOverlay('Mission Paused', 'Resume when you are ready to continue the defense.');
  } else {
    hideOverlay();
    statusMessageEl.textContent = 'Mission resumed. Airspace is hostile.';
    state.lastTime = 0;
    state.rafId = requestAnimationFrame(gameLoop);
  }
});

overlayEl.addEventListener('click', () => {
  if (!state.running) return;
  if (!state.paused) return;

  state.paused = false;
  pauseButton.textContent = 'Pause';
  hideOverlay();
  state.lastTime = 0;
  statusMessageEl.textContent = 'Mission resumed. Stay sharp.';
  state.rafId = requestAnimationFrame(gameLoop);
});

updateHud();

import {
  LEVEL,
  TILE,
  applyMove,
  getCompanionHint,
  getCorePositions,
  initialState,
  positionKey,
} from './gameLogic.js';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const startButton = document.querySelector('#start-button');
const restartButton = document.querySelector('#restart-button');
const scoreEl = document.querySelector('#score');
const turnsEl = document.querySelector('#turns');
const coresEl = document.querySelector('#cores');
const threatEl = document.querySelector('#threat');
const hintEl = document.querySelector('#ai-hint');

const cellSize = canvas.width / LEVEL[0].length;
const totalCores = getCorePositions(LEVEL).length;
let state = initialState();

const palette = {
  floor: '#10172a',
  wall: '#24304f',
  grid: '#334155',
  player: '#67e8f9',
  sentinel: '#fb7185',
  core: '#facc15',
  exit: '#34d399',
  text: '#e2e8f0',
};

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

function drawTile(tile, x, y) {
  const px = x * cellSize;
  const py = y * cellSize;
  ctx.fillStyle = tile === TILE.WALL ? palette.wall : palette.floor;
  ctx.fillRect(px, py, cellSize, cellSize);
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, cellSize, cellSize);

  if (tile === TILE.CORE && !state.collected.has(positionKey({ x, y }))) {
    ctx.fillStyle = palette.core;
    ctx.beginPath();
    ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tile === TILE.EXIT) {
    ctx.fillStyle = palette.exit;
    drawRoundedRect(px + 18, py + 18, cellSize - 36, cellSize - 36, 12);
  }
}

function drawActor(position, color, label) {
  const px = position.x * cellSize;
  const py = position.y * cellSize;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.font = 'bold 22px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px + cellSize / 2, py + cellSize / 2);
}

function drawBoard() {
  LEVEL.forEach((row, y) => row.forEach((tile, x) => drawTile(tile, x, y)));
  drawActor(state.sentinel, palette.sentinel, 'S');
  drawActor(state.player, palette.player, 'P');
}

function updateHud() {
  scoreEl.textContent = state.score;
  turnsEl.textContent = state.turns;
  coresEl.textContent = `${state.collected.size}/${totalCores}`;
  const distance = Math.abs(state.player.x - state.sentinel.x) + Math.abs(state.player.y - state.sentinel.y);
  threatEl.textContent = distance <= 2 ? 'High' : distance <= 4 ? 'Medium' : 'Low';
  hintEl.textContent = getCompanionHint(state, LEVEL);
}

function showOverlay(title, body) {
  overlay.classList.add('visible');
  overlay.innerHTML = `<h2>${title}</h2><p>${body}</p><p class="controls">Move with WASD or arrow keys.</p>`;
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  updateHud();

  if (state.status === 'won') {
    showOverlay('Vault secured!', `${state.message} Final score: ${state.score}.`);
  } else if (state.status === 'lost') {
    showOverlay('Breach failed', `${state.message} Final score: ${state.score}.`);
  }
}

function startRound() {
  state = { ...initialState(), status: 'playing' };
  hideOverlay();
  render();
}

function restartRound() {
  state = initialState();
  showOverlay('Ready to breach?', 'Collect all three data cores, reach the exit, and avoid the sentinel firewall.');
  render();
}

function directionFromKey(key) {
  const input = key.toLowerCase();
  if (input === 'arrowup' || input === 'w') return 'up';
  if (input === 'arrowdown' || input === 's') return 'down';
  if (input === 'arrowleft' || input === 'a') return 'left';
  if (input === 'arrowright' || input === 'd') return 'right';
  return null;
}

window.addEventListener('keydown', (event) => {
  const direction = directionFromKey(event.key);
  if (!direction) return;
  event.preventDefault();
  state = applyMove(state, direction, LEVEL);
  render();
});

startButton.addEventListener('click', startRound);
restartButton.addEventListener('click', restartRound);

render();

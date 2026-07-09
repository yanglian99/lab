const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const playerScoreElement = document.getElementById('playerScore');
const computerScoreElement = document.getElementById('computerScore');
const statusMessage = document.getElementById('statusMessage');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');

const winningScore = 7;
const paddle = { width: 14, height: 96, margin: 28, speed: 9 };
const player = { x: paddle.margin, y: canvas.height / 2 - paddle.height / 2, score: 0 };
const computer = { x: canvas.width - paddle.margin - paddle.width, y: canvas.height / 2 - paddle.height / 2, score: 0 };
const ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 10, speedX: 6, speedY: 4 };
const keys = new Set();

let animationFrameId;
let running = false;
let paused = false;

function drawCourt() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#050812';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  context.lineWidth = 4;
  context.setLineDash([16, 18]);
  context.beginPath();
  context.moveTo(canvas.width / 2, 22);
  context.lineTo(canvas.width / 2, canvas.height - 22);
  context.stroke();
  context.setLineDash([]);
}

function drawPaddle(paddleOwner, color) {
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 18;
  context.fillRect(paddleOwner.x, paddleOwner.y, paddle.width, paddle.height);
  context.shadowBlur = 0;
}

function drawBall() {
  context.fillStyle = '#ffffff';
  context.shadowColor = '#ffffff';
  context.shadowBlur = 20;
  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
}

function render() {
  drawCourt();
  drawPaddle(player, '#5df2ff');
  drawPaddle(computer, '#ffcf5d');
  drawBall();
}

function clampPaddle(paddleOwner) {
  paddleOwner.y = Math.max(0, Math.min(canvas.height - paddle.height, paddleOwner.y));
}

function resetBall(direction = 1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speedX = 6 * direction;
  ball.speedY = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 3);
}

function updateScore() {
  playerScoreElement.textContent = player.score;
  computerScoreElement.textContent = computer.score;
}

function finishPoint(scoringPlayer) {
  scoringPlayer.score += 1;
  updateScore();

  if (player.score >= winningScore || computer.score >= winningScore) {
    running = false;
    paused = false;
    statusMessage.textContent = player.score > computer.score ? 'You won the match!' : 'Computer won the match. Try again!';
    cancelAnimationFrame(animationFrameId);
    render();
    return;
  }

  resetBall(scoringPlayer === player ? -1 : 1);
}

function movePlayer() {
  if (keys.has('w') || keys.has('arrowup')) player.y -= paddle.speed;
  if (keys.has('s') || keys.has('arrowdown')) player.y += paddle.speed;
  clampPaddle(player);
}

function moveComputer() {
  const computerCenter = computer.y + paddle.height / 2;
  const target = ball.y - computerCenter;
  computer.y += Math.max(-7, Math.min(7, target * 0.08));
  clampPaddle(computer);
}

function ballHitsPaddle(paddleOwner) {
  return ball.x - ball.radius < paddleOwner.x + paddle.width &&
    ball.x + ball.radius > paddleOwner.x &&
    ball.y + ball.radius > paddleOwner.y &&
    ball.y - ball.radius < paddleOwner.y + paddle.height;
}

function updateBall() {
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
    ball.speedY *= -1;
  }

  if (ballHitsPaddle(player) && ball.speedX < 0) {
    ball.speedX = Math.abs(ball.speedX) + 0.25;
    ball.speedY += (ball.y - (player.y + paddle.height / 2)) * 0.08;
  }

  if (ballHitsPaddle(computer) && ball.speedX > 0) {
    ball.speedX = -Math.abs(ball.speedX) - 0.25;
    ball.speedY += (ball.y - (computer.y + paddle.height / 2)) * 0.08;
  }

  if (ball.x < -ball.radius) finishPoint(computer);
  if (ball.x > canvas.width + ball.radius) finishPoint(player);
}

function gameLoop() {
  if (!running || paused) return;
  movePlayer();
  moveComputer();
  updateBall();
  render();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
  if (running && !paused) return;
  running = true;
  paused = false;
  statusMessage.textContent = 'Game on!';
  gameLoop();
}

function pauseGame() {
  if (!running) return;
  paused = !paused;
  statusMessage.textContent = paused ? 'Paused.' : 'Game on!';
  if (!paused) gameLoop();
}

function resetGame() {
  player.score = 0;
  computer.score = 0;
  player.y = canvas.height / 2 - paddle.height / 2;
  computer.y = canvas.height / 2 - paddle.height / 2;
  running = false;
  paused = false;
  updateScore();
  resetBall(Math.random() > 0.5 ? 1 : -1);
  statusMessage.textContent = 'Press Start Game to begin.';
  cancelAnimationFrame(animationFrameId);
  render();
}

function setPlayerYFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.height / rect.height;
  player.y = (event.clientY - rect.top) * scale - paddle.height / 2;
  clampPaddle(player);
  render();
}

canvas.addEventListener('pointermove', setPlayerYFromPointer);
canvas.addEventListener('pointerdown', setPlayerYFromPointer);
window.addEventListener('keydown', (event) => keys.add(event.key.toLowerCase()));
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
resetButton.addEventListener('click', resetGame);

resetGame();

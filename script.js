const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const difficultyEl = document.getElementById('difficulty');
const newGameEl = document.getElementById('newGame');

const game = new Chess();
let selected = null;
let legalMoves = [];
let thinking = false;

const pieceMap = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
};

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function renderBoard() {
  boardEl.innerHTML = '';
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const squareName = `${'abcdefgh'[col]}${8 - row}`;
      const square = document.createElement('button');
      square.className = `square ${(row + col) % 2 ? 'dark' : 'light'}`;
      square.dataset.square = squareName;
      square.addEventListener('click', () => onSquareClick(squareName));

      if (selected === squareName) square.classList.add('selected');
      if (legalMoves.includes(squareName)) square.classList.add('highlight');

      const piece = board[row][col];
      if (piece) {
        const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        square.textContent = pieceMap[key];
      }
      boardEl.appendChild(square);
    }
  }
}

function setStatus() {
  if (game.in_checkmate()) {
    statusEl.textContent = game.turn() === 'w' ? 'Checkmate. AI wins.' : 'Checkmate. You win!';
    return;
  }
  if (game.in_draw()) {
    statusEl.textContent = 'Draw game.';
    return;
  }
  if (thinking) {
    statusEl.textContent = 'AI is thinking...';
  } else {
    statusEl.textContent = game.turn() === 'w' ? 'Your move (White).' : 'AI to move (Black).';
  }
}

function onSquareClick(target) {
  if (thinking || game.turn() !== 'w' || game.game_over()) return;

  const piece = game.get(target);
  if (selected && legalMoves.includes(target)) {
    const move = game.move({ from: selected, to: target, promotion: 'q' });
    selected = null;
    legalMoves = [];
    renderBoard();
    if (move) {
      setStatus();
      queueAiMove();
      return;
    }
  }

  if (piece && piece.color === 'w') {
    selected = target;
    legalMoves = game.moves({ square: target, verbose: true }).map((m) => m.to);
  } else {
    selected = null;
    legalMoves = [];
  }

  renderBoard();
  setStatus();
}

function evaluatePosition() {
  const board = game.board();
  let score = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValues[piece.type] || 0;
      score += piece.color === 'b' ? value : -value;
    }
  }

  return score;
}

function minimax(depth, alpha, beta, maximizing) {
  if (depth === 0 || game.game_over()) return evaluatePosition();

  const moves = game.moves({ verbose: true });

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      const value = minimax(depth - 1, alpha, beta, false);
      game.undo();
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, alpha, beta, true);
    game.undo();
    best = Math.min(best, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return best;
}

function bestAiMove(depth) {
  let bestMove = null;
  let bestValue = -Infinity;

  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    const value = minimax(depth - 1, -Infinity, Infinity, false);
    game.undo();
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove;
}

function queueAiMove() {
  if (game.game_over()) {
    setStatus();
    return;
  }

  thinking = true;
  setStatus();

  setTimeout(() => {
    const depth = Number(difficultyEl.value);
    const move = bestAiMove(depth);
    if (move) game.move(move);
    thinking = false;
    renderBoard();
    setStatus();
  }, 120);
}

newGameEl.addEventListener('click', () => {
  game.reset();
  selected = null;
  legalMoves = [];
  thinking = false;
  renderBoard();
  setStatus();
});

renderBoard();
setStatus();

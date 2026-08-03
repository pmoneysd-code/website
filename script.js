const squares = document.querySelectorAll('.square');
const message = document.querySelector('#message');
const restartButton = document.querySelector('#restart-button');
const resetScoresButton = document.querySelector('#reset-scores-button');
const xScore = document.querySelector('#x-score');
const oScore = document.querySelector('#o-score');

const winningRows = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let currentPlayer = 'X';
let board = Array(9).fill('');
let gameOver = false;
let scores = { X: 0, O: 0 };

function playerName(player) {
  return player === 'X' ? 'Penny as Stitch' : "Grampa's unicorn";
}

function playerMarkup(player) {
  if (player === 'X') {
    return '<span class="stitch-token" aria-hidden="true"><span class="stitch-ear left"></span><span class="stitch-ear right"></span><span class="stitch-face"><span class="stitch-eyes">● ●</span><span class="stitch-nose">●</span></span></span>';
  }
  return '<span aria-hidden="true">🦄</span>';
}

function handleSquareClick(event) {
  const square = event.currentTarget;
  const index = [...squares].indexOf(square);

  if (board[index] || gameOver) return;

  board[index] = currentPlayer;
  square.innerHTML = playerMarkup(currentPlayer);
  square.classList.add(currentPlayer.toLowerCase());
  square.setAttribute('aria-label', `${square.getAttribute('aria-label')}: ${playerName(currentPlayer)}`);

  const winner = findWinner();
  if (winner) {
    gameOver = true;
    scores[currentPlayer]++;
    xScore.textContent = scores.X;
    oScore.textContent = scores.O;
    message.textContent = `Hooray! ${playerName(currentPlayer)} wins! 🎉`;
    winner.forEach(index => squares[index].classList.add('winner'));
    return;
  }

  if (board.every(square => square)) {
    gameOver = true;
    message.textContent = "It's a tie! Great game! 🤝";
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  message.textContent = `${playerName(currentPlayer)}'s turn — pick a square!`;
}

function findWinner() {
  return winningRows.find(row => row.every(index => board[index] === currentPlayer));
}

function startNewGame() {
  currentPlayer = 'X';
  board = Array(9).fill('');
  gameOver = false;
  squares.forEach(square => {
    square.textContent = '';
    square.classList.remove('x', 'o', 'winner');
  });
  message.textContent = "Penny as Stitch goes first — aloha!";
}

function resetScores() {
  scores = { X: 0, O: 0 };
  xScore.textContent = '0';
  oScore.textContent = '0';
  startNewGame();
}

squares.forEach(square => square.addEventListener('click', handleSquareClick));
restartButton.addEventListener('click', startNewGame);
resetScoresButton.addEventListener('click', resetScores);

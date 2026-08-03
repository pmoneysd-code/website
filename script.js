import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, get, onValue, ref, runTransaction } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCk4NGHEvJGY2E5dYHtE3gbD_dpUyPaVgc',
  authDomain: 'checkers-5571f.firebaseapp.com',
  databaseURL: 'https://checkers-5571f-default-rtdb.firebaseio.com',
  projectId: 'checkers-5571f',
  storageBucket: 'checkers-5571f.firebasestorage.app',
  messagingSenderId: '658264908038',
  appId: '1:658264908038:web:9106770ae847a2a7077e87'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const squares = [...document.querySelectorAll('.square')];
const message = document.querySelector('#message');
const restartButton = document.querySelector('#restart-button');
const resetScoresButton = document.querySelector('#reset-scores-button');
const xScore = document.querySelector('#x-score');
const oScore = document.querySelector('#o-score');
const createRoomButton = document.querySelector('#create-room-button');
const joinRoomButton = document.querySelector('#join-room-button');
const roomCodeInput = document.querySelector('#room-code-input');
const onlineStatus = document.querySelector('#online-status');

const winningRows = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8]
];

let userId = null;
let roomCode = null;
let playerRole = null;
let stopListening = null;
let game = newGame();

function newGame(scores = { X: 0, O: 0 }) {
  return { board: Array(9).fill(''), currentPlayer: 'X', gameOver: false, scores, winner: null, winningSquares: [] };
}

function playerName(player) {
  return player === 'X' ? 'Penny as Stitch' : "Grampa's unicorn";
}

function playerMarkup(player) {
  if (player === 'X') {
    return '<span class="stitch-token" aria-hidden="true"><span class="stitch-ear left"></span><span class="stitch-ear right"></span><span class="stitch-face"><span class="stitch-eyes">● ●</span><span class="stitch-nose">●</span></span></span>';
  }
  return '<span aria-hidden="true">🦄</span>';
}

function findWinner(board) {
  return winningRows.find(row => row.every(index => board[index] && board[index] === board[row[0]]));
}

function makeMove(currentGame, index) {
  if (currentGame.gameOver || currentGame.board[index]) return currentGame;

  const next = { ...currentGame, board: [...currentGame.board] };
  next.board[index] = next.currentPlayer;
  const winningSquares = findWinner(next.board);

  if (winningSquares) {
    next.gameOver = true;
    next.winner = next.currentPlayer;
    next.winningSquares = winningSquares;
    next.scores = { ...next.scores, [next.currentPlayer]: next.scores[next.currentPlayer] + 1 };
  } else if (next.board.every(Boolean)) {
    next.gameOver = true;
    next.winner = 'tie';
  } else {
    next.currentPlayer = next.currentPlayer === 'X' ? 'O' : 'X';
  }
  return next;
}

function render() {
  squares.forEach((square, index) => {
    const player = game.board[index];
    square.innerHTML = player ? playerMarkup(player) : '';
    square.classList.toggle('x', player === 'X');
    square.classList.toggle('o', player === 'O');
    square.classList.toggle('winner', game.winningSquares?.includes(index));
    square.setAttribute('aria-label', player ? `${index + 1}: ${playerName(player)}` : `Empty square ${index + 1}`);
  });
  xScore.textContent = game.scores.X;
  oScore.textContent = game.scores.O;

  if (game.winner === 'tie') message.textContent = "It's a tie! Great game! 🤝";
  else if (game.winner) message.textContent = `Hooray! ${playerName(game.winner)} wins! 🎉`;
  else if (roomCode && playerRole !== game.currentPlayer) message.textContent = `Waiting for ${playerName(game.currentPlayer)}...`;
  else message.textContent = `${playerName(game.currentPlayer)}'s turn — pick a square!`;
}

function makeRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

function listenToRoom() {
  stopListening?.();
  stopListening = onValue(ref(database, `rooms/${roomCode}/game`), snapshot => {
    if (snapshot.exists()) {
      game = snapshot.val();
      render();
    }
  }, error => onlineStatus.textContent = `The game needs a Firebase rule first: ${error.code}`);
}

async function createRoom() {
  if (!userId) return;
  onlineStatus.textContent = 'Making your game code...';
  for (let tries = 0; tries < 5; tries++) {
    const code = makeRoomCode();
    const roomRef = ref(database, `rooms/${code}`);
    const result = await runTransaction(roomRef, current => current || { game: newGame(), players: { X: userId }, madeAt: Date.now() });
    if (result.committed) {
      roomCode = code;
      playerRole = 'X';
      roomCodeInput.value = code;
      onlineStatus.textContent = `Your code is ${code}. Tell it to Grampa!`;
      listenToRoom();
      return;
    }
  }
  onlineStatus.textContent = 'Please try making the code again.';
}

async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!userId || !code) return onlineStatus.textContent = 'Type Grampa’s game code first.';
  const roomRef = ref(database, `rooms/${code}`);
  const room = await get(roomRef);
  if (!room.exists()) return onlineStatus.textContent = 'That code was not found. Check it and try again.';
  const playerRef = ref(database, `rooms/${code}/players/O`);
  const result = await runTransaction(playerRef, current => current || userId);
  if (!result.committed && result.snapshot.val() !== userId) return onlineStatus.textContent = 'This game already has two players.';
  roomCode = code;
  playerRole = 'O';
  onlineStatus.textContent = `Joined room ${code}! You are Grampa's unicorn.`;
  listenToRoom();
}

async function playSquare(index) {
  if (roomCode) {
    if (game.currentPlayer !== playerRole) return;
    await runTransaction(ref(database, `rooms/${roomCode}/game`), current => {
      if (!current || current.currentPlayer !== playerRole || current.board[index] || current.gameOver) return;
      return makeMove(current, index);
    });
  } else {
    game = makeMove(game, index);
    render();
  }
}

async function startNewGame() {
  if (roomCode) {
    await runTransaction(ref(database, `rooms/${roomCode}/game`), current => current ? newGame(current.scores) : current);
  } else {
    game = newGame(game.scores);
    render();
  }
}

async function resetScores() {
  if (roomCode) {
    await runTransaction(ref(database, `rooms/${roomCode}/game`), current => current ? newGame() : current);
  } else {
    game = newGame();
    render();
  }
}

squares.forEach((square, index) => square.addEventListener('click', () => {
  playSquare(index).catch(error => onlineStatus.textContent = `Move problem: ${error.code || error.message}. Tell Codex this message.`);
}));
restartButton.addEventListener('click', () => startNewGame().catch(error => onlineStatus.textContent = `New game problem: ${error.code || error.message}`));
resetScoresButton.addEventListener('click', () => resetScores().catch(error => onlineStatus.textContent = `Reset problem: ${error.code || error.message}`));
createRoomButton.addEventListener('click', () => createRoom().catch(error => onlineStatus.textContent = error.message));
joinRoomButton.addEventListener('click', () => joinRoom().catch(error => onlineStatus.textContent = error.message));

signInAnonymously(auth)
  .then(userCredential => {
    userId = userCredential.user.uid;
    onlineStatus.textContent = 'Ready! Make a code to invite Grampa.';
  })
  .catch(error => onlineStatus.textContent = `Firebase says: ${error.code}. Tell Codex this blue message.`);

render();

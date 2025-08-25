import { Request, Response } from 'express';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { database, PlayerData } from './database';
import { PlayerModel, LoginRequest, LoginResponse, getCoinChangeForResult, getResultMessage } from './models/Player';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://huong-othello.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://huong-othello.vercel.app']
      : ['http://localhost:3000'],
    methods: ["GET", "POST"]
  }
});

// Game state interfaces (unchanged)
interface Player {
  id: string;
  nickname: string;
  displayName: string;
  emoji: string;
  isReady: boolean;
  color?: 'black' | 'white';
  pieceEmoji?: {
    black: string;
    white: string;
  };
  coins: number;
  isAuthenticated: boolean;
  // NEW: Add disconnection tracking
  isConnected?: boolean;
  disconnectedAt?: number;
}

interface GameState {
  board: (number | null)[][];
  currentPlayer: 1 | 2;
  players: Player[];
  gameStatus: 'waiting' | 'playing' | 'finished';
  scores: { 1: number; 2: number };
  validMoves: number[][];
  timeLeft: number;
  winnerId?: string;
  lastMove?: { row: number; col: number; playerId: string };
  coinTransactions?: { playerId: string; nickname: string; oldCoins: number; newCoins: number; coinChange: number; result: string }[];
  coinsAwarded?: { playerId: string; amount: number; result: 'win' | 'lose' | 'draw' };
}

interface Room {
  id: string;
  gameState: GameState;
  messages: ChatMessage[];
  isAIGame?: boolean;
  aiDifficulty?: AIDifficulty;
  createdAt: number;
  lastActivity: number;
  // NEW: Track room creator and allow reconnection
  creatorNickname?: string;
  allowReconnection?: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface VoiceOffer {
  from: string;
  to: string;
  offer: any;
  nickname: string;
}

interface VoiceAnswer {
  from: string;
  to: string;
  answer: any;
}

interface VoiceIceCandidate {
  from: string;
  to: string;
  candidate: any;
}

enum AIDifficulty {  
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Store rooms and authenticated players
const rooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const authenticatedPlayers = new Map<string, PlayerModel>();

// NEW: Store player reconnection info
const playerRoomMapping = new Map<string, string>(); // nickname -> roomId for reconnection

const voiceRooms = new Map<string, Set<string>>();

// Room cleanup - UPDATED: More conservative cleanup
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 60 * 60 * 1000; // Increase to 60 minutes
  const DISCONNECTION_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes grace period

  for (const [roomId, room] of rooms.entries()) {
    // Don't delete room if it was recently active
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      // Check if room has disconnected players who might reconnect
      const hasDisconnectedPlayers = room.gameState.players.some(p => 
        !p.isConnected && p.disconnectedAt && (now - p.disconnectedAt) < DISCONNECTION_GRACE_PERIOD
      );

      // Only delete if no disconnected players in grace period
      if (!hasDisconnectedPlayers) {
        console.log(`🧹 Cleaning up inactive room: ${roomId}`);
        
        // Clear timer if exists
        if (roomTimers.has(roomId)) {
          clearInterval(roomTimers.get(roomId)!);
          roomTimers.delete(roomId);
        }

        // Remove player room mappings
        room.gameState.players.forEach(player => {
          playerRoomMapping.delete(player.displayName.toLowerCase());
        });

        // Remove voice room
        voiceRooms.delete(roomId);
        
        // Remove room
        rooms.delete(roomId);
      }
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// Helper function to create Player from database data
function createPlayerFromData(socketId: string, playerData: PlayerData, emoji: string, pieceEmoji?: any): Player {
  return {
    id: socketId,
    nickname: playerData.nickname.toLowerCase(),
    displayName: playerData.nickname,
    emoji: emoji,
    isReady: false,
    coins: playerData.coins,
    pieceEmoji: pieceEmoji,
    isAuthenticated: true,
    isConnected: true, // NEW: Track connection status
  };
}

// NEW: Helper function to handle player reconnection
function handlePlayerReconnection(socket: any, playerData: PlayerData, loginData: LoginRequest): boolean {
  const nickname = playerData.nickname.toLowerCase();
  const roomId = playerRoomMapping.get(nickname);
  
  if (!roomId) return false;
  
  const room = rooms.get(roomId);
  if (!room) {
    // Room was deleted, clean up mapping
    playerRoomMapping.delete(nickname);
    return false;
  }

  // Find the disconnected player in the room
  const playerIndex = room.gameState.players.findIndex(p => 
    p.displayName.toLowerCase() === nickname && !p.isConnected
  );

  if (playerIndex === -1) return false;

  // Reconnect the player
  const player = room.gameState.players[playerIndex];
  player.id = socket.id; // Update socket ID
  player.isConnected = true;
  player.disconnectedAt = undefined;
  player.emoji = loginData.emoji; // Update emoji if changed
  player.pieceEmoji = loginData.pieceEmoji; // Update piece emoji if changed
  player.coins = playerData.coins; // Update coins from database

  // Join the room
  socket.join(roomId);
  
  // Update room activity
  updateRoomActivity(roomId);

  // Notify room about reconnection
  io.to(roomId).emit('gameStateUpdate', room.gameState);
  
  // Send reconnection success to the player
  socket.emit('roomReconnected', { roomId, gameState: room.gameState });
  
  console.log(`🔄 Player reconnected: ${playerData.nickname} to room ${roomId}`);
  return true;
}

// Helper function to award coins and update database (unchanged)
function awardCoinsToPlayers(room: Room): void {
  if (room.gameState.gameStatus !== 'finished') return;
  
  const scores = room.gameState.scores;
  const player1 = room.gameState.players[0];
  const player2 = room.gameState.players[1];
  
  let player1Result: 'win' | 'lose' | 'draw';
  let player2Result: 'win' | 'lose' | 'draw';
  
  if (scores[1] > scores[2]) {
    player1Result = 'win';
    player2Result = 'lose';
  } else if (scores[2] > scores[1]) {
    player1Result = 'lose';
    player2Result = 'win';
  } else {
    player1Result = 'draw';
    player2Result = 'draw';
  }
  
  const coinTransactions: any[] = [];
  
  if (player1 && player1.id !== 'AI' && player1.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player1Result);
    const updatedPlayerData = database.updatePlayerCoins(player1.displayName, coinChange, player1Result);
    
    player1.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player1.id,
      nickname: player1.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player1Result
    });

    if (coinChange > 0) {
      room.gameState.coinsAwarded = {
        playerId: player1.id,
        amount: coinChange,
        result: player1Result
      };
    }
    
    console.log(`Player ${player1.displayName} ${player1Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  if (player2 && player2.id !== 'AI' && player2.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player2Result);
    const updatedPlayerData = database.updatePlayerCoins(player2.displayName, coinChange, player2Result);
    
    player2.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player2.id,
      nickname: player2.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player2Result
    });

    if (coinChange > 0 && (!room.gameState.coinsAwarded || coinChange >= room.gameState.coinsAwarded.amount)) {
      room.gameState.coinsAwarded = {
        playerId: player2.id,
        amount: coinChange,
        result: player2Result
      };
    }
    console.log(`Player ${player2.displayName} ${player2Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  room.gameState.coinTransactions = coinTransactions;
}

// Voice chat helper functions (unchanged)
function getPlayerRoom(socketId: string): string | null {
  for (const [roomId, room] of rooms.entries()) {
    if (room.gameState.players.some(p => p.id === socketId)) {
      return roomId;
    }
  }
  return null;
}

function notifyVoiceParticipants(roomId: string, event: string, data: any, excludeSocketId?: string) {
  const voiceParticipants = voiceRooms.get(roomId);
  if (voiceParticipants) {
    voiceParticipants.forEach(participantId => {
      if (participantId !== excludeSocketId) {
        io.to(participantId).emit(event, data);
      }
    });
  }
}

// Othello game logic (unchanged - keeping original implementation)
class OthelloGame {
  static DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  static createEmptyBoard(): (number | null)[][] {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    board[3][3] = 2;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = 2;
    
    return board;
  }

  static getValidMoves(board: (number | null)[][], player: number): number[][] {
    const validMoves: number[][] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === null && this.canPlacePiece(board, row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  static canPlacePiece(board: (number | null)[][], row: number, col: number, player: number): boolean {
    for (const [dr, dc] of this.DIRECTIONS) {
      if (this.wouldFlipInDirection(board, row, col, dr, dc, player)) {
        return true;
      }
    }
    return false;
  }

  static wouldFlipInDirection(
    board: (number | null)[][], 
    startRow: number, 
    startCol: number, 
    dr: number, 
    dc: number, 
    player: number
  ): boolean {
    const opponent = player === 1 ? 2 : 1;
    let r = startRow + dr;
    let c = startCol + dc;
    let hasOpponentPieces = false;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === null) return false;
      if (board[r][c] === opponent) {
        hasOpponentPieces = true;
      } else if (board[r][c] === player) {
        return hasOpponentPieces;
      }
      r += dr;
      c += dc;
    }
    
    return false;
  }

  static makeMove(board: (number | null)[][], row: number, col: number, player: number): (number | null)[][] {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;

    for (const [dr, dc] of this.DIRECTIONS) {
      this.flipPiecesInDirection(newBoard, row, col, dr, dc, player);
    }

    return newBoard;
  }

  static flipPiecesInDirection(
    board: (number | null)[][], 
    startRow: number, 
    startCol: number, 
    dr: number, 
    dc: number, 
    player: number
  ): void {
    if (!this.wouldFlipInDirection(board, startRow, startCol, dr, dc, player)) return;

    const opponent = player === 1 ? 2 : 1;
    let r = startRow + dr;
    let c = startCol + dc;

    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
      board[r][c] = player;
      r += dr;
      c += dc;
    }
  }

  static calculateScores(board: (number | null)[][]): { 1: number; 2: number } {
    const scores = { 1: 0, 2: 0 };
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === 1) scores[1]++;
        if (board[row][col] === 2) scores[2]++;
      }
    }
    
    return scores;
  }

  static isGameOver(board: (number | null)[][]): boolean {
    const player1Moves = this.getValidMoves(board, 1);
    const player2Moves = this.getValidMoves(board, 2);
    
    return player1Moves.length === 0 && player2Moves.length === 0;
  }

  static makeAIMove(board: (number | null)[][], difficulty: AIDifficulty): number[] | null {
    const validMoves = this.getValidMoves(board, 2);
    if (validMoves.length === 0) return null;

    switch (difficulty) {
      case AIDifficulty.EASY:
        return this.makeRandomMove(validMoves);
      case AIDifficulty.MEDIUM:
        return this.makeMediumMove(board, validMoves);
      case AIDifficulty.HARD:
        return this.makeHardMove(board, validMoves);
      default:
        return this.makeRandomMove(validMoves);
    }
  }

  static makeRandomMove(validMoves: number[][]): number[] {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  static makeMediumMove(board: (number | null)[][], validMoves: number[][]): number[] {
    const corners = validMoves.filter(([r, c]) => 
      (r === 0 || r === 7) && (c === 0 || c === 7)
    );
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    const edges = validMoves.filter(([r, c]) => 
      r === 0 || r === 7 || c === 0 || c === 7
    );
    if (edges.length > 0) {
      return edges[Math.floor(Math.random() * edges.length)];
    }

    return this.makeRandomMove(validMoves);
  }

  static makeHardMove(board: (number | null)[][], validMoves: number[][]): number[] {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const [row, col] = move;
      const newBoard = this.makeMove(board, row, col, 2);
      const score = this.evaluateBoard(newBoard, 2);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  static evaluateBoard(board: (number | null)[][], player: number): number {
    const scores = this.calculateScores(board);
    const opponent = player === 1 ? 2 : 1;
    
    let score = scores[player as 1 | 2] - scores[opponent as 1 | 2];
    
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [r, c] of corners) {
      if (board[r][c] === player) score += 25;
      if (board[r][c] === opponent) score -= 25;
    }
    
    for (let i = 0; i < 8; i++) {
      if (board[0][i] === player || board[7][i] === player || 
          board[i][0] === player || board[i][7] === player) {
        score += 5;
      }
      if (board[0][i] === opponent || board[7][i] === opponent || 
          board[i][0] === opponent || board[i][7] === opponent) {
        score -= 5;
      }
    }
    
    return score;
  }
}

// Helper functions
function generateRoomId(): string {
  let roomId: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (rooms.has(roomId) && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    throw new Error('Could not generate unique room ID');
  }
  
  return roomId;
}

function createInitialGameState(): GameState {
  return {
    board: OthelloGame.createEmptyBoard(),
    currentPlayer: 1,
    players: [],
    gameStatus: 'waiting',
    scores: { 1: 2, 2: 2 },
    validMoves: OthelloGame.getValidMoves(OthelloGame.createEmptyBoard(), 1),
    timeLeft: 30
  };
}

function updateRoomActivity(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.lastActivity = Date.now();
  }
}

function startTimer(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId)!);
  }

  room.gameState.timeLeft = 30;
  updateRoomActivity(roomId);
  
  const timer = setInterval(() => {
    room.gameState.timeLeft--;
    
    io.to(roomId).emit('timerUpdate', room.gameState.timeLeft);
    
    if (room.gameState.timeLeft <= 0) {
      handleTurnSkip(roomId);
    }
  }, 1000);

  roomTimers.set(roomId, timer);
}

function handleTurnSkip(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  updateRoomActivity(roomId);
  const currentPlayerNum = room.gameState.currentPlayer;
  const nextPlayerNum = currentPlayerNum === 1 ? 2 : 1;
  
  const nextPlayerMoves = OthelloGame.getValidMoves(room.gameState.board, nextPlayerNum);
  
  if (nextPlayerMoves.length > 0) {
    room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
    room.gameState.validMoves = nextPlayerMoves;
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
    if (aiPlayer && room.gameState.currentPlayer === (aiPlayer.color === 'black' ? 1 : 2)) {
      setTimeout(() => {
        makeAIMove(roomId);
      }, 1000);
    } else {
      startTimer(roomId);
    }
  } else {
    if (OthelloGame.isGameOver(room.gameState.board)) {
      room.gameState.gameStatus = 'finished';
      clearInterval(roomTimers.get(roomId)!);
      roomTimers.delete(roomId);
      
      const scores = OthelloGame.calculateScores(room.gameState.board);
      if (scores[1] > scores[2]) {
        room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
      } else if (scores[2] > scores[1]) {
        room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
      } else {
        room.gameState.winnerId = 'draw';
      }
      
      awardCoinsToPlayers(room);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
    } else {
      room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
      room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      startTimer(roomId);
    }
  }
}

function makeAIMove(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  updateRoomActivity(roomId);
  const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
  if (!aiPlayer) return;

  const difficulty = room.aiDifficulty || AIDifficulty.MEDIUM;
  
  const aiMove = OthelloGame.makeAIMove(room.gameState.board, difficulty);
  
  if (aiMove) {
    const [aiRow, aiCol] = aiMove;
    
    room.gameState.board = OthelloGame.makeMove(room.gameState.board, aiRow, aiCol, room.gameState.currentPlayer);
    room.gameState.scores = OthelloGame.calculateScores(room.gameState.board);
    room.gameState.lastMove = { row: aiRow, col: aiCol, playerId: aiPlayer.id };
    
    const humanPlayer = room.gameState.players.find(p => p.id !== 'AI');
    room.gameState.currentPlayer = (humanPlayer?.color === 'black' ? 1 : 2) as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    if (room.gameState.validMoves.length === 0) {
      if (OthelloGame.isGameOver(room.gameState.board)) {
        room.gameState.gameStatus = 'finished';
        clearInterval(roomTimers.get(roomId)!);
        roomTimers.delete(roomId);
        
        const scores = OthelloGame.calculateScores(room.gameState.board);
        if (scores[1] > scores[2]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
        } else if (scores[2] > scores[1]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
        } else {
          room.gameState.winnerId = 'draw';
        }
        
        awardCoinsToPlayers(room);
      } else {
        room.gameState.currentPlayer = (aiPlayer.color === 'black' ? 1 : 2) as 1 | 2;
        room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
        
        io.to(roomId).emit('gameStateUpdate', room.gameState);
        
        setTimeout(() => {
          makeAIMove(roomId);
        }, 1000);
        return;
      }
    }
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    if (room.gameState.gameStatus === 'playing') {
      startTimer(roomId);
    }
  } else {
    const humanPlayer = room.gameState.players.find(p => p.id !== 'AI');
    room.gameState.currentPlayer = (humanPlayer?.color === 'black' ? 1 : 2) as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    if (room.gameState.gameStatus === 'playing') {
      startTimer(roomId);
    }
  }
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // UPDATED: Player login with reconnection support
  socket.on('loginPlayer', (data: LoginRequest) => {
    console.log('🔐 Login request received:', { socketId: socket.id, nickname: data.nickname, emoji: data.emoji });
    
    try {
      const { nickname, emoji, pieceEmoji } = data;
      
      if (!nickname || nickname.trim().length === 0) {
        console.log('❌ Login failed: Empty nickname');
        socket.emit('loginResponse', {
          success: false,
          message: 'Nickname không được để trống'
        } as LoginResponse);
        return;
      }
      
      if (nickname.trim().length > 20) {
        console.log('❌ Login failed: Nickname too long');
        socket.emit('loginResponse', {
          success: false,
          message: 'Nickname không được dài quá 20 ký tự'
        } as LoginResponse);
        return;
      }
      
      const existingPlayer = database.getPlayer(nickname.trim());
      const isNewPlayer = !existingPlayer;
      
      const playerData = database.getOrCreatePlayer(nickname.trim());
      
      console.log('📊 Player data from database:', playerData);
      
      // NEW: Check for reconnection opportunity
      const reconnected = handlePlayerReconnection(socket, playerData, data);
      if (reconnected) {
        // Player was reconnected to existing room
        const playerModel: PlayerModel = {
          id: socket.id,
          nickname: playerData.nickname.toLowerCase(),
          displayName: playerData.nickname,
          emoji: emoji,
          coins: playerData.coins,
          isReady: false,
          pieceEmoji: pieceEmoji,
          isAuthenticated: true,
          stats: {
            gamesPlayed: playerData.gamesPlayed,
            gamesWon: playerData.gamesWon,
            gamesLost: playerData.gamesLost,
            gamesDraw: playerData.gamesDraw,
            winRate: playerData.gamesPlayed > 0 ? Math.round((playerData.gamesWon / playerData.gamesPlayed) * 100) : 0
          },
          lastPlayed: playerData.lastPlayed,
          createdAt: playerData.createdAt
        };
        
        authenticatedPlayers.set(socket.id, playerModel);
        
        socket.emit('loginResponse', {
          success: true,
          player: playerModel,
          isNewPlayer: false,
          message: `Đã kết nối lại! Chào mừng trở lại ${playerData.nickname}!`
        } as LoginResponse);
        return;
      }
      
      // Normal login process
      const playerModel: PlayerModel = {
        id: socket.id,
        nickname: playerData.nickname.toLowerCase(),
        displayName: playerData.nickname,
        emoji: emoji,
        coins: playerData.coins,
        isReady: false,
        pieceEmoji: pieceEmoji,
        isAuthenticated: true,
        stats: {
          gamesPlayed: playerData.gamesPlayed,
          gamesWon: playerData.gamesWon,
          gamesLost: playerData.gamesLost,
          gamesDraw: playerData.gamesDraw,
          winRate: playerData.gamesPlayed > 0 ? Math.round((playerData.gamesWon / playerData.gamesPlayed) * 100) : 0
        },
        lastPlayed: playerData.lastPlayed,
        createdAt: playerData.createdAt
      };
      
      authenticatedPlayers.set(socket.id, playerModel);
      
      console.log(`✅ Player logged in: ${playerData.nickname} (${isNewPlayer ? 'NEW' : 'EXISTING'}) - ${playerData.coins} coins`);
      
      const response: LoginResponse = {
        success: true,
        player: playerModel,
        isNewPlayer: isNewPlayer,
        message: isNewPlayer 
          ? `Chào mừng ${playerData.nickname}! Bạn được tặng 100 xu để bắt đầu!`
          : `Chào mừng trở lại ${playerData.nickname}! Bạn có ${playerData.coins} xu.`
      };
      
      console.log('📤 Sending login response:', response);
      socket.emit('loginResponse', response);
      
    } catch (error) {
      console.error('💥 Login error:', error);
      socket.emit('loginResponse', {
        success: false,
        message: 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.'
      } as LoginResponse);
    }
  });

  socket.on('getPlayerData', (nickname: string) => {
    try {
      const playerData = database.getPlayer(nickname.trim());
      if (playerData) {
        socket.emit('playerDataResponse', {
          success: true,
          player: playerData
        });
      } else {        
        socket.emit('playerDataResponse', {
          success: false,
          message: 'Không tìm thấy người chơi'
        });
      }
    } catch (error) {
      console.error('Get player data error:', error);
      socket.emit('playerDataResponse', {
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  });

  // UPDATED: Create room with better tracking
  socket.on('createRoom', (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    console.log('🏠 Create room request from:', socket.id, playerData);
    
    const authenticatedPlayer = authenticatedPlayers.get(socket.id);
    if (!authenticatedPlayer) {
      console.log('❌ Create room failed: Player not authenticated');
      socket.emit('error', 'Bạn cần đăng nhập trước khi tạo phòng');
      return;
    }

    try {
      const roomId = generateRoomId();
      const gameState = createInitialGameState();
      
      const player: Player = {
        id: socket.id,
        nickname: authenticatedPlayer.nickname,
        displayName: authenticatedPlayer.displayName,
        emoji: playerData.emoji,
        isReady: false,
        color: 'black',
        pieceEmoji: playerData.pieceEmoji,
        coins: authenticatedPlayer.coins,
        isAuthenticated: true,
        isConnected: true
      };
      
      gameState.players.push(player);
      
      const room: Room = {
        id: roomId,
        gameState,
        messages: [],
        isAIGame: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        creatorNickname: authenticatedPlayer.displayName.toLowerCase(), // Track creator
        allowReconnection: true // Allow reconnection for this room
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      // NEW: Track player-room mapping for reconnection
      playerRoomMapping.set(authenticatedPlayer.nickname, roomId);
      
      console.log(`✅ Room created: ${roomId} by ${authenticatedPlayer.displayName}`);
      socket.emit('roomCreated', { roomId, gameState });
      
    } catch (error) {
      console.error('💥 Create room error:', error);
      socket.emit('error', 'Không thể tạo phòng. Vui lòng thử lại.');
    }
  });

  // UPDATED: Join room with better error handling
  socket.on('joinRoom', (data: { roomId: string; playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } } }) => {
    console.log('🚀 Join room request:', data.roomId, 'from:', socket.id);
    
    const authenticatedPlayer = authenticatedPlayers.get(socket.id);
    if (!authenticatedPlayer) {
      console.log('❌ Join room failed: Player not authenticated');
      socket.emit('error', 'Bạn cần đăng nhập trước khi vào phòng');
      return;
    }

    const { roomId, playerData } = data;
    
    if (!roomId || roomId.length !== 6 || !/^[A-Z0-9]{6}$/.test(roomId)) {
      console.log('❌ Join room failed: Invalid room ID format:', roomId);
      socket.emit('error', 'Mã phòng không hợp lệ');
      return;
    }

    const room = rooms.get(roomId);
    
    if (!room) {
      console.log('❌ Join room failed: Room not found:', roomId);
      socket.emit('error', `Không tìm thấy phòng ${roomId}. Phòng có thể đã bị xóa hoặc không tồn tại.`);
      return;
    }
    
    // Check if room has space (accounting for disconnected players)
    const connectedPlayers = room.gameState.players.filter(p => p.isConnected);
    if (connectedPlayers.length >= 2) {
      console.log('❌ Join room failed: Room is full:', roomId);
      socket.emit('error', 'Phòng đã đầy. Không thể tham gia.');
      return;
    }

    // Check if player is already in the room but disconnected
    const existingPlayerIndex = room.gameState.players.findIndex(p => 
      p.displayName.toLowerCase() === authenticatedPlayer.nickname && !p.isConnected
    );

    if (existingPlayerIndex !== -1) {
      // Reconnect existing player
      const existingPlayer = room.gameState.players[existingPlayerIndex];
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      existingPlayer.disconnectedAt = undefined;
      existingPlayer.emoji = playerData.emoji;
      existingPlayer.pieceEmoji = playerData.pieceEmoji;
      existingPlayer.coins = authenticatedPlayer.coins;
      
      socket.join(roomId);
      updateRoomActivity(roomId);
      
      console.log(`🔄 Player reconnected to room: ${roomId} - ${authenticatedPlayer.displayName}`);
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      socket.emit('roomJoined', { roomId, gameState: room.gameState });
      return;
    }

    // Check if player is already connected in the room
    if (room.gameState.players.some(p => p.id === socket.id || 
        (p.displayName.toLowerCase() === authenticatedPlayer.nickname && p.isConnected))) {
      console.log('❌ Join room failed: Player already in room:', roomId);
      socket.emit('error', 'Bạn đã ở trong phòng này rồi.');
      return;
    }
    
    try {
      const player: Player = {
        id: socket.id,
        nickname: authenticatedPlayer.nickname,
        displayName: authenticatedPlayer.displayName,
        emoji: playerData.emoji,
        isReady: false,
        color: 'white',
        pieceEmoji: playerData.pieceEmoji,
        coins: authenticatedPlayer.coins,
        isAuthenticated: true,
        isConnected: true
      };
      
      room.gameState.players.push(player);
      updateRoomActivity(roomId);
      socket.join(roomId);
      
      // NEW: Track player-room mapping
      playerRoomMapping.set(authenticatedPlayer.nickname, roomId);
      
      console.log(`✅ Player joined room: ${roomId} - ${authenticatedPlayer.displayName}`);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      socket.emit('roomJoined', { roomId, gameState: room.gameState });
      
    } catch (error) {
      console.error('💥 Join room error:', error);
      socket.emit('error', 'Không thể vào phòng. Vui lòng thử lại.');
    }
  });

  // AI Game creation (unchanged but add tracking)
  socket.on('createAIGame', (data: { playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }; difficulty: AIDifficulty }) => {
    console.log('🤖 Create AI game request from:', socket.id, 'difficulty:', data.difficulty);
    
    const authenticatedPlayer = authenticatedPlayers.get(socket.id);
    if (!authenticatedPlayer) {
      console.log('❌ Create AI game failed: Player not authenticated');
      socket.emit('error', 'Bạn cần đăng nhập trước khi chơi với AI');
      return;
    }

    try {
      const roomId = generateRoomId();
      const gameState = createInitialGameState();
      
      const humanPlayer: Player = {
        id: socket.id,
        nickname: authenticatedPlayer.nickname,
        displayName: authenticatedPlayer.displayName,
        emoji: data.playerData.emoji,
        isReady: true,
        color: 'black',
        pieceEmoji: data.playerData.pieceEmoji,
        coins: authenticatedPlayer.coins,
        isAuthenticated: true,
        isConnected: true
      };
      
      const aiPlayer: Player = {
        id: 'AI',
        nickname: 'ai',
        displayName: `AI (${data.difficulty.toUpperCase()})`,
        emoji: '🤖',
        isReady: true,
        color: 'white',
        pieceEmoji: data.playerData.pieceEmoji,
        coins: 0,
        isAuthenticated: false,
        isConnected: true
      };
      
      gameState.players = [humanPlayer, aiPlayer];
      gameState.gameStatus = 'playing';
      
      const room: Room = {
        id: roomId,
        gameState,
        messages: [],
        isAIGame: true,
        aiDifficulty: data.difficulty,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        creatorNickname: authenticatedPlayer.displayName.toLowerCase(),
        allowReconnection: true
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      // NEW: Track player-room mapping for AI games too
      playerRoomMapping.set(authenticatedPlayer.nickname, roomId);
      
      startTimer(roomId);
      
      console.log(`✅ AI game created: ${roomId} by ${authenticatedPlayer.displayName} vs AI(${data.difficulty})`);
      socket.emit('aiGameCreated', { roomId, gameState, difficulty: data.difficulty });
      
    } catch (error) {
      console.error('💥 Create AI game error:', error);
      socket.emit('error', 'Không thể tạo game với AI. Vui lòng thử lại.');
    }
  });

  // Other socket handlers (unchanged)
  socket.on('playerReady', (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Phòng không tồn tại');
      return;
    }
    
    const player = room.gameState.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = true;
      updateRoomActivity(roomId);
      
      if (room.gameState.players.length === 1 && !player.color) {
        player.color = 'black';
      } else if (room.gameState.players.length === 2) {
        const p1 = room.gameState.players[0];
        const p2 = room.gameState.players[1];
        if (!p1.color || !p2.color) {
          p1.color = 'black';
          p2.color = 'white';
        }
      }

      if (room.gameState.players.length === 2 && 
          room.gameState.players.filter(p => p.isConnected).every(p => p.isReady)) {
        room.gameState.gameStatus = 'playing';
        startTimer(roomId);
      }
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
    }
  });

  socket.on('makeMove', (data: { roomId: string; row: number; col: number; difficulty?: AIDifficulty }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.gameState.gameStatus !== 'playing') {
      socket.emit('error', 'Game không khả dụng');
      return;
    }
    
    const currentPlayerObj = room.gameState.players.find(p => p.color === (room.gameState.currentPlayer === 1 ? 'black' : 'white'));
    
    if (!currentPlayerObj || currentPlayerObj.id !== socket.id) {
      socket.emit('error', 'Không phải lượt của bạn');
      return;
    }

    const validMove = room.gameState.validMoves.some(([r, c]) => r === data.row && c === data.col);
    if (!validMove) {
      socket.emit('error', 'Nước đi không hợp lệ');
      return;
    }
    
    updateRoomActivity(data.roomId);
    
    room.gameState.board = OthelloGame.makeMove(room.gameState.board, data.row, data.col, room.gameState.currentPlayer);
    room.gameState.scores = OthelloGame.calculateScores(room.gameState.board);
    room.gameState.lastMove = { row: data.row, col: data.col, playerId: currentPlayerObj.id };
    
    let nextPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
    room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    if (room.gameState.validMoves.length === 0) {
      let otherPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
      let otherPlayerMoves = OthelloGame.getValidMoves(room.gameState.board, otherPlayerNum);

      if (otherPlayerMoves.length === 0) {
        room.gameState.gameStatus = 'finished';
        clearInterval(roomTimers.get(data.roomId)!);
        roomTimers.delete(data.roomId);
        
        const scores = OthelloGame.calculateScores(room.gameState.board);
        if (scores[1] > scores[2]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
        } else if (scores[2] > scores[1]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
        } else {
          room.gameState.winnerId = 'draw';
        }
        
        awardCoinsToPlayers(room);
      } else {
        room.gameState.currentPlayer = otherPlayerNum as 1 | 2;
        room.gameState.validMoves = otherPlayerMoves;
      }
    }
    
    io.to(data.roomId).emit('gameStateUpdate', room.gameState);
    
    const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
    
    if (aiPlayer && room.gameState.gameStatus === 'playing' && room.gameState.currentPlayer === (aiPlayer.color === 'black' ? 1 : 2)) {
      setTimeout(() => {
        makeAIMove(data.roomId);
      }, 1000);
    } else if (room.gameState.gameStatus === 'playing') {
      startTimer(data.roomId);
    }
  });

  socket.on('newGame', (data: { roomId: string; isAI?: boolean; difficulty?: AIDifficulty } | string) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const isAI = typeof data === 'object' ? data.isAI : false;
    const difficulty = typeof data === 'object' ? data.difficulty : undefined;
    
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Phòng không tồn tại');
      return;
    }
    
    updateRoomActivity(roomId);
    
    if (roomTimers.has(roomId)) {
      clearInterval(roomTimers.get(roomId)!);
      roomTimers.delete(roomId);
    }

    const oldPlayers = room.gameState.players.map(p => {
      if (p.isAuthenticated && p.id !== 'AI') {
        const playerData = database.getPlayer(p.displayName);
        if (playerData) {
          return { ...p, coins: playerData.coins };
        }
      }
      return { ...p };
    });
    
    room.gameState = createInitialGameState();
    
    if (isAI && difficulty) {
      const humanPlayerData = oldPlayers.find(p => p.id !== 'AI');
      const aiPlayer: Player = {
        id: 'AI',
        nickname: 'ai',
        displayName: `AI (${difficulty.toUpperCase()})`,
        emoji: '🤖',
        isReady: true,
        color: 'white',
        pieceEmoji: humanPlayerData?.pieceEmoji,
        coins: 0,
        isAuthenticated: false,
        isConnected: true
      };
      
      if (humanPlayerData) {
        humanPlayerData.isReady = true;
        humanPlayerData.color = 'black';
        humanPlayerData.isConnected = true;
        room.gameState.players = [humanPlayerData, aiPlayer];
      } else {
        room.gameState.players = [aiPlayer];
      }
      
      room.gameState.gameStatus = 'playing';
      room.isAIGame = true;
      room.aiDifficulty = difficulty;
      
      startTimer(roomId);
    } else {
      room.gameState.players = oldPlayers.map((p, index) => ({ 
        ...p, 
        isReady: false,
        color: index === 0 ? 'black' : 'white',
        isConnected: p.id === 'AI' ? true : (p.isConnected || true) // Keep connection status
      }));
      
      room.isAIGame = false;
      room.aiDifficulty = undefined;
    }
    
    room.gameState.coinTransactions = undefined;
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
  });

  socket.on('sendMessage', (data: { roomId: string; message: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error', 'Phòng không tồn tại');
      return;
    }
    
    const player = room.gameState.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', 'Bạn không ở trong phòng này');
      return;
    }
    
    updateRoomActivity(data.roomId);
    
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: player.displayName,
      message: data.message,
      timestamp: Date.now()
    };
    
    room.messages.push(chatMessage);
    
    if (room.messages.length > 50) {
      room.messages = room.messages.slice(-50);
    }
    
    io.to(data.roomId).emit('newMessage', chatMessage);
  });

  // UPDATED: Disconnect handling with graceful disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const disconnectedPlayer = authenticatedPlayers.get(socket.id);
    if (disconnectedPlayer) {
      console.log(`👋 Player ${disconnectedPlayer.displayName} disconnected`);
    }
    authenticatedPlayers.delete(socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.gameState.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.gameState.players[playerIndex];
        console.log(`🚪 Player ${player.displayName} left room: ${roomId}`);
        
        // NEW: Mark player as disconnected instead of removing immediately
        player.isConnected = false;
        player.disconnectedAt = Date.now();
        
        updateRoomActivity(roomId);
        
        // Only remove player completely if this is an AI game or if game hasn't started
        if (room.isAIGame || room.gameState.gameStatus === 'waiting') {
          room.gameState.players.splice(playerIndex, 1);
          // Remove from reconnection mapping for AI games
          if (room.isAIGame) {
            playerRoomMapping.delete(player.displayName.toLowerCase());
          }
        }
        
        // Check if room should be deleted (only if no players left or all disconnected for too long)
        const connectedPlayers = room.gameState.players.filter(p => p.isConnected);
        
        if (connectedPlayers.length === 0) {
          // If no connected players, start a longer timer before deleting room
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom && currentRoom.gameState.players.filter(p => p.isConnected).length === 0) {
              console.log(`🗑️ Deleting room with no connected players: ${roomId}`);
              if (roomTimers.has(roomId)) {
                clearInterval(roomTimers.get(roomId)!);
                roomTimers.delete(roomId);
              }
              // Clean up player mappings
              currentRoom.gameState.players.forEach(p => {
                if (p.displayName) {
                  playerRoomMapping.delete(p.displayName.toLowerCase());
                }
              });
              rooms.delete(roomId);
            }
          }, 5 * 60 * 1000); // 5 minutes grace period
        } else {
          // Handle turn changes if current player disconnected
          const disconnectedPlayerColor = player.color;
          const currentPlayerColor = room.gameState.currentPlayer === 1 ? 'black' : 'white';

          if (disconnectedPlayerColor === currentPlayerColor && room.gameState.gameStatus === 'playing') {
            // Skip to other player's turn
            room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
            room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
            
            if (room.gameState.validMoves.length === 0 && OthelloGame.isGameOver(room.gameState.board)) {
              room.gameState.gameStatus = 'finished';
              if (roomTimers.has(roomId)) {
                clearInterval(roomTimers.get(roomId)!);
                roomTimers.delete(roomId);
              }
              const scores = OthelloGame.calculateScores(room.gameState.board);
              if (scores[1] > scores[2]) {
                room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
              } else if (scores[2] > scores[1]) {
                room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
              } else {
                room.gameState.winnerId = 'draw';
              }
              
              awardCoinsToPlayers(room);
            }
          }
          
          io.to(roomId).emit('gameStateUpdate', room.gameState);
        }
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    playersCount: database.getPlayerCount(),
    activeRooms: rooms.size,
    activeConnections: authenticatedPlayers.size
  });
});

// API endpoints (unchanged)
app.get('/api/player/:nickname', (req: Request, res: Response) => {
  try {
    const nickname = req.params.nickname;
    const playerData = database.getPlayer(nickname);
    
    if (playerData) {
      res.json({
        success: true,
        player: playerData
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topPlayers = database.getTopPlayers(limit);
    
    res.json({
      success: true,
      players: topPlayers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/room/:roomId', (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId.toUpperCase();
    const room = rooms.get(roomId);
    
    if (room) {
      res.json({
        success: true,
        room: {
          id: room.id,
          playersCount: room.gameState.players.length,
          connectedPlayersCount: room.gameState.players.filter(p => p.isConnected).length,
          gameStatus: room.gameState.gameStatus,
          isAIGame: room.isAIGame || false,
          createdAt: new Date(room.createdAt).toISOString(),
          lastActivity: new Date(room.lastActivity).toISOString()
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database loaded with ${database.getPlayerCount()} players`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'https://huong-othello.vercel.app' : 'http://localhost:3000'}`);
});

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
    ? ['https://huong-othello.vercel.app'] // Updated with your actual domain
    : ['http://localhost:3000'], // Frontend Next.js port
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://huong-othello.vercel.app'] // Updated with your actual domain
      : ['http://localhost:3000'], // Frontend Next.js port
    methods: ["GET", "POST"]
  }
});

// Game state interfaces
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
  coinsAwarded?: { playerId: string; amount: number; result: 'win' | 'lose' | 'draw' | 'surrender' };
  surrenderedPlayerId?: string; // NEW: Track who surrendered
}

interface Room {
  id: string;
  gameState: GameState;
  messages: ChatMessage[];
  isAIGame?: boolean;
  aiDifficulty?: AIDifficulty;
  createdAt: number;
  lastActivity: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// NEW: Voice chat interfaces
interface VoiceOffer {
  from: string;
  to: string;
  offer: any; // WebRTC offer object
  nickname: string;
}

interface VoiceAnswer {
  from: string;
  to: string;
  answer: any; // WebRTC answer object
}

interface VoiceIceCandidate {
  from: string;
  to: string;
  candidate: any; // WebRTC ICE candidate object
}
enum AIDifficulty {  
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Store rooms and authenticated players
const rooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const authenticatedPlayers = new Map<string, PlayerModel>(); // socketId -> PlayerModel

// NEW: Store voice chat participants per room
const voiceRooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds

// Room cleanup - Remove inactive rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      console.log(`🧹 Cleaning up inactive room: ${roomId}`);
      
      // Clear timer if exists
      if (roomTimers.has(roomId)) {
        clearInterval(roomTimers.get(roomId)!);
        roomTimers.delete(roomId);
      }

      // Remove voice room
      voiceRooms.delete(roomId);
      
      // Remove room
      rooms.delete(roomId);
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
    isAuthenticated: true
  };
}

// Helper function to award coins and update database
function awardCoinsToPlayers(room: Room): void {
  if (room.gameState.gameStatus !== 'finished') return;
  
  const scores = room.gameState.scores;
  const player1 = room.gameState.players[0];
  const player2 = room.gameState.players[1];
  
  let player1Result: 'win' | 'lose' | 'draw' | 'surrender';
  let player2Result: 'win' | 'lose' | 'draw' | 'surrender';
  
  // Check đầu hàng trước
  if (room.gameState.surrenderedPlayerId) {
    if (room.gameState.surrenderedPlayerId === player1?.id) {
      player1Result = 'surrender';
      player2Result = 'win';
    } else if (room.gameState.surrenderedPlayerId === player2?.id) {
      player1Result = 'win';
      player2Result = 'surrender';
    } else {
      // Fallback to normal scoring
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
    }
  } else {
    // Determine results normally
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
  }
  
  const coinTransactions: any[] = [];
  
  // Update player 1 (chỉ nếu là human player và authenticated)
  if (player1 && player1.id !== 'AI' && player1.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player1Result);
    const updatedPlayerData = database.updatePlayerCoins(player1.displayName, coinChange, player1Result);
    
    // Update player coins in room
    player1.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player1.id,
      nickname: player1.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player1Result
    });

    // Set coinsAwarded for the player who won (or got coins from draw)
    if (coinChange > 0) {
      room.gameState.coinsAwarded = {
        playerId: player1.id,
        amount: coinChange,
        result: player1Result
      };
    }
    
    console.log(`Player ${player1.displayName} ${player1Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  // Update player 2 (chỉ nếu là human player và authenticated)
  if (player2 && player2.id !== 'AI' && player2.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player2Result);
    const updatedPlayerData = database.updatePlayerCoins(player2.displayName, coinChange, player2Result);
    
    // Update player coins in room
    player2.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player2.id,
      nickname: player2.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player2Result
    });

    // Set coinsAwarded for the player who won (or got more coins from draw)
    // If both players get coins (draw), prioritize the one with higher amount or player2
    if (coinChange > 0 && (!room.gameState.coinsAwarded || coinChange >= room.gameState.coinsAwarded.amount)) {
      room.gameState.coinsAwarded = {
        playerId: player2.id,
        amount: coinChange,
        result: player2Result
      };
    }
    console.log(`Player ${player2.displayName} ${player2Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  // Set coin transactions info
  room.gameState.coinTransactions = coinTransactions;
}

// NEW: Helper functions for voice chat
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

// Othello game logic (unchanged)
class OthelloGame {
  static DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  static createEmptyBoard(): (number | null)[][] {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Initial setup
    board[3][3] = 2; // White
    board[3][4] = 1; // Black
    board[4][3] = 1; // Black
    board[4][4] = 2; // White
    
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

  // AI logic (unchanged)
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
    // Generate 6 character room ID with better randomness
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

  // **FIXED: Player login/authentication with better logging**
  socket.on('loginPlayer', (data: LoginRequest) => {
    console.log('🔍 Login request received:', { socketId: socket.id, nickname: data.nickname, emoji: data.emoji });
    
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
      
      // Check if player already exists
      const existingPlayer = database.getPlayer(nickname.trim());
      const isNewPlayer = !existingPlayer;
      
      // Get or create player in database
      const playerData = database.getOrCreatePlayer(nickname.trim());
      
      console.log('📊 Player data from database:', playerData);
      
      // Create player model
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
      
      // Store authenticated player
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

  // **NEW: Get player data**
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

  socket.on('createRoom', (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    console.log('🏠 Create room request from:', socket.id, playerData);
    
    // Check if player is authenticated
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
        isAuthenticated: true
      };
      
      gameState.players.push(player);
      
      const room: Room = {
        id: roomId,
        gameState,
        messages: [],
        isAIGame: false,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      console.log(`✅ Room created: ${roomId} by ${authenticatedPlayer.displayName}`);
      socket.emit('roomCreated', { roomId, gameState });
      
    } catch (error) {
      console.error('💥 Create room error:', error);
      socket.emit('error', 'Không thể tạo phòng. Vui lòng thử lại.');
    }
  });

  socket.on('joinRoom', (data: { roomId: string; playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } } }) => {
    console.log('🚀 Join room request:', data.roomId, 'from:', socket.id);
    
    // Check if player is authenticated
    const authenticatedPlayer = authenticatedPlayers.get(socket.id);
    if (!authenticatedPlayer) {
      console.log('❌ Join room failed: Player not authenticated');
      socket.emit('error', 'Bạn cần đăng nhập trước khi vào phòng');
      return;
    }

    const { roomId, playerData } = data;
    
    // Validate room ID format
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
    
    if (room.gameState.players.length >= 2) {
      console.log('❌ Join room failed: Room is full:', roomId);
      socket.emit('error', 'Phòng đã đầy. Không thể tham gia.');
      return;
    }

    // Check if player is already in the room
    if (room.gameState.players.some(p => p.id === socket.id)) {
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
        isAuthenticated: true
      };
      
      room.gameState.players.push(player);
      updateRoomActivity(roomId);
      socket.join(roomId);
      
      console.log(`✅ Player joined room: ${roomId} - ${authenticatedPlayer.displayName}`);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      socket.emit('roomJoined', { roomId, gameState: room.gameState });
      
    } catch (error) {
      console.error('💥 Join room error:', error);
      socket.emit('error', 'Không thể vào phòng. Vui lòng thử lại.');
    }
  });

  socket.on('createAIGame', (data: { playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }; difficulty: AIDifficulty }) => {
    console.log('🤖 Create AI game request from:', socket.id, 'difficulty:', data.difficulty);
    
    // Check if player is authenticated
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
        isAuthenticated: true
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
        isAuthenticated: false
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
        lastActivity: Date.now()
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      startTimer(roomId);
      
      console.log(`✅ AI game created: ${roomId} by ${authenticatedPlayer.displayName} vs AI(${data.difficulty})`);
      socket.emit('aiGameCreated', { roomId, gameState, difficulty: data.difficulty });
      
    } catch (error) {
      console.error('💥 Create AI game error:', error);
      socket.emit('error', 'Không thể tạo game với AI. Vui lòng thử lại.');
    }
  });

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

      if (room.gameState.players.length === 2 && room.gameState.players.every(p => p.isReady)) {
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
    
    // Make the move
    room.gameState.board = OthelloGame.makeMove(room.gameState.board, data.row, data.col, room.gameState.currentPlayer);
    room.gameState.scores = OthelloGame.calculateScores(room.gameState.board);
    room.gameState.lastMove = { row: data.row, col: data.col, playerId: currentPlayerObj.id };
    
    // Switch player
    let nextPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
    room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    // Check if current player has no moves
    if (room.gameState.validMoves.length === 0) {
      let otherPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
      let otherPlayerMoves = OthelloGame.getValidMoves(room.gameState.board, otherPlayerNum);

      if (otherPlayerMoves.length === 0) {
        // Both players have no moves, game over
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
        
        // Award coins to players
        awardCoinsToPlayers(room);
      } else {
        // Skip turn to the other player
        room.gameState.currentPlayer = otherPlayerNum as 1 | 2;
        room.gameState.validMoves = otherPlayerMoves;
      }
    }
    
    io.to(data.roomId).emit('gameStateUpdate', room.gameState);
    
    // Handle AI move if playing against AI
    const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
    
    if (aiPlayer && room.gameState.gameStatus === 'playing' && room.gameState.currentPlayer === (aiPlayer.color === 'black' ? 1 : 2)) {
      // AI's turn
      setTimeout(() => {
        makeAIMove(data.roomId);
      }, 1000);
    } else if (room.gameState.gameStatus === 'playing') {
      // Human player's turn
      startTimer(data.roomId);
    }
  });

  // NEW: Handle surrender game
  socket.on('surrenderGame', (roomId: string) => {
    console.log('🏃‍♂️ Surrender request from:', socket.id, 'in room:', roomId);
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log('❌ Surrender failed: Room not found');
      socket.emit('error', 'Phòng không tồn tại');
      return;
    }

    if (room.gameState.gameStatus !== 'playing') {
      console.log('❌ Surrender failed: Game not in playing status');
      socket.emit('error', 'Chỉ có thể đầu hàng khi game đang diễn ra!');
      return;
    }

    // Check if the surrendering player is in the game
    const surrenderingPlayer = room.gameState.players.find(p => p.id === socket.id);
    if (!surrenderingPlayer) {
      console.log('❌ Surrender failed: Player not in game');
      socket.emit('error', 'Bạn không ở trong game này!');
      return;
    }

    // Cannot surrender against AI in some cases, but allow for now
    // const opponentPlayer = room.gameState.players.find(p => p.id !== socket.id);
    
    try {
      // Set game as finished and mark who surrendered
      room.gameState.gameStatus = 'finished';
      room.gameState.surrenderedPlayerId = socket.id;
      
      // Clear timer
      if (roomTimers.has(roomId)) {
        clearInterval(roomTimers.get(roomId)!);
        roomTimers.delete(roomId);
      }

      // Determine winner (the other player)
      const winnerPlayer = room.gameState.players.find(p => p.id !== socket.id);
      if (winnerPlayer) {
        room.gameState.winnerId = winnerPlayer.id;
      }

      updateRoomActivity(roomId);
      
      // Award coins (surrendering player loses 10, winner gains 10)
      awardCoinsToPlayers(room);
      
      console.log(`✅ Player ${surrenderingPlayer.displayName} surrendered in room ${roomId}`);
      
      // Broadcast the updated game state
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      
    } catch (error) {
      console.error('💥 Surrender error:', error);
      socket.emit('error', 'Có lỗi xảy ra khi đầu hàng. Vui lòng thử lại.');
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

    // Store old player data and refresh their coins from database
    const oldPlayers = room.gameState.players.map(p => {
      if (p.isAuthenticated && p.id !== 'AI') {
        // Refresh coins from database
        const playerData = database.getPlayer(p.displayName);
        if (playerData) {
          return { ...p, coins: playerData.coins };
        }
      }
      return { ...p };
    });
    
    // Reset game state
    room.gameState = createInitialGameState();
    
    if (isAI && difficulty) {
      // AI game
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
        isAuthenticated: false
      };
      
      if (humanPlayerData) {
        humanPlayerData.isReady = true;
        humanPlayerData.color = 'black';
        room.gameState.players = [humanPlayerData, aiPlayer];
      } else {
        room.gameState.players = [aiPlayer];
      }
      
      room.gameState.gameStatus = 'playing';
      room.isAIGame = true;
      room.aiDifficulty = difficulty;
      
      startTimer(roomId);
    } else {
      // Human vs human game
      room.gameState.players = oldPlayers.map((p, index) => ({ 
        ...p, 
        isReady: false,
        color: index === 0 ? 'black' : 'white'
      }));
      
      room.isAIGame = false;
      room.aiDifficulty = undefined;
    }
    
    // Clear coin transactions for new game
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from authenticated players
    const disconnectedPlayer = authenticatedPlayers.get(socket.id);
    if (disconnectedPlayer) {
      console.log(`👋 Player ${disconnectedPlayer.displayName} disconnected`);
    }
    authenticatedPlayers.delete(socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.gameState.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        console.log(`🚪 Player left room: ${roomId}`);
        room.gameState.players.splice(playerIndex, 1);
        updateRoomActivity(roomId);
        
        if (room.gameState.players.length === 0) {
          console.log(`🗑️ Deleting empty room: ${roomId}`);
          if (roomTimers.has(roomId)) {
            clearInterval(roomTimers.get(roomId)!);
            roomTimers.delete(roomId);
          }
          rooms.delete(roomId);
        } else {
          const disconnectedPlayerColor = playerIndex === 0 ? 'black' : 'white';
          const currentPlayerColor = room.gameState.currentPlayer === 1 ? 'black' : 'white';

          if (disconnectedPlayerColor === currentPlayerColor) {
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
              
              // Award coins even if other player disconnected
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

// API endpoint to get player stats
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

// API endpoint to get leaderboard
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

// API endpoint to get room info (for debugging)
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

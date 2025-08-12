import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameState, ChatMessage, ThemeColors, BOARD_THEMES, AIDifficulty, CoinTransaction, getResultMessage } from '../types';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface GameContextType {
  gameState: GameState | null;
  roomId: string | null;
  messages: ChatMessage[];
  currentTheme: ThemeColors;
  isAIGame: boolean;
  aiDifficulty: AIDifficulty | null;
  isJoiningRoom: boolean;
  joinError: string | null;
  
  // Actions
  createRoom: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  joinRoom: (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  createAIGame: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => void;
  makeMove: (row: number, col: number) => void;
  startGame: () => void;
  newGame: () => void;
  sendMessage: (message: string) => void;
  setTheme: (theme: ThemeColors) => void;
  clearJoinError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { socket, currentPlayer, isConnected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(BOARD_THEMES[0]);
  const [isAIGame, setIsAIGame] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 GameContext: Setting up socket event listeners');

    // Clear previous listeners to prevent duplicates
    const eventNames = [
      'roomCreated',
      'roomJoined', 
      'aiGameCreated',
      'gameStateUpdate',
      'newMessage',
      'timerUpdate',
      'error'
    ];

    eventNames.forEach(eventName => {
      socket.removeAllListeners(eventName);
    });

    // Socket event listeners
    socket.on('roomCreated', (data: { roomId: string; gameState: GameState }) => {
      console.log('✅ Room created:', data.roomId);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      setIsJoiningRoom(false);
      setJoinError(null);
      toast.success(`Phòng đã tạo! Mã: ${data.roomId}`);
    });

    socket.on('roomJoined', (data: { roomId: string; gameState: GameState }) => {
      console.log('✅ Room joined:', data.roomId);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      setIsJoiningRoom(false);
      setJoinError(null);
      toast.success('Đã vào phòng thành công!');
    });

    socket.on('aiGameCreated', (data: { roomId: string; gameState: GameState; difficulty: AIDifficulty }) => {
      console.log('✅ AI game created:', data.roomId, data.difficulty);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(true);
      setAiDifficulty(data.difficulty);
      setIsJoiningRoom(false);
      setJoinError(null);
      toast.success(`Bắt đầu chơi với AI ${data.difficulty.toUpperCase()}!`);
    });

    socket.on('gameStateUpdate', (newGameState: GameState) => {
      console.log('🔄 Game state updated:', newGameState.gameStatus);
      setGameState(prevState => {
        // Show coin transaction notifications
        if (newGameState.coinTransactions && 
            newGameState.gameStatus === 'finished' &&
            (!prevState || !prevState.coinTransactions)) {
          
          // Find current player's transaction
          const playerTransaction = newGameState.coinTransactions.find(
            transaction => transaction.playerId === socket.id
          );
          
          if (playerTransaction) {
            const message = getResultMessage(
              playerTransaction.result as 'win' | 'lose' | 'draw', 
              playerTransaction.coinChange
            );
            
            // Show toast notification based on result
            if (playerTransaction.result === 'win') {
              toast.success(message, {
                duration: 5000,
                style: {
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '2px solid #f59e0b',
                },
                icon: '🏆',
              });
            } else if (playerTransaction.result === 'draw') {
              toast.success(message, {
                duration: 4000,
                style: {
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '2px solid #0891b2',
                },
                icon: '🤝',
              });
            } else if (playerTransaction.result === 'lose') {
              toast.error(message, {
                duration: 4000,
                style: {
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '2px solid #dc2626',
                },
                icon: '😔',
              });
            }
          }
        }
        
        return newGameState;
      });
    });

    socket.on('newMessage', (message: ChatMessage) => {
      console.log('💬 New message received');
      setMessages(prev => [...prev, message]);
    });

    socket.on('timerUpdate', (timeLeft: number) => {
      setGameState(prev => prev ? { ...prev, timeLeft } : null);
    });

    socket.on('error', (errorMessage: string) => {
      console.error('❌ Socket error:', errorMessage);
      setIsJoiningRoom(false);
      setJoinError(errorMessage);
      toast.error(errorMessage);
    });

    return () => {
      console.log('🧹 GameContext: Cleaning up socket listeners');
      eventNames.forEach(eventName => {
        socket.off(eventName);
      });
    };
  }, [socket, isConnected]);

  const createRoom = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer || !isConnected) {
      toast.error('Bạn cần đăng nhập và kết nối mạng trước!');
      return;
    }
    
    console.log('🏠 Creating room with player data:', playerData);
    setIsJoiningRoom(true);
    setJoinError(null);
    socket.emit('createRoom', playerData);
  };

  const joinRoom = (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer || !isConnected) {
      toast.error('Bạn cần đăng nhập và kết nối mạng trước!');
      return;
    }
    
    const trimmedRoomId = roomId.trim().toUpperCase();
    
    if (!trimmedRoomId || trimmedRoomId.length !== 6) {
      const errorMsg = 'Mã phòng phải có đúng 6 ký tự!';
      setJoinError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Validate room ID format (alphanumeric only)
    if (!/^[A-Z0-9]{6}$/.test(trimmedRoomId)) {
      const errorMsg = 'Mã phòng chỉ được chứa chữ cái và số!';
      setJoinError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    console.log('🚀 Joining room:', trimmedRoomId, 'with player data:', playerData);
    setIsJoiningRoom(true);
    setJoinError(null);
    
    // Emit join room event
    socket.emit('joinRoom', { roomId: trimmedRoomId, playerData });
    
    // Set timeout for join attempt
    const joinTimeout = setTimeout(() => {
      if (isJoiningRoom) {
        setIsJoiningRoom(false);
        const errorMsg = `Không thể vào phòng ${trimmedRoomId}. Phòng có thể không tồn tại hoặc đã đầy.`;
        setJoinError(errorMsg);
        toast.error(errorMsg);
      }
    }, 15000); // 15 second timeout

    // Clear timeout if join is successful
    const originalRoomJoinedHandler = socket.listeners('roomJoined')[0];
    socket.once('roomJoined', (...args) => {
      clearTimeout(joinTimeout);
      if (originalRoomJoinedHandler) {
        originalRoomJoinedHandler(...args);
      }
    });

    // Clear timeout if error occurs
    const originalErrorHandler = socket.listeners('error')[0];
    socket.once('error', (...args) => {
      clearTimeout(joinTimeout);
      if (originalErrorHandler) {
        originalErrorHandler(...args);
      }
    });
  };

  const createAIGame = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => {
    if (!socket || !currentPlayer || !isConnected) {
      toast.error('Bạn cần đăng nhập và kết nối mạng trước!');
      return;
    }
    
    console.log('🤖 Creating AI game with difficulty:', difficulty);
    setIsJoiningRoom(true);
    setJoinError(null);
    socket.emit('createAIGame', { playerData, difficulty });
  };

  const makeMove = (row: number, col: number) => {
    if (socket && roomId && isConnected) {
      const moveData = { roomId, row, col };
      if (isAIGame && aiDifficulty) {
        socket.emit('makeMove', { ...moveData, difficulty: aiDifficulty });
      } else {
        socket.emit('makeMove', moveData);
      }
    }
  };

  const startGame = () => {
    if (socket && roomId && isConnected) {
      socket.emit('playerReady', roomId);
    }
  };

  const newGame = () => {
    if (socket && roomId && isConnected) {
      // Send AI info if playing with AI
      if (isAIGame && aiDifficulty) {
        socket.emit('newGame', { roomId, isAI: true, difficulty: aiDifficulty });
        // Clear messages for AI games
        setMessages([]);
      } else {
        socket.emit('newGame', { roomId, isAI: false });
        // Keep chat history for human vs human games
      }
      toast.success('Ván mới đã được tạo!');
    }
  };

  const sendMessage = (message: string) => {
    if (socket && roomId && message.trim() && isConnected) {
      socket.emit('sendMessage', { roomId, message: message.trim() });
    }
  };

  const setTheme = (theme: ThemeColors) => {
    setCurrentTheme(theme);
    toast.success(`Đã chọn theme ${theme.name} ${theme.emoji}`);
  };

  const clearJoinError = () => {
    setJoinError(null);
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        roomId,
        messages,
        currentTheme,
        isAIGame,
        aiDifficulty,
        isJoiningRoom,
        joinError,
        createRoom,
        joinRoom,
        createAIGame,
        makeMove,
        startGame,
        newGame,
        sendMessage,
        setTheme,
        clearJoinError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

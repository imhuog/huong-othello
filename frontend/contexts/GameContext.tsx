// frontend/contexts/GameContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameState, ChatMessage, ThemeColors, BOARD_THEMES, AIDifficulty, CoinTransaction, getResultMessage } from '../types';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface GameContextType {
  gameState: GameState | null;
  roomId: string | null; // This is the main roomId that MainMenu uses
  currentRoomId: string | null; // FIXED: Expose currentRoomId for MainMenu
  messages: ChatMessage[];
  currentTheme: ThemeColors;
  isAIGame: boolean;
  aiDifficulty: AIDifficulty | null;
  
  // Actions
  createRoom: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  joinRoom: (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  createAIGame: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => void;
  makeMove: (row: number, col: number) => void;
  startGame: () => void;
  newGame: () => void;
  sendMessage: (message: string) => void;
  setTheme: (theme: ThemeColors) => void;
  surrenderGame: () => void;
  resetGameState: () => void; // FIXED: Add reset function for returning to menu
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
  const { socket, currentPlayer, refreshPlayerData } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Initialize with the classic theme (first theme in the array)
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(BOARD_THEMES[0]);
  const [isAIGame, setIsAIGame] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty | null>(null);

  // FIXED: Reset game state function
  const resetGameState = () => {
    setGameState(null);
    setRoomId(null);
    setMessages([]);
    setIsAIGame(false);
    setAiDifficulty(null);
    // Don't reset theme - let user keep their preferred theme
  };

  // Helper function to sync current player coins with game state
  const syncPlayerCoins = (gameState: GameState) => {
    if (!currentPlayer || !socket) return gameState;
    
    // Find current player in game state and update their coins
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === socket.id && player.isAuthenticated) {
        // Keep coins from current player (which should be fresh from database)
        return {
          ...player,
          coins: currentPlayer.coins
        };
      }
      return player;
    });

    return {
      ...gameState,
      players: updatedPlayers
    };
  };

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on('roomCreated', (data: { roomId: string; gameState: GameState }) => {
      console.log('🏠 Room created event received:', data.roomId); // Debug log
      setRoomId(data.roomId); // ✅ This should trigger the MainMenu useEffect
      // Sync coins when room is created
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success(`Phòng đã tạo! Mã: ${data.roomId}`);
    });

    socket.on('roomJoined', (data: { roomId: string; gameState: GameState }) => {
      console.log('🚀 Room joined event received:', data.roomId); // Debug log
      setRoomId(data.roomId);
      // Sync coins when joining room
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success('Đã vào phòng!');
    });

    socket.on('aiGameCreated', (data: { roomId: string; gameState: GameState; difficulty: AIDifficulty }) => {
      console.log('🤖 AI game created event received:', data.roomId); // Debug log
      setRoomId(data.roomId);
      // Sync coins when AI game is created
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(true);
      setAiDifficulty(data.difficulty);
      toast.success(`Bắt đầu chơi với AI ${data.difficulty.toUpperCase()}!`);
    });

    socket.on('gameStateUpdate', (newGameState: GameState) => {
      setGameState(prevState => {
        // Show coin transaction notifications
        if (newGameState.coinTransactions && 
            (newGameState.gameStatus === 'finished' || newGameState.gameStatus === 'surrendered') &&
            (!prevState || !prevState.coinTransactions)) {
          
          // Find current player's transaction
          const playerTransaction = newGameState.coinTransactions.find(
            transaction => transaction.playerId === socket.id
          );
          
          if (playerTransaction) {
            const message = getResultMessage(
              playerTransaction.result as 'win' | 'lose' | 'draw' | 'surrender', 
              playerTransaction.coinChange
            );
            
            // Refresh player data to get updated coins from database
            if (refreshPlayerData && currentPlayer) {
              refreshPlayerData(currentPlayer.displayName);
            }
            
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
            } else if (playerTransaction.result === 'surrender') {
              // Handle surrender notification
              toast.error(message, {
                duration: 5000,
                style: {
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '2px solid #ea580c',
                },
                icon: '🏃‍♂️',
              });
            }
          }
        }
        
        // Always sync player coins with current player data
        return syncPlayerCoins(newGameState);
      });
    });

    socket.on('newMessage', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('timerUpdate', (timeLeft: number) => {
      setGameState(prev => prev ? { ...prev, timeLeft } : null);
    });

    // FIXED: Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Lỗi kết nối! Vui lòng thử lại.');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        socket.connect();
      }
    });

    socket.on('error', (errorMessage: string) => {
      toast.error(errorMessage);
    });

    // FIXED: Handle room leave confirmation
    socket.on('roomLeft', () => {
      resetGameState();
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('aiGameCreated');
      socket.off('gameStateUpdate');
      socket.off('newMessage');
      socket.off('timerUpdate');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('error');
      socket.off('roomLeft');
    };
  }, [socket, currentPlayer, refreshPlayerData]);

  // Update game state when current player data changes (coins updated)
  useEffect(() => {
    if (currentPlayer && gameState) {
      setGameState(prevState => {
        if (!prevState) return prevState;
        return syncPlayerCoins(prevState);
      });
    }
  }, [currentPlayer?.coins]);

  const createRoom = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer) {
      toast.error('Bạn cần đăng nhập trước!');
      return;
    }
    console.log('📤 Creating room...'); // Debug log
    socket.emit('createRoom', playerData);
  };

  const joinRoom = (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer) {
      toast.error('Bạn cần đăng nhập trước!');
      return;
    }
    socket.emit('joinRoom', { roomId, playerData });
  };

  const createAIGame = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => {
    if (!socket || !currentPlayer) {
      toast.error('Bạn cần đăng nhập trước!');
      return;
    }
    socket.emit('createAIGame', { playerData, difficulty });
  };

  const makeMove = (row: number, col: number) => {
    if (socket && roomId) {
      const moveData = { roomId, row, col };
      if (isAIGame && aiDifficulty) {
        socket.emit('makeMove', { ...moveData, difficulty: aiDifficulty });
      } else {
        socket.emit('makeMove', moveData);
      }
    }
  };

  const startGame = () => {
    if (socket && roomId) {
      socket.emit('playerReady', roomId);
    }
  };

  const newGame = () => {
    if (socket && roomId) {
      // Refresh player data before starting new game
      if (refreshPlayerData && currentPlayer) {
        refreshPlayerData(currentPlayer.displayName);
      }
      
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
    if (socket && roomId && message.trim()) {
      socket.emit('sendMessage', { roomId, message: message.trim() });
    }
  };

  const setTheme = (theme: ThemeColors) => {
    setCurrentTheme(theme);
    toast.success(`Đã chọn theme ${theme.name} ${theme.emoji}`);
  };

  // Surrender function
  const surrenderGame = () => {
    if (!socket || !roomId || !gameState) {
      toast.error('Không thể đầu hàng lúc này!');
      return;
    }

    if (gameState.gameStatus !== 'playing') {
      toast.error('Chỉ có thể đầu hàng khi game đang diễn ra!');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      '🏃‍♂️ Bạn có chắc chắn muốn đầu hàng?\n\n' +
      '⚠️ Lưu ý: Bạn sẽ bị trừ 10 xu và người chơi còn lại sẽ được +10 xu.'
    );

    if (!confirmed) {
      return;
    }

    // Emit surrender event
    socket.emit('surrenderGame', roomId);
    
    toast.loading('Đang xử lý đầu hàng...', { duration: 2000 });
  };

  // FIXED: Enhanced leave room function
  const leaveRoom = () => {
    if (socket && roomId) {
      socket.emit('leaveRoom', roomId);
      resetGameState();
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        roomId, // ✅ This is what MainMenu component accesses as currentRoomId
        currentRoomId: roomId, // ✅ Both are the same value
        messages,
        currentTheme,
        isAIGame,
        aiDifficulty,
        createRoom,
        joinRoom,
        createAIGame,
        makeMove,
        startGame,
        newGame,
        sendMessage,
        setTheme,
        surrenderGame,
        resetGameState, // FIXED: Add reset function to context
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

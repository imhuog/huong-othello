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
  
  // Actions
  createRoom: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  joinRoom: (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  createAIGame: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => void;
  makeMove: (row: number, col: number) => void;
  startGame: () => void;
  newGame: () => void;
  sendMessage: (message: string) => void;
  setTheme: (theme: ThemeColors) => void;
  
  // Surrender functionality - renamed to match GameInfo.tsx usage
  requestSurrender: () => void;
  isSurrendering: boolean;
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
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(BOARD_THEMES[0]);
  const [isAIGame, setIsAIGame] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty | null>(null);
  
  // Surrender state
  const [isSurrendering, setIsSurrendering] = useState(false);

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
      setRoomId(data.roomId);
      // Sync coins when room is created
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success(`Phòng đã tạo! Mã: ${data.roomId}`);
    });

    socket.on('roomJoined', (data: { roomId: string; gameState: GameState }) => {
      setRoomId(data.roomId);
      // Sync coins when joining room
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success('Đã vào phòng!');
    });

    socket.on('aiGameCreated', (data: { roomId: string; gameState: GameState; difficulty: AIDifficulty }) => {
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

    // Handle surrender events
    socket.on('surrenderResponse', (data: { success: boolean; message?: string; gameState?: GameState }) => {
      setIsSurrendering(false);
      
      if (data.success && data.gameState) {
        // Update game state with new coins after surrender
        const syncedGameState = syncPlayerCoins(data.gameState);
        setGameState(syncedGameState);
        
        // Refresh player data to get updated coins
        if (refreshPlayerData && currentPlayer) {
          refreshPlayerData(currentPlayer.displayName);
        }
        
        toast.success(data.message || 'Đã đầu hàng!', {
          duration: 3000,
          icon: '🏳️',
        });
      } else {
        toast.error(data.message || 'Không thể đầu hàng!', {
          duration: 3000,
          icon: '❌',
        });
      }
    });

    socket.on('playerSurrendered', (data: { message: string; gameState: GameState }) => {
      // Update game state when opponent surrenders
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      
      // Refresh player data to get updated coins
      if (refreshPlayerData && currentPlayer) {
        refreshPlayerData(currentPlayer.displayName);
      }
      
      toast.success(data.message, {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid #059669',
        },
        icon: '🎉',
      });
    });

    socket.on('error', (errorMessage: string) => {
      toast.error(errorMessage);
      // Reset surrender state on error
      setIsSurrendering(false);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('aiGameCreated');
      socket.off('gameStateUpdate');
      socket.off('newMessage');
      socket.off('timerUpdate');
      socket.off('surrenderResponse');
      socket.off('playerSurrendered');
      socket.off('error');
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

  // Surrender function - renamed to match GameInfo.tsx usage
  const requestSurrender = () => {
    if (!socket || !roomId || !currentPlayer) {
      toast.error('Không thể đầu hàng lúc này!');
      return;
    }

    if (!gameState || gameState.gameStatus !== 'playing') {
      toast.error('Chỉ có thể đầu hàng khi đang chơi!');
      return;
    }

    if (isAIGame) {
      toast.error('Không thể đầu hàng khi chơi với AI!');
      return;
    }

    if (gameState.players.length < 2) {
      toast.error('Cần có 2 người chơi để đầu hàng!');
      return;
    }

    if (currentPlayer.coins < 10) {
      toast.error('Bạn cần ít nhất 10 xu để có thể đầu hàng!');
      return;
    }

    // Show confirmation dialog
    const confirmSurrender = window.confirm(
      '🏳️ Bạn có chắc chắn muốn đầu hàng?\n\n' +
      '• Bạn sẽ bị trừ 10 xu\n' +
      '• Đối thủ sẽ được cộng 10 xu\n' +
      '• Ván đấu sẽ kết thúc ngay lập tức'
    );

    if (confirmSurrender) {
      setIsSurrendering(true);
      socket.emit('surrender', { roomId });
      
      toast.loading('Đang xử lý đầu hàng...', {
        duration: 2000,
        icon: '⏳',
      });
    }
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
        createRoom,
        joinRoom,
        createAIGame,
        makeMove,
        startGame,
        newGame,
        sendMessage,
        setTheme,
        // Surrender functionality - using requestSurrender to match GameInfo.tsx
        requestSurrender,
        isSurrendering,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

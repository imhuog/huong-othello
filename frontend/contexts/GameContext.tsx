import React, { createContext, useContext, useState, useEffect } from 'react';
import { GameState, ChatMessage, ThemeColors, BOARD_THEMES, AIDifficulty, CoinTransaction, getResultMessage, SurrenderConfirmation } from '../types';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface GameContextType {
  gameState: GameState | null;
  roomId: string | null;
  messages: ChatMessage[];
  currentTheme: ThemeColors;
  isAIGame: boolean;
  aiDifficulty: AIDifficulty | null;
  // NEW: Surrender related states
  surrenderConfirmation: SurrenderConfirmation;
  
  // Actions
  createRoom: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  joinRoom: (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => void;
  createAIGame: (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => void;
  makeMove: (row: number, col: number) => void;
  startGame: () => void;
  newGame: () => void;
  sendMessage: (message: string) => void;
  setTheme: (theme: ThemeColors) => void;
  // NEW: Surrender actions
  showSurrenderDialog: () => void;
  confirmSurrender: () => void;
  cancelSurrender: () => void;
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
  // NEW: Surrender state
  const [surrenderConfirmation, setSurrenderConfirmation] = useState<SurrenderConfirmation>({ show: false });

  // Helper function to sync current player coins with game state
  const syncPlayerCoins = (gameState: GameState) => {
    if (!currentPlayer || !socket) return gameState;
    
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === socket.id && player.isAuthenticated) {
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

  // NEW: Listen for room reconnection events
  useEffect(() => {
    const handleRoomReconnected = (event: CustomEvent) => {
      const { roomId: reconnectedRoomId, gameState: reconnectedGameState } = event.detail;
      console.log('🏠 Room reconnected:', reconnectedRoomId);
      
      setRoomId(reconnectedRoomId);
      const syncedGameState = syncPlayerCoins(reconnectedGameState);
      setGameState(syncedGameState);
      
      // Determine if it's an AI game based on players
      const hasAIPlayer = reconnectedGameState.players.some((p: any) => p.id === 'AI');
      setIsAIGame(hasAIPlayer);
      
      if (hasAIPlayer) {
        // Extract AI difficulty from AI player's name
        const aiPlayer = reconnectedGameState.players.find((p: any) => p.id === 'AI');
        if (aiPlayer && aiPlayer.displayName) {
          const difficultyMatch = aiPlayer.displayName.match(/\((EASY|MEDIUM|HARD)\)/);
          if (difficultyMatch) {
            setAiDifficulty(difficultyMatch[1].toLowerCase() as AIDifficulty);
          }
        }
      } else {
        setAiDifficulty(null);
      }
      
      toast.success('Đã kết nối lại phòng game!', {
        duration: 3000,
        icon: '🔄'
      });
    };

    window.addEventListener('roomReconnected', handleRoomReconnected as EventListener);
    
    return () => {
      window.removeEventListener('roomReconnected', handleRoomReconnected as EventListener);
    };
  }, [socket, currentPlayer]);

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on('roomCreated', (data: { roomId: string; gameState: GameState }) => {
      setRoomId(data.roomId);
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success(`Phòng đã tạo! Mã: ${data.roomId}`);
    });

    socket.on('roomJoined', (data: { roomId: string; gameState: GameState }) => {
      setRoomId(data.roomId);
      const syncedGameState = syncPlayerCoins(data.gameState);
      setGameState(syncedGameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success('Đã vào phòng!');
    });

    socket.on('aiGameCreated', (data: { roomId: string; gameState: GameState; difficulty: AIDifficulty }) => {
      setRoomId(data.roomId);
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
          
          const playerTransaction = newGameState.coinTransactions.find(
            transaction => transaction.playerId === socket.id
          );
          
          if (playerTransaction) {
            const message = getResultMessage(
              playerTransaction.result as 'win' | 'lose' | 'draw', 
              playerTransaction.coinChange
            );
            
            if (refreshPlayerData && currentPlayer) {
              refreshPlayerData(currentPlayer.displayName);
            }
            
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
        
        return syncPlayerCoins(newGameState);
      });
    });

    // NEW: Listen for surrender events
    socket.on('surrenderResult', (data: { 
      success: boolean; 
      message?: string; 
      surrenderPlayer?: any; 
      winnerPlayer?: any;
      gameState?: GameState;
    }) => {
      if (data.success && data.gameState) {
        setGameState(syncPlayerCoins(data.gameState));
        
        // Refresh player data if current player was involved
        if (refreshPlayerData && currentPlayer && 
            (data.surrenderPlayer?.displayName === currentPlayer.displayName || 
             data.winnerPlayer?.displayName === currentPlayer.displayName)) {
          refreshPlayerData(currentPlayer.displayName);
        }
        
        // Show appropriate toast based on the result
        if (data.surrenderPlayer?.displayName === currentPlayer?.displayName) {
          toast.error(`Bạn đã đầu hàng và bị trừ 10 xu. Xu còn lại: ${data.surrenderPlayer.coins}`, {
            duration: 5000,
            style: {
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid #dc2626',
            },
            icon: '🏳️',
          });
        } else if (data.winnerPlayer?.displayName === currentPlayer?.displayName) {
          toast.success(`Đối thủ đã đầu hàng! Bạn được +10 xu. Tổng xu: ${data.winnerPlayer.coins}`, {
            duration: 5000,
            style: {
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid #059669',
            },
            icon: '🏆',
          });
        } else {
          toast.success(data.message || 'Có người chơi đã đầu hàng!', {
            duration: 3000,
            icon: '🏳️',
          });
        }
      } else {
        toast.error(data.message || 'Không thể đầu hàng!', {
          duration: 3000,
        });
      }
      
      // Hide surrender confirmation dialog
      setSurrenderConfirmation({ show: false });
    });

    socket.on('newMessage', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('timerUpdate', (timeLeft: number) => {
      setGameState(prev => prev ? { ...prev, timeLeft } : null);
    });

    socket.on('error', (errorMessage: string) => {
      toast.error(errorMessage);
      // Hide surrender confirmation on error
      setSurrenderConfirmation({ show: false });
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('aiGameCreated');
      socket.off('gameStateUpdate');
      socket.off('surrenderResult'); // NEW: Clean up surrender listener
      socket.off('newMessage');
      socket.off('timerUpdate');
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
      if (refreshPlayerData && currentPlayer) {
        refreshPlayerData(currentPlayer.displayName);
      }
      
      if (isAIGame && aiDifficulty) {
        socket.emit('newGame', { roomId, isAI: true, difficulty: aiDifficulty });
        setMessages([]);
      } else {
        socket.emit('newGame', { roomId, isAI: false });
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

  // NEW: Surrender functions
  const showSurrenderDialog = () => {
    if (!roomId) return;
    setSurrenderConfirmation({ show: true, roomId });
  };

  const confirmSurrender = () => {
    if (!socket || !roomId || !currentPlayer) {
      toast.error('Không thể đầu hàng lúc này!');
      setSurrenderConfirmation({ show: false });
      return;
    }

    // Check if game is in playing state
    if (!gameState || gameState.gameStatus !== 'playing') {
      toast.error('Chỉ có thể đầu hàng khi game đang diễn ra!');
      setSurrenderConfirmation({ show: false });
      return;
    }

    // Check if it's player's turn or if there are valid moves (to prevent surrender abuse)
    const currentPlayerObj = gameState.players.find(p => p.id === socket.id);
    if (!currentPlayerObj) {
      toast.error('Bạn không phải là người chơi trong game này!');
      setSurrenderConfirmation({ show: false });
      return;
    }

    // Emit surrender request
    socket.emit('surrender', {
      roomId: roomId,
      playerId: socket.id
    });

    toast.loading('Đang xử lý đầu hàng...', {
      duration: 2000,
    });
  };

  const cancelSurrender = () => {
    setSurrenderConfirmation({ show: false });
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
        surrenderConfirmation, // NEW
        createRoom,
        joinRoom,
        createAIGame,
        makeMove,
        startGame,
        newGame,
        sendMessage,
        setTheme,
        showSurrenderDialog, // NEW
        confirmSurrender, // NEW
        cancelSurrender, // NEW
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

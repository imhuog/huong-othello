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

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔗 Setting up GameContext socket listeners');

    // Socket event listeners
    socket.on('roomCreated', (data: { roomId: string; gameState: GameState }) => {
      console.log('✅ Room created successfully:', data.roomId);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      setMessages([]); // Clear messages for new room
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}?room=${data.roomId}`;
      
      toast.success(
        <div>
          <div className="font-bold">🏠 Phòng đã tạo!</div>
          <div className="text-sm mt-1">Mã: <span className="font-mono">{data.roomId}</span></div>
          <div className="text-xs text-gray-300 mt-2">Link chia sẻ đã được copy!</div>
        </div>,
        {
          duration: 8000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            fontWeight: 'bold',
            border: '2px solid #059669',
          },
          icon: '🎮'
        }
      );
      
      // Copy link to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareableLink).then(() => {
          console.log('📋 Shareable link copied to clipboard:', shareableLink);
        }).catch(err => {
          console.error('❌ Failed to copy link to clipboard:', err);
        });
      }
    });

    socket.on('roomJoined', (data: { roomId: string; gameState: GameState }) => {
      console.log('✅ Room joined successfully:', data.roomId);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(false);
      setAiDifficulty(null);
      toast.success('Đã vào phòng thành công! 🎯');
    });

    socket.on('aiGameCreated', (data: { roomId: string; gameState: GameState; difficulty: AIDifficulty }) => {
      console.log('✅ AI game created successfully:', { roomId: data.roomId, difficulty: data.difficulty });
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setIsAIGame(true);
      setAiDifficulty(data.difficulty);
      setMessages([]); // Clear messages for AI game
      toast.success(`Bắt đầu chơi với AI ${data.difficulty.toUpperCase()}! 🤖`);
    });

    socket.on('gameStateUpdate', (newGameState: GameState) => {
      console.log('🔄 Game state updated:', { 
        currentPlayer: newGameState.currentPlayer, 
        gameStatus: newGameState.gameStatus,
        scores: newGameState.scores 
      });
      
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
      console.log('💬 New message received:', message.message);
      setMessages(prev => [...prev, message]);
    });

    socket.on('timerUpdate', (timeLeft: number) => {
      setGameState(prev => prev ? { ...prev, timeLeft } : null);
    });

    socket.on('error', (errorMessage: string) => {
      console.error('❌ Socket error:', errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
        icon: '⚠️'
      });
    });

    return () => {
      console.log('🧹 Cleaning up GameContext socket listeners');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('aiGameCreated');
      socket.off('gameStateUpdate');
      socket.off('newMessage');
      socket.off('timerUpdate');
      socket.off('error');
    };
  }, [socket, isConnected]);

  const createRoom = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer) {
      console.error('❌ Cannot create room: socket or currentPlayer not available');
      toast.error('Bạn cần đăng nhập và kết nối trước!');
      return;
    }
    
    if (!isConnected) {
      console.error('❌ Cannot create room: not connected to server');
      toast.error('Chưa kết nối tới máy chủ!');
      return;
    }
    
    console.log('🏠 Creating room with player data:', playerData);
    socket.emit('createRoom', playerData);
  };

  const joinRoom = (roomId: string, playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    if (!socket || !currentPlayer) {
      console.error('❌ Cannot join room: socket or currentPlayer not available');
      toast.error('Bạn cần đăng nhập và kết nối trước!');
      return;
    }
    
    if (!isConnected) {
      console.error('❌ Cannot join room: not connected to server');
      toast.error('Chưa kết nối tới máy chủ!');
      return;
    }
    
    const cleanRoomId = roomId.trim().toUpperCase();
    
    if (!cleanRoomId) {
      console.error('❌ Cannot join room: empty room ID');
      toast.error('Vui lòng nhập mã phòng!');
      return;
    }
    
    console.log('🚀 Joining room:', { roomId: cleanRoomId, playerData });
    
    // Show loading toast
    const loadingToast = toast.loading('Đang vào phòng...', {
      duration: 10000 // Will be dismissed when we get response
    });
    
    socket.emit('joinRoom', { roomId: cleanRoomId, playerData });
    
    // Clear loading toast after a delay if no response
    setTimeout(() => {
      toast.dismiss(loadingToast);
    }, 10000);
  };

  const createAIGame = (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }, difficulty: AIDifficulty) => {
    if (!socket || !currentPlayer) {
      console.error('❌ Cannot create AI game: socket or currentPlayer not available');
      toast.error('Bạn cần đăng nhập và kết nối trước!');
      return;
    }
    
    if (!isConnected) {
      console.error('❌ Cannot create AI game: not connected to server');
      toast.error('Chưa kết nối tới máy chủ!');
      return;
    }
    
    console.log('🤖 Creating AI game:', { playerData, difficulty });
    socket.emit('createAIGame', { playerData, difficulty });
  };

  const makeMove = (row: number, col: number) => {
    if (!socket || !roomId) {
      console.error('❌ Cannot make move: socket or roomId not available');
      return;
    }
    
    console.log('🎯 Making move:', { roomId, row, col });
    
    const moveData = { roomId, row, col };
    if (isAIGame && aiDifficulty) {
      socket.emit('makeMove', { ...moveData, difficulty: aiDifficulty });
    } else {
      socket.emit('makeMove', moveData);
    }
  };

  const startGame = () => {
    if (!socket || !roomId) {
      console.error('❌ Cannot start game: socket or roomId not available');
      return;
    }
    
    console.log('▶️ Player ready for room:', roomId);
    socket.emit('playerReady', roomId);
  };

  const newGame = () => {
    if (!socket || !roomId) {
      console.error('❌ Cannot start new game: socket or roomId not available');
      return;
    }
    
    console.log('🔄 Starting new game:', { roomId, isAI: isAIGame, difficulty: aiDifficulty });
    
    // Send AI info if playing with AI
    if (isAIGame && aiDifficulty) {
      socket.emit('newGame', { roomId, isAI: true, difficulty: aiDifficulty });
      // Clear messages for AI games
      setMessages([]);
    } else {
      socket.emit('newGame', { roomId, isAI: false });
      // Keep chat history for human vs human games
    }
    toast.success('Ván mới đã được tạo! 🎮');
  };

  const sendMessage = (message: string) => {
    if (!socket || !roomId) {
      console.error('❌ Cannot send message: socket or roomId not available');
      return;
    }
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }
    
    console.log('💬 Sending message:', trimmedMessage);
    socket.emit('sendMessage', { roomId, message: trimmedMessage });
  };

  const setTheme = (theme: ThemeColors) => {
    console.log('🎨 Setting theme:', theme.name);
    setCurrentTheme(theme);
    toast.success(`Đã chọn theme ${theme.name} ${theme.emoji}`, {
      duration: 2000,
      icon: '🎨'
    });
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

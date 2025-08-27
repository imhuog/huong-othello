import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { LoginRequest, LoginResponse, PlayerModel } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  // Player authentication
  currentPlayer: PlayerModel | null;
  isAuthenticated: boolean;
  loginPlayer: (loginData: LoginRequest) => void;
  logoutPlayer: () => void;
  isLoggingIn: boolean;
  // NEW: Function to refresh player data from database
  refreshPlayerData: (nickname: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerModel | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 Initializing socket connection...');
    
   // Kết nối đến server Render cho production, localhost cho development
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://huong-othello.onrender.com'
      : 'http://localhost:3001';

    console.log('🌍 Connecting to:', serverUrl);
    
    try {
      const socketInstance = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      // Set socket ngay lập tức
      setSocket(socketInstance);

      // Connection event handlers
      socketInstance.on('connect', () => {
        console.log('✅ Socket connected successfully:', socketInstance.id);
        setIsConnected(true);
        setConnectionError(null);
        toast.success('Đã kết nối máy chủ game!', {
          duration: 2000,
          icon: '🎮'
        });
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
        
        // Don't show toast for intentional disconnects
        if (reason !== 'io client disconnect') {
          toast.error('Mất kết nối máy chủ game!', {
            duration: 3000,
            icon: '📡'
          });
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('🚫 Connection error:', error);
        setIsConnected(false);
        setConnectionError(error.message);
        
        toast.error(`Lỗi kết nối: ${error.message}`, {
          duration: 5000,
          icon: '⚠️'
        });
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setConnectionError(null);
        toast.success('Đã kết nối lại máy chủ!', {
          duration: 2000,
          icon: '🔄'
        });
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('🔄❌ Reconnection failed:', error);
        setConnectionError('Không thể kết nối lại');
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('💥 Reconnection failed completely');
        setConnectionError('Không thể kết nối tới máy chủ');
        toast.error('Không thể kết nối tới máy chủ. Vui lòng thử lại!', {
          duration: 10000,
          icon: '💥'
        });
      });

      // Handle login response - ĐÚNG EVENT NAME
      socketInstance.on('loginResponse', (response: LoginResponse) => {
        console.log('🔥 Login response received:', response);
        setIsLoggingIn(false);
        
        if (response.success && response.player) {
          setCurrentPlayer(response.player);
          setIsAuthenticated(true);
          
          // Save to localStorage with updated data
          localStorage.setItem('othello_player', JSON.stringify(response.player));
          
          // Show welcome message
          if (response.isNewPlayer) {
            toast.success(
              `🎉 ${response.message}`,
              {
                duration: 5000,
                style: {
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: '2px solid #059669',
                },
                icon: '🪙',
              }
            );
          } else {
            toast.success(response.message || 'Đăng nhập thành công!', {
              duration: 3000,
              icon: '✅'
            });
          }
        } else {
          toast.error(response.message || 'Đăng nhập thất bại!', {
            duration: 5000,
            icon: '❌'
          });
          setCurrentPlayer(null);
          setIsAuthenticated(false);
        }
      });

      // NEW: Handle player data response for refresh
      socketInstance.on('playerDataResponse', (response: { success: boolean; player?: PlayerModel; message?: string }) => {
        console.log('📊 Player data response received:', response);
        
        if (response.success && response.player) {
          // Update current player with fresh data from database
          const updatedPlayer: PlayerModel = {
            ...currentPlayer!,
            coins: response.player.coins,
          stats: response.player.stats ? {
  gamesPlayed: response.player.stats.gamesPlayed,    // ← SỬA: truy xuất từ stats
  gamesWon: response.player.stats.gamesWon,          // ← SỬA: truy xuất từ stats
  gamesLost: response.player.stats.gamesLost,        // ← SỬA: truy xuất từ stats  
  gamesDraw: response.player.stats.gamesDraw,        // ← SỬA: truy xuất từ stats
  winRate: response.player.stats.gamesPlayed > 0 ? Math.round((response.player.stats.gamesWon / response.player.stats.gamesPlayed) * 100) : 0
} : currentPlayer!.stats,
            lastPlayed: response.player.lastPlayed,
          };
          
          setCurrentPlayer(updatedPlayer);
          
          // Update localStorage with fresh data
          localStorage.setItem('othello_player', JSON.stringify(updatedPlayer));
          
          console.log('✅ Player data refreshed:', updatedPlayer.displayName, 'coins:', updatedPlayer.coins);
        } else {
          console.error('❌ Failed to refresh player data:', response.message);
        }
      });

      // NEW: Handle surrender events
      socketInstance.on('surrenderResponse', (response: { success: boolean; message?: string; gameState?: any }) => {
        console.log('🏳️ Surrender response received:', response);
        
        if (response.success) {
          // Player data will be refreshed by GameContext
          console.log('✅ Surrender successful');
        } else {
          console.error('❌ Surrender failed:', response.message);
        }
      });

      socketInstance.on('playerSurrendered', (data: { message: string; gameState: any; surrenderedPlayer: string }) => {
        console.log('🎉 Opponent surrendered:', data);
        console.log(`✅ ${data.surrenderedPlayer} đã đầu hàng, bạn thắng!`);
      });

      // Handle server errors
      socketInstance.on('error', (message: string) => {
        console.error('🚫 Socket error:', message);
        toast.error(message, {
          duration: 5000,
          icon: '⚠️'
        });
      });

      // Auto-login với delay nhỏ hơn
      const savedPlayerData = localStorage.getItem('othello_player');
      if (savedPlayerData) {
        try {
          const player = JSON.parse(savedPlayerData) as PlayerModel;
          console.log('📄 Auto-login with saved data:', player.displayName);
          
          // Giảm delay xuống và kiểm tra socket instance
          const autoLoginTimeout = setTimeout(() => {
            console.log('Socket connected:', socketInstance.connected);
            if (socketInstance.connected) {
              console.log('🚀 Attempting auto-login...');
              socketInstance.emit('loginPlayer', {
                nickname: player.displayName,
                emoji: player.emoji,
                pieceEmoji: player.pieceEmoji
              });
            } else {
              console.log('⏳ Socket not connected yet, waiting...');
              // Thử lại sau khi connect
              socketInstance.once('connect', () => {
                console.log('🚀 Auto-login after connection...');
                socketInstance.emit('loginPlayer', {
                  nickname: player.displayName,
                  emoji: player.emoji,
                  pieceEmoji: player.pieceEmoji
                });
              });
            }
          }, 1000); // Giảm từ 2000ms xuống 1000ms

          // Cleanup function
          return () => {
            clearTimeout(autoLoginTimeout);
            console.log('🧹 Cleaning up socket connection');
            socketInstance.disconnect();
          };
        } catch (error) {
          console.error('❌ Error loading saved player data:', error);
          localStorage.removeItem('othello_player');
        }
      }

      // Cleanup on unmount (fallback)
      return () => {
        console.log('🧹 Cleaning up socket connection (fallback)');
        if (socketInstance.connected) {
          socketInstance.disconnect();
        }
      };

    } catch (error) {
      console.error('💥 Failed to create socket:', error);
      setConnectionError('Không thể tạo kết nối socket');
      toast.error('Không thể khởi tạo kết nối!', {
        duration: 5000,
        icon: '💥'
      });
    }
  }, []); // Empty dependency array - only run once

  const loginPlayer = (loginData: LoginRequest) => {
    console.log('📤 Login attempt:', loginData);
    
    if (!socket) {
      console.error('❌ Socket not available');
      toast.error('Socket chưa được khởi tạo!');
      return;
    }

    // Validation trước khi check connection
    if (!loginData.nickname?.trim()) {
      toast.error('Vui lòng nhập nickname!');
      return;
    }

    if (loginData.nickname.trim().length > 20) {
      toast.error('Nickname không được dài quá 20 ký tự!');
      return;
    }

    if (!isConnected) {
      console.error('❌ Socket not connected');
      toast.error('Chưa kết nối tới máy chủ! Đang thử kết nối lại...');
      
      // Try to reconnect
      socket.connect();
      return;
    }

    setIsLoggingIn(true);
    console.log('📡 Emitting loginPlayer event with data:', loginData);
    
    // Emit the correct event name that matches backend
    socket.emit('loginPlayer', loginData);
    
    // Set timeout to handle no response - tăng timeout
    const loginTimeout = setTimeout(() => {
      console.log('⏰ Login timeout - isLoggingIn:', isLoggingIn);
      if (isLoggingIn) {
        setIsLoggingIn(false);
        toast.error('Không nhận được phản hồi từ máy chủ. Vui lòng thử lại!');
      }
    }, 15000); // Tăng từ 10s lên 15s

    // Clear timeout nếu nhận được response
    const clearTimeoutOnResponse = () => {
      clearTimeout(loginTimeout);
    };

    // Listen for response to clear timeout
    socket.once('loginResponse', clearTimeoutOnResponse);
  };

  // NEW: Function to refresh player data from database
  const refreshPlayerData = (nickname: string) => {
    console.log('🔄 Refreshing player data for:', nickname);
    
    if (!socket || !isConnected) {
      console.error('❌ Socket not available or not connected');
      return;
    }

    if (!nickname?.trim()) {
      console.error('❌ No nickname provided for refresh');
      return;
    }

    // Emit request to get fresh player data
    socket.emit('getPlayerData', nickname.trim());
  };

  const logoutPlayer = () => {
    console.log('🚪 Logging out player');
    setCurrentPlayer(null);
    setIsAuthenticated(false);
    setIsLoggingIn(false);
    
    // Clear saved data
    localStorage.removeItem('othello_player');
    
    toast.success('Đã đăng xuất!', {
      duration: 2000,
      icon: '👋'
    });
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    connectionError,
    currentPlayer,
    isAuthenticated,
    loginPlayer,
    logoutPlayer,
    isLoggingIn,
    refreshPlayerData // NEW: Add to context
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );

};

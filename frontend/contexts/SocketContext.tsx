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
  // Function to refresh player data from database
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

      // Handle login response
      socketInstance.on('loginResponse', (response: LoginResponse) => {
        console.log('🔥 Login response received:', response);
        setIsLoggingIn(false);
        
        if (response.success && response.player) {
          setCurrentPlayer(response.player);
          setIsAuthenticated(true);
          
          localStorage.setItem('othello_player', JSON.stringify(response.player));
          
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

      // NEW: Handle room reconnection
      socketInstance.on('roomReconnected', (data: { roomId: string; gameState: any }) => {
        console.log('🔄 Reconnected to room:', data.roomId);
        toast.success('Đã kết nối lại phòng game!', {
          duration: 3000,
          icon: '🏠'
        });
        
        // Emit event that GameContext can listen to
        window.dispatchEvent(new CustomEvent('roomReconnected', { detail: data }));
      });

      // Handle player data response for refresh
      socketInstance.on('playerDataResponse', (response: { success: boolean; player?: PlayerModel; message?: string }) => {
        console.log('📊 Player data response received:', response);
        
        if (response.success && response.player) {
          const updatedPlayer: PlayerModel = {
            ...currentPlayer!,
            coins: response.player.coins,
            stats: response.player.stats ? {
              gamesPlayed: response.player.stats.gamesPlayed,
              gamesWon: response.player.stats.gamesWon,
              gamesLost: response.player.stats.gamesLost,
              gamesDraw: response.player.stats.gamesDraw,
              winRate: response.player.stats.gamesPlayed > 0 ? Math.round((response.player.stats.gamesWon / response.player.stats.gamesPlayed) * 100) : 0
            } : currentPlayer!.stats,
            lastPlayed: response.player.lastPlayed,
          };
          
          setCurrentPlayer(updatedPlayer);
          localStorage.setItem('othello_player', JSON.stringify(updatedPlayer));
          
          console.log('✅ Player data refreshed:', updatedPlayer.displayName, 'coins:', updatedPlayer.coins);
        } else {
          console.error('❌ Failed to refresh player data:', response.message);
        }
      });

      // NEW: Handle surrender notification from other players
      socketInstance.on('playerSurrendered', (data: { 
        playerId: string; 
        playerName: string; 
        winnerId: string; 
        winnerName: string;
        coinTransactions?: any[];
        message?: string;
      }) => {
        console.log('🏳️ Player surrendered:', data);
        
        // Show notification about surrender
        if (data.playerId === socketInstance.id) {
          // This player surrendered
          toast.error(`Bạn đã đầu hàng! Trừ 10 xu.`, {
            duration: 5000,
            icon: '🏳️',
            style: {
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid #dc2626',
            },
          });
        } else {
          // Other player surrendered
          toast.success(`${data.playerName} đã đầu hàng! Bạn thắng và được +10 xu!`, {
            duration: 5000,
            icon: '🏆',
            style: {
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid #f59e0b',
            },
          });
        }
      });

      // NEW: Handle surrender request from other player
      socketInstance.on('surrenderRequested', (data: { playerId: string; playerName: string }) => {
        console.log('🏳️ Surrender requested by:', data.playerName);
        
        toast.info(`${data.playerName} đã yêu cầu đầu hàng`, {
          duration: 3000,
          icon: '🏳️'
        });
      });

      // Handle server errors
      socketInstance.on('error', (message: string) => {
        console.error('🚫 Socket error:', message);
        toast.error(message, {
          duration: 5000,
          icon: '⚠️'
        });
      });

      // Auto-login with saved data
      const savedPlayerData = localStorage.getItem('othello_player');
      if (savedPlayerData) {
        try {
          const player = JSON.parse(savedPlayerData) as PlayerModel;
          console.log('📄 Auto-login with saved data:', player.displayName);
          
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
              socketInstance.once('connect', () => {
                console.log('🚀 Auto-login after connection...');
                socketInstance.emit('loginPlayer', {
                  nickname: player.displayName,
                  emoji: player.emoji,
                  pieceEmoji: player.pieceEmoji
                });
              });
            }
          }, 1000);

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
  }, []);

  const loginPlayer = (loginData: LoginRequest) => {
    console.log('📤 Login attempt:', loginData);
    
    if (!socket) {
      console.error('❌ Socket not available');
      toast.error('Socket chưa được khởi tạo!');
      return;
    }

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
      socket.connect();
      return;
    }

    setIsLoggingIn(true);
    console.log('📡 Emitting loginPlayer event with data:', loginData);
    
    socket.emit('loginPlayer', loginData);
    
    const loginTimeout = setTimeout(() => {
      console.log('⏰ Login timeout - isLoggingIn:', isLoggingIn);
      if (isLoggingIn) {
        setIsLoggingIn(false);
        toast.error('Không nhận được phản hồi từ máy chủ. Vui lòng thử lại!');
      }
    }, 15000);

    const clearTimeoutOnResponse = () => {
      clearTimeout(loginTimeout);
    };

    socket.once('loginResponse', clearTimeoutOnResponse);
  };

  // Function to refresh player data from database
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

    socket.emit('getPlayerData', nickname.trim());
  };

  const logoutPlayer = () => {
    console.log('🚪 Logging out player');
    setCurrentPlayer(null);
    setIsAuthenticated(false);
    setIsLoggingIn(false);
    
    localStorage.removeItem('othello_player');
    
    toast.success('Đã đăng xuất!', {
      duration: 2000,
      icon: '👋'
    });
  };

  const contextValue: SocketContextType = {

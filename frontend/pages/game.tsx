import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import Board from '../components/Board';
import GameInfo from '../components/GameInfo';
import Chat from '../components/Chat';
import VoiceControls from '../components/VoiceControls';

const GamePage: React.FC = () => {
  const { gameState, currentTheme } = useGame();
  const { socket, currentPlayer } = useSocket();
  const router = useRouter();
  const [gameEndNotification, setGameEndNotification] = useState<{
    show: boolean;
    type: 'surrender' | 'normal' | 'timeout';
    message: string;
    isWinner: boolean;
  }>({
    show: false,
    type: 'normal',
    message: '',
    isWinner: false
  });

  // FIXED: Better back to menu handler
  const handleBackToMenu = () => {
    try {
      // Disconnect from current room if connected
      if (socket && socket.connected) {
        socket.emit('leaveRoom'); // Make sure backend handles this event
        socket.disconnect();
      }
      
      // Navigate back to home
      router.push('/').catch((error) => {
        console.error('Navigation error:', error);
        // Force reload as fallback
        window.location.href = '/';
      });
    } catch (error) {
      console.error('Error returning to menu:', error);
      // Force reload as fallback
      window.location.href = '/';
    }
  };

  // Handle game end notifications (surrender, timeout, normal win/lose)
  useEffect(() => {
    if (!gameState || !socket?.id) return;

    if (gameState.gameStatus === 'finished') {
      const currentPlayer = gameState.players.find(p => p.id === socket.id);
      
      if (gameState.surrenderedPlayerId) {
        // Handle surrender
        const surrenderedPlayer = gameState.players.find(p => p.id === gameState.surrenderedPlayerId);
        const winnerPlayer = gameState.players.find(p => p.id !== gameState.surrenderedPlayerId);
        
        if (surrenderedPlayer && winnerPlayer) {
          const isSurrenderedPlayer = gameState.surrenderedPlayerId === socket.id;
          const isWinnerPlayer = winnerPlayer.id === socket.id;
          
          setGameEndNotification({
            show: true,
            type: 'surrender',
            message: isSurrenderedPlayer 
              ? `Bạn đã đầu hàng và bị trừ 10 xu! ${winnerPlayer.displayName} thắng cuộc!`
              : `${surrenderedPlayer.displayName} đã đầu hàng! Bạn thắng và được +10 xu!`,
            isWinner: isWinnerPlayer
          });
        }
      } else {
        // Handle normal game end or draw
        if (gameState.winnerId === 'draw') {
          setGameEndNotification({
            show: true,
            type: 'normal',
            message: 'Game kết thúc hòa! Cả hai người chơi đều được +5 xu!',
            isWinner: false
          });
        } else if (gameState.winnerId) {
          const winner = gameState.players.find(p => p.id === gameState.winnerId);
          const isCurrentPlayerWinner = gameState.winnerId === socket.id;
          
          if (winner) {
            setGameEndNotification({
              show: true,
              type: 'normal',
              message: isCurrentPlayerWinner 
                ? `Chúc mừng! Bạn đã thắng và được +10 xu!`
                : `${winner.displayName} đã thắng! Bạn bị trừ 5 xu.`,
              isWinner: isCurrentPlayerWinner
            });
          }
        }
      }

      // Auto hide notification after 8 seconds
      const timer = setTimeout(() => {
        setGameEndNotification(prev => ({ ...prev, show: false }));
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStatus, gameState?.surrenderedPlayerId, gameState?.winnerId, gameState?.players, socket?.id]);

  // Listen for real-time surrender events from socket
  useEffect(() => {
    if (!socket) return;

    const handlePlayerSurrendered = (data: { 
      surrenderedPlayerId: string; 
      winnerPlayerId: string;
      surrenderedPlayerName: string;
      winnerPlayerName: string;
    }) => {
      const isCurrentPlayerSurrendered = data.surrenderedPlayerId === socket.id;
      const isCurrentPlayerWinner = data.winnerPlayerId === socket.id;

      // Show immediate notification for surrender event
      setGameEndNotification({
        show: true,
        type: 'surrender',
        message: isCurrentPlayerSurrendered
          ? `Bạn đã đầu hàng! ${data.winnerPlayerName} thắng cuộc!`
          : isCurrentPlayerWinner
          ? `${data.surrenderedPlayerName} đã đầu hàng! Bạn thắng cuộc!`
          : `${data.surrenderedPlayerName} đã đầu hàng!`,
        isWinner: isCurrentPlayerWinner
      });
    };

    const handleGameTimeout = (data: {
      timeoutPlayerId: string;
      winnerPlayerId: string;
      timeoutPlayerName: string;
      winnerPlayerName: string;
    }) => {
      const isCurrentPlayerTimeout = data.timeoutPlayerId === socket.id;
      const isCurrentPlayerWinner = data.winnerPlayerId === socket.id;

      setGameEndNotification({
        show: true,
        type: 'timeout',
        message: isCurrentPlayerTimeout
          ? `Bạn đã hết thời gian! ${data.winnerPlayerName} thắng cuộc!`
          : isCurrentPlayerWinner
          ? `${data.timeoutPlayerName} đã hết thời gian! Bạn thắng cuộc!`
          : `${data.timeoutPlayerName} đã hết thời gian!`,
        isWinner: isCurrentPlayerWinner
      });
    };

    socket.on('playerSurrendered', handlePlayerSurrendered);
    socket.on('gameTimeout', handleGameTimeout);

    return () => {
      socket.off('playerSurrendered', handlePlayerSurrendered);
      socket.off('gameTimeout', handleGameTimeout);
    };
  }, [socket]);

  // FIXED: Loading state with better UX
  if (!gameState) {
    return (
      <div 
        className="flex items-center justify-center" 
        style={{
          background: 'linear-gradient(135deg, #581c87 0%, #1e40af 50%, #312e81 100%)',
          minHeight: '100vh'
        }}
      >
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-6xl mb-4">⚫⚪</div>
          <div className="text-xl mb-4">Đang tải game...</div>
          
          {/* FIXED: Add back to menu button even in loading state */}
          <motion.button
            onClick={handleBackToMenu}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg border border-white/30 transition-colors mt-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🏠 Quay lại Menu
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // FIXED: Get background style - Force inline styles to ensure background shows
  const getBackgroundStyle = () => {
    // Always return inline gradient styles to override any CSS issues
    return {
      background: 'linear-gradient(135deg, #581c87 0%, #1e40af 50%, #312e81 100%)',
      minHeight: '100vh'
    };
  };

  return (
    <div 
      className="p-2 sm:p-4 lg:p-6" 
      style={getBackgroundStyle()}
    >
      {/* FIXED: Enhanced Back to Menu Button - Always visible and functional */}
      <motion.button
        onClick={handleBackToMenu}
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/30 backdrop-blur-sm transition-all duration-200 flex items-center space-x-2 shadow-lg"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        title="Quay lại màn hình chính"
      >
        <span className="text-lg">🏠</span>
        <span className="hidden sm:inline font-medium">Menu</span>
      </motion.button>

      {/* Game End Notification */}
      <AnimatePresence>
        {gameEndNotification.show && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`
                max-w-md w-full p-6 rounded-2xl shadow-2xl border-4 text-center text-white
                ${gameEndNotification.isWinner 
                  ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400' 
                  : gameEndNotification.type === 'surrender' || gameEndNotification.type === 'timeout'
                  ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-400'
                  : 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400'
                }
              `}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                duration: 0.8
              }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {gameEndNotification.type === 'surrender' ? '🏃‍♂️' :
                 gameEndNotification.type === 'timeout' ? '⏰' :
                 gameEndNotification.isWinner ? '🏆' : '🤝'}
              </motion.div>
              
              <motion.h2
                className="text-2xl font-bold mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {gameEndNotification.type === 'surrender' ? 'Đầu hàng!' :
                 gameEndNotification.type === 'timeout' ? 'Hết thời gian!' :
                 gameEndNotification.isWinner ? 'Chiến thắng!' : 'Game kết thúc!'}
              </motion.h2>
              
              <motion.p
                className="text-lg mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {gameEndNotification.message}
              </motion.p>
              
              <div className="flex space-x-3">
                <motion.button
                  onClick={() => setGameEndNotification(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors border border-white/30"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Đóng
                </motion.button>
                
                <motion.button
                  onClick={handleBackToMenu}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🏠 Menu
                </motion.button>
              </div>
              
              {/* Animated background effects */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {gameEndNotification.isWinner && [...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-2xl"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                    }}
                    animate={{
                      y: [-20, -60, -20],
                      rotate: [0, 360],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  >
                    {Math.random() > 0.5 ? '🎉' : '✨'}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Mobile & Tablet Layout - Stack vertically */}
        <div className="xl:hidden space-y-4 sm:space-y-6">
          {/* Game Board - Top on mobile/tablet */}
          <motion.div
            className="flex items-center justify-center rounded-2xl p-4 sm:p-6 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Board />
          </motion.div>

          {/* Game Info - Bottom on mobile/tablet */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameInfo />
          </motion.div>
        </div>

        {/* Desktop Layout - Side by side */}
        <div className="hidden xl:grid xl:grid-cols-5 gap-8 min-h-screen">
          {/* Game Info - Left Column (2/5 width) */}
          <motion.div
            className="xl:col-span-2 flex flex-col justify-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameInfo />
          </motion.div>

          {/* Game Board - Right Column (3/5 width) */}
          <motion.div
            className="xl:col-span-3 flex items-center justify-center rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 min-h-[600px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Board />
          </motion.div>
        </div>
      </div>

      {/* Chat Component - Fixed position */}
      <Chat />
      
      {/* Voice Controls - Fixed position */}
      <VoiceControls />

      {/* FIXED: Additional floating action button for menu (always visible) */}
      <motion.div
        className="fixed bottom-4 right-4 z-40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.button
          onClick={handleBackToMenu}
          className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg border border-white/20"
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          title="Quay lại Menu"
        >
          <span className="text-xl">🏠</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default GamePage;

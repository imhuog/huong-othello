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
  const { gameState, currentTheme, resetGameState } = useGame();
  const { socket } = useSocket();
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

  // Handle back to menu
  const handleBackToMenu = () => {
    // Reset game state
    if (resetGameState) {
      resetGameState();
    }
    // Navigate back to home
    router.push('/');
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

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-6xl mb-4">⚫⚪</div>
          <div className="text-xl">Đang tải game...</div>
        </motion.div>
      </div>
    );
  }

  // Get background class - sử dụng background cố định giống menu
  const getBackgroundClass = () => {
    // Sử dụng background giống như menu
    return 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900';
  };

  return (
    <div className={`min-h-screen p-2 sm:p-4 lg:p-6 ${getBackgroundClass()}`}>
      {/* Back to Menu Button - Fixed position */}
      <motion.button
        onClick={handleBackToMenu}
        className="fixed top-4 left-4 z-40 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg border border-white/20 backdrop-blur-sm transition-all duration-200 flex items-center space-x-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg">🏠</span>
        <span className="hidden sm:inline">Menu</span>
      </motion.button>

      {/* Game End Notification */}
      <AnimatePresence>
        {gameEndNotification.show && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
              
              <motion.button
                onClick={() => setGameEndNotification(prev => ({ ...prev, show: false }))}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors border border-white/30"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Đóng
              </motion.button>
              
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
    </div>
  );
};

export default GamePage;

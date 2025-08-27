import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import Board from '../components/Board';
import GameInfo from '../components/GameInfo';
import Chat from '../components/Chat';
import VoiceControls from '../components/VoiceControls'; // NEW: Import VoiceControls

const GamePage: React.FC = () => {
  const { gameState, currentTheme, surrender, isSurrendering, isAIGame } = useGame();
  const { socket, currentPlayer } = useSocket();

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

  // Check if surrender button should be shown
  const shouldShowSurrenderButton = () => {
    if (!gameState || !socket || !currentPlayer) return false;
    if (gameState.gameStatus !== 'playing') return false;
    if (isAIGame) return false; // No surrender in AI games
    if (gameState.players.length < 2) return false;
    if (currentPlayer.coins < 10) return false;
    
    return true;
  };

  // NEW: Surrender Button Component
  const SurrenderButton = () => {
    if (!shouldShowSurrenderButton()) return null;

    return (
      <motion.button
        onClick={surrender}
        disabled={isSurrendering}
        className={`
          px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200
          ${isSurrendering 
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
            : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
          }
          border border-red-600/30
        `}
        whileHover={!isSurrendering ? { scale: 1.05 } : undefined}
        whileTap={!isSurrendering ? { scale: 0.95 } : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isSurrendering ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Đang xử lý...
          </>
        ) : (
          <>
            🏳️ Đầu hàng (-10 xu)
          </>
        )}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mobile & Tablet Layout - Stack vertically */}
        <div className="xl:hidden space-y-4 sm:space-y-6">
          {/* NEW: Surrender Button - Mobile/Tablet (Top) */}
          {shouldShowSurrenderButton() && (
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SurrenderButton />
            </motion.div>
          )}

          {/* Game Board - Top on mobile/tablet */}
          <motion.div
            className={`flex items-center justify-center rounded-2xl p-4 sm:p-6 shadow-2xl ${currentTheme.background} border border-white/10`}
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
            className="xl:col-span-2 flex flex-col justify-start space-y-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameInfo />
            
            {/* NEW: Surrender Button - Desktop (Bottom of left column) */}
            {shouldShowSurrenderButton() && (
              <motion.div 
                className="flex justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <SurrenderButton />
              </motion.div>
            )}
          </motion.div>

          {/* Game Board - Right Column (3/5 width) */}
          <motion.div
            className={`xl:col-span-3 flex items-center justify-center rounded-2xl p-6 shadow-2xl ${currentTheme.background} border border-white/10 min-h-[600px]`}
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
      
      {/* NEW: Voice Controls - Fixed position */}
      <VoiceControls />

      {/* NEW: Surrender Warning Overlay (if player has less than 10 coins) */}
      {gameState.gameStatus === 'playing' && !isAIGame && gameState.players.length >= 2 && currentPlayer && currentPlayer.coins < 10 && (
        <motion.div
          className="fixed bottom-4 right-4 bg-yellow-500/90 text-black px-4 py-2 rounded-lg shadow-lg max-w-xs z-50"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-sm font-semibold">
            ⚠️ Không đủ xu để đầu hàng
          </div>
          <div className="text-xs mt-1">
            Bạn cần ít nhất 10 xu để có thể đầu hàng
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;

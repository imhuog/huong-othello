import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import Board from '../components/Board';
import GameInfo from '../components/GameInfo';
import Chat from '../components/Chat';
import VoiceControls from '../components/VoiceControls'; // NEW: Import VoiceControls

const GamePage: React.FC = () => {
  const { gameState, currentTheme } = useGame();

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

  // Get background class - fallback to default gradient if theme doesn't have background
  const getBackgroundClass = () => {
    if (currentTheme.background) {
      return currentTheme.background;
    }
    
    // Map theme names to gradient backgrounds - giống màn home
    const themeBackgrounds: { [key: string]: string } = {
      'Cổ điển': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Đại dương': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Hoàng hôn': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Rừng xanh': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Hoàng gia': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Hồng ngọt': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Bạc hà': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Oải hương': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'San hô': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Bầu trời': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Cầu vồng': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      // Dark themes
      'Đêm tối': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Ma quái': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Lava': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Rừng đêm': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Biển sâu': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Không gian': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
      'Cầu vồng tối': 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
    };
    
    return themeBackgrounds[currentTheme.name] || 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900';
  };

  return (
    <div className={`min-h-screen p-2 sm:p-4 lg:p-6 ${getBackgroundClass()}`}>
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
      
      {/* NEW: Voice Controls - Fixed position */}
      <VoiceControls />
    </div>
  );
};

export default GamePage;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';

const SurrenderButton: React.FC = () => {
  const { gameState, surrenderGame, isAIGame } = useGame();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Don't show surrender button if:
  // - No game state
  // - Game is not playing
  // - It's an AI game
  if (!gameState || gameState.gameStatus !== 'playing' || isAIGame) {
    return null;
  }

  const handleSurrenderClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSurrender = () => {
    surrenderGame();
    setShowConfirmModal(false);
  };

  const handleCancelSurrender = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      {/* Surrender Button */}
      <motion.button
        onClick={handleSurrenderClick}
        className="fixed bottom-4 left-4 z-40 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center space-x-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span>🏳️</span>
        <span className="text-sm">Đầu hàng</span>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelSurrender}
          >
            <motion.div
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-600"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🏳️</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Xác nhận đầu hàng
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Bạn có chắc chắn muốn đầu hàng không?
                  <br />
                  <span className="text-red-400 font-semibold">
                    Bạn sẽ bị trừ 10 xu và đối thủ sẽ được +10 xu
                  </span>
                </p>
                
                <div className="flex gap-4">
                  <motion.button
                    onClick={handleCancelSurrender}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Hủy bỏ
                  </motion.button>
                  
                  <motion.button
                    onClick={handleConfirmSurrender}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Đầu hàng
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SurrenderButton;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { Player } from '../types';
import ThemeSelector from './ThemeSelector';

const GameInfo: React.FC = () => {
  const { gameState, startGame, newGame, isAIGame, currentTheme, requestSurrender } = useGame();
  const { socket, currentPlayer } = useSocket();
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  if (!gameState) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 text-white border border-white/10">
        <div className="text-center">
          <div className="text-4xl mb-4">⚫⚪</div>
          <div>Đang tải thông tin game...</div>
        </div>
      </div>
    );
  }

  const currentPlayerInGame = gameState.players.find((p: Player) => p.id === socket?.id);
  const isCurrentPlayerTurn = currentPlayerInGame && 
    ((gameState.currentPlayer === 1 && currentPlayerInGame.color === 'black') || 
     (gameState.currentPlayer === 2 && currentPlayerInGame.color === 'white'));

  const getPlayerPiece = (player: Player, color: 'black' | 'white') => {
    if (player.pieceEmoji && player.pieceEmoji[color]) {
      return player.pieceEmoji[color];
    }
    return color === 'black' ? '⚫' : '⚪';
  };

  const getWinnerInfo = () => {
    if (gameState.gameStatus !== 'finished') return null;
    
    if (gameState.winnerId === 'draw') {
      return { type: 'draw', message: 'Hòa!', icon: '🤝' };
    }
    
    const winner = gameState.players.find(p => p.id === gameState.winnerId);
    if (!winner) return null;
    
    // Check if this was a surrender
    if (gameState.surrenderedBy) {
      const surrenderingPlayer = gameState.players.find(p => p.id === gameState.surrenderedBy);
      if (surrenderingPlayer) {
        return {
          type: 'surrender',
          message: `${winner.displayName} thắng do ${surrenderingPlayer.displayName} đầu hàng!`,
          icon: '🏳️'
        };
      }
    }
    
    return {
      type: 'normal',
      message: `${winner.displayName} thắng!`,
      icon: winner.id === socket?.id ? '🏆' : '😔'
    };
  };

  const winnerInfo = getWinnerInfo();

  const handleSurrenderClick = () => {
    if (!currentPlayerInGame || currentPlayerInGame.coins < 10) {
      return;
    }
    setShowSurrenderConfirm(true);
  };

  const confirmSurrender = () => {
    setShowSurrenderConfirm(false);
    requestSurrender();
  };

  const cancelSurrender = () => {
    setShowSurrenderConfirm(false);
  };

  const canSurrender = () => {
    return gameState.gameStatus === 'playing' && 
           !isAIGame && 
           currentPlayerInGame && 
           currentPlayerInGame.coins >= 10 &&
           gameState.players.length === 2;
  };

  return (
    <div className="space-y-4">
      {/* Player Info Cards */}
      <div className="space-y-4">
        {gameState.players.map((player: Player, index: number) => (
          <motion.div
            key={player.id}
            className={`p-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
              player.id === socket?.id
                ? 'bg-blue-900/80 border-blue-500/50 shadow-lg shadow-blue-500/25'
                : 'bg-gray-900/80 border-white/10'
            } ${
              isCurrentPlayerTurn && player.id === socket?.id
                ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/25'
                : ''
            }`}
            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{player.emoji}</div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {player.displayName}
                    {player.id === socket?.id && (
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">Bạn</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {player.color === 'black' ? 'Quân đen' : 'Quân trắng'} {getPlayerPiece(player, player.color!)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold">{gameState.scores[player.color === 'black' ? 1 : 2]}</div>
                <div className="text-xs text-gray-400">
                  💰 {player.coins || 0} xu
                </div>
              </div>
            </div>

            {/* Ready Status */}
            {gameState.gameStatus === 'waiting' && (
              <div className="mt-2 flex items-center justify-between">
                <div className={`text-sm ${player.isReady ? 'text-green-400' : 'text-yellow-400'}`}>
                  {player.isReady ? '✅ Sẵn sáng' : '⏳ Chưa sẵn sàng'}
                </div>
                {player.id === socket?.id && !player.isReady && (
                  <motion.button
                    onClick={startGame}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sẵn sàng
                  </motion.button>
                )}
              </div>
            )}

            {/* Current Turn Indicator */}
            {gameState.gameStatus === 'playing' && 
             ((gameState.currentPlayer === 1 && player.color === 'black') || 
              (gameState.currentPlayer === 2 && player.color === 'white')) && (
              <motion.div
                className="mt-2 flex items-center text-yellow-400 text-sm font-medium"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⭐ Lượt của {player.displayName}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Game Status */}
      <motion.div
        className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 text-white border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-center">
          {gameState.gameStatus === 'waiting' && (
            <div>
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-lg font-semibold">Chờ người chơi</div>
              <div className="text-sm text-gray-400 mt-1">
                {gameState.players.length}/2 người chơi
              </div>
            </div>
          )}

          {gameState.gameStatus === 'playing' && (
            <div>
              <div className="text-2xl mb-2">🎮</div>
              <div className="text-lg font-semibold">Đang chơi</div>
              <div className="text-sm text-gray-400 mt-1">
                Thời gian: {gameState.timeLeft}s
              </div>
              {gameState.validMoves.length === 0 && (
                <div className="text-yellow-400 text-sm mt-2">
                  ⚠️ Không có nước đi hợp lệ - Chuyển lượt
                </div>
              )}
            </div>
          )}

          {gameState.gameStatus === 'finished' && winnerInfo && (
            <div>
              <div className="text-3xl mb-2">{winnerInfo.icon}</div>
              <div className="text-lg font-semibold">{winnerInfo.message}</div>
              
              {/* Show coin transactions */}
              {gameState.coinTransactions && gameState.coinTransactions.length > 0 && (
                <div className="mt-3 space-y-1">
                  {gameState.coinTransactions.map((transaction, index) => (
                    <div key={index} className="text-sm">
                      <span className={transaction.coinChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {transaction.nickname}: {transaction.coinChange >= 0 ? '+' : ''}{transaction.coinChange} xu
                      </span>
                      <span className="text-gray-400 ml-1">
                        (Tổng: {transaction.newCoins})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Game Controls */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* New Game Button */}
        {gameState.gameStatus === 'finished' && (
          <motion.button
            onClick={newGame}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎮 Chơi ván mới
          </motion.button>
        )}

        {/* Surrender Button */}
        {canSurrender() && (
          <motion.button
            onClick={handleSurrenderClick}
            disabled={currentPlayerInGame && currentPlayerInGame.coins < 10}
            className={`w-full font-semibold py-3 px-4 rounded-xl transition-colors ${
              currentPlayerInGame && currentPlayerInGame.coins < 10
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            whileHover={currentPlayerInGame && currentPlayerInGame.coins >= 10 ? { scale: 1.02 } : {}}
            whileTap={currentPlayerInGame && currentPlayerInGame.coins >= 10 ? { scale: 0.98 } : {}}
          >
            🏳️ Đầu hàng (-10 xu)
          </motion.button>
        )}

        {!canSurrender() && gameState.gameStatus === 'playing' && isAIGame && (
          <div className="text-center text-gray-400 text-sm py-2">
            💡 Không thể đầu hàng khi chơi với AI
          </div>
        )}

        {!canSurrender() && gameState.gameStatus === 'playing' && !isAIGame && currentPlayerInGame && currentPlayerInGame.coins < 10 && (
          <div className="text-center text-gray-400 text-sm py-2">
            💰 Cần ít nhất 10 xu để đầu hàng
          </div>
        )}
      </motion.div>

      {/* Theme Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ThemeSelector />
      </motion.div>

      {/* Surrender Confirmation Modal */}
      <AnimatePresence>
        {showSurrenderConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelSurrender}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-red-500/50"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center text-white">
                <div className="text-4xl mb-4">🏳️</div>
                <h3 className="text-xl font-bold mb-4">Xác nhận đầu hàng</h3>
                <div className="text-gray-300 mb-6 space-y-2">
                  <p>Bạn có chắc chắn muốn đầu hàng không?</p>
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm">
                    <p className="text-red-300">⚠️ Lưu ý:</p>
                    <p>• Bạn sẽ bị trừ <strong>10 xu</strong></p>
                    <p>• Đối thủ sẽ được <strong>+10 xu</strong></p>
                    <p>• Game sẽ kết thúc ngay lập tức</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <motion.button
                    onClick={cancelSurrender}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Hủy bỏ
                  </motion.button>
                  <motion.button
                    onClick={confirmSurrender}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
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
    </div>
  );
};

export default GameInfo;

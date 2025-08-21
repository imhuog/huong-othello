import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { getResultMessage } from '../types';
import ThemeSelector from './ThemeSelector';

const GameInfo: React.FC = () => {
  const { gameState, roomId, newGame, startGame, isAIGame, aiDifficulty, surrenderGame, leaveRoom } = useGame();
  const { currentPlayer } = useSocket();
  const [showCoinTransactions, setShowCoinTransactions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!gameState) return null;

  const currentPlayerInGame = gameState.players.find(p => p.id === currentPlayer?.id);
  const otherPlayer = gameState.players.find(p => p.id !== currentPlayer?.id);
  
  const isCurrentPlayerTurn = currentPlayerInGame && 
    ((gameState.currentPlayer === 1 && currentPlayerInGame.color === 'black') ||
     (gameState.currentPlayer === 2 && currentPlayerInGame.color === 'white'));

  const canStartGame = gameState.gameStatus === 'waiting' && 
    gameState.players.length === 2 && 
    !gameState.players.every(p => p.isReady);

  const canSurrender = gameState.gameStatus === 'playing' && currentPlayerInGame;

  // Navigate to home
  const goToHome = () => {
    if (leaveRoom) {
      leaveRoom();
    }
    window.location.href = '/';
  };

  // Copy room link function
  const copyRoomLink = async () => {
    try {
      const roomLink = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(roomLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${window.location.origin}/room/${roomId}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getGameStatusDisplay = () => {
    if (gameState.gameStatus === 'waiting') {
      if (gameState.players.length === 1) {
        return 'Đang chờ người chơi thứ hai...';
      } else if (gameState.players.length === 2 && !gameState.players.every(p => p.isReady)) {
        return 'Nhấn "Sẵn sàng" để bắt đầu!';
      }
    } else if (gameState.gameStatus === 'playing') {
      if (isCurrentPlayerTurn) {
        return `Lượt của bạn - ${gameState.timeLeft}s`;
      } else {
        const currentPlayerName = gameState.players.find(p => 
          (gameState.currentPlayer === 1 && p.color === 'black') ||
          (gameState.currentPlayer === 2 && p.color === 'white')
        )?.displayName || 'Người chơi';
        return `Lượt của ${currentPlayerName} - ${gameState.timeLeft}s`;
      }
    } else if (gameState.gameStatus === 'finished') {
      if (gameState.surrenderedPlayerId) {
        const surrenderedPlayer = gameState.players.find(p => p.id === gameState.surrenderedPlayerId);
        const winnerPlayer = gameState.players.find(p => p.id !== gameState.surrenderedPlayerId);
        return `${surrenderedPlayer?.displayName || 'Người chơi'} đã đầu hàng! ${winnerPlayer?.displayName || 'Người chơi'} thắng!`;
      } else if (gameState.winnerId === 'draw') {
        return 'Hòa!';
      } else {
        const winner = gameState.players.find(p => p.id === gameState.winnerId);
        return `${winner?.displayName || 'Người chơi'} thắng!`;
      }
    }
    return '';
  };

  const getScoreColor = (playerId: string) => {
    if (gameState.gameStatus === 'finished') {
      if (gameState.winnerId === playerId) {
        return 'text-yellow-400 font-bold animate-pulse';
      } else if (gameState.winnerId === 'draw') {
        return 'text-blue-400 font-bold';
      } else {
        return 'text-gray-400';
      }
    }
    return 'text-white font-semibold';
  };

  const renderCoinTransactions = () => {
    if (!gameState.coinTransactions || gameState.coinTransactions.length === 0) {
      return null;
    }

    return (
      <AnimatePresence>
        {showCoinTransactions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 rounded-lg p-4 border border-white/10 backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <span className="mr-2">💰</span>
              Giao dịch xu
            </h3>
            <div className="space-y-2">
              {gameState.coinTransactions.map((transaction, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    transaction.coinChange > 0
                      ? 'bg-green-500/20 border-green-400/30 text-green-300'
                      : 'bg-red-500/20 border-red-400/30 text-red-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{transaction.nickname}</span>
                    <span className="font-bold">
                      {transaction.coinChange > 0 ? '+' : ''}{transaction.coinChange} xu
                    </span>
                  </div>
                  <div className="text-sm opacity-80 mt-1">
                    {getResultMessage(transaction.result as 'win' | 'lose' | 'draw' | 'surrender', transaction.coinChange)}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {transaction.oldCoins} → {transaction.newCoins} xu
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Room Info */}
      <motion.div
        className="bg-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md border border-white/20 shadow-xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {isAIGame ? `vs AI (${aiDifficulty?.toUpperCase()})` : `Phòng ${roomId}`}
            </h2>
            <p className="text-blue-200 text-sm sm:text-base">
              {getGameStatusDisplay()}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canStartGame && (
              <motion.button
                onClick={startGame}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ✅ Sẵn sàng
              </motion.button>
            )}
            
            {canSurrender && (
              <motion.button
                onClick={surrenderGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors shadow-lg border border-red-400/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Đầu hàng (-10 xu)"
              >
                🏃‍♂️ Đầu hàng
              </motion.button>
            )}

            {gameState.gameStatus === 'finished' && (
              <>
                <motion.button
                  onClick={newGame}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🆕 Ván mới
                </motion.button>
                
                <motion.button
                  onClick={goToHome}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors shadow-lg border border-gray-400/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🏠 Về trang chủ
                </motion.button>
              </>
            )}

            {/* Leave Room Button - Show anytime except when game is playing */}
            {gameState.gameStatus !== 'playing' && (
              <motion.button
                onClick={goToHome}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors shadow-lg border border-orange-400/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Rời phòng và về trang chủ"
              >
                🚪 Rời phòng
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Room Code & Invite Link - Only show for multiplayer games */}
      {!isAIGame && (
        <motion.div
          className="bg-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md border border-white/20 shadow-xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center">
              <span className="mr-2">🎯</span>
              Mã phòng
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Room Code Display */}
              <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-yellow-400 tracking-wider">
                    {roomId}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Mã phòng</div>
                </div>
              </div>
              
              {/* Copy Link Button */}
              <motion.button
                onClick={copyRoomLink}
                className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-lg ${
                  copySuccess
                    ? 'bg-green-600 text-white border border-green-400/30'
                    : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={copySuccess}
              >
                <div className="flex items-center space-x-2">
                  <span>{copySuccess ? '✅' : '📋'}</span>
                  <span className="whitespace-nowrap">
                    {copySuccess ? 'Đã sao chép!' : 'Copy link'}
                  </span>
                </div>
              </motion.button>
            </div>
            
            {/* Instructions */}
            {gameState.players.length === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3"
              >
                <div className="text-blue-300 text-sm text-center">
                  💡 Chia sẻ mã phòng <span className="font-mono font-bold">{roomId}</span> hoặc link để mời bạn bè tham gia!
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Players Info */}
      <motion.div
        className="bg-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md border border-white/20 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Người chơi
        </h3>

        <div className="space-y-3">
          {gameState.players.map((player, index) => (
            <motion.div
              key={player.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-all ${
                isCurrentPlayerTurn && player.id === currentPlayer?.id
                  ? 'bg-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                <div className="text-2xl sm:text-3xl">{player.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-base sm:text-lg font-semibold text-white truncate">
                      {player.displayName}
                    </h4>
                    {player.id === currentPlayer?.id && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                        Bạn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      player.color === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                    }`}>
                      {player.color === 'black' ? 'Đen' : 'Trắng'}
                    </span>
                    {player.pieceEmoji && (
                      <span className="text-lg">
                        {player.color === 'black' ? player.pieceEmoji.black : player.pieceEmoji.white}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end space-y-1">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(player.id)}`}>
                      {gameState.scores[player.color === 'black' ? 1 : 2]}
                    </div>
                    <div className="text-xs text-gray-400">điểm</div>
                  </div>
                  
                  {player.isAuthenticated && (
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-yellow-400 flex items-center">
                        <span className="mr-1">🪙</span>
                        {player.coins}
                      </div>
                      <div className="text-xs text-gray-400">xu</div>
                    </div>
                  )}
                </div>

                {!player.isReady && gameState.gameStatus === 'waiting' && (
                  <span className="text-xs text-orange-400 font-medium">
                    Chưa sẵn sàng
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Game Stats */}
      <motion.div
        className="bg-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md border border-white/20 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
            <span className="mr-2">📊</span>
            Thống kê
          </h3>
          
          {gameState.coinTransactions && gameState.coinTransactions.length > 0 && (
            <button
              onClick={() => setShowCoinTransactions(!showCoinTransactions)}
              className="text-sm text-blue-300 hover:text-blue-200 transition-colors flex items-center"
            >
              <span className="mr-1">💰</span>
              {showCoinTransactions ? 'Ẩn' : 'Xem'} giao dịch
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {gameState.validMoves.length}
            </div>
            <div className="text-sm text-gray-400">Nước đi khả dụng</div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {gameState.scores[1] + gameState.scores[2]}
            </div>
            <div className="text-sm text-gray-400">Tổng quân cờ</div>
          </div>
        </div>

        {renderCoinTransactions()}
      </motion.div>

      {/* Theme Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ThemeSelector />
      </motion.div>

      {/* Game Rules - Collapsible */}
      <motion.div
        className="bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <details className="group">
          <summary className="p-4 cursor-pointer list-none">
            <div className="flex items-center justify-between text-white">
              <h3 className="text-lg font-bold flex items-center">
                <span className="mr-2">📖</span>
                Luật chơi & Hệ thống xu
              </h3>
              <div className="transform transition-transform group-open:rotate-180">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </summary>
          
          <div className="px-4 pb-4 text-gray-300 space-y-3 text-sm border-t border-white/10 pt-4">
            <div>
              <h4 className="font-semibold text-white mb-2">🎮 Cách chơi:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Đặt quân cờ để bao vây và lật quân của đối thủ</li>
                <li>• Người có nhiều quân cờ hơn sẽ thắng</li>
                <li>• Mỗi lượt có 30 giây để đi</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-2">💰 Hệ thống xu:</h4>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-400">Thắng: +10 xu</span></li>
                <li>• <span className="text-blue-400">Hòa: +5 xu</span></li>
                <li>• <span className="text-red-400">Thua: -5 xu</span></li>
                <li>• <span className="text-red-500">Đầu hàng: -10 xu</span></li>
              </ul>
            </div>
          </div>
        </details>
      </motion.div>
    </div>
  );
};

export default GameInfo;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { getResultMessage } from '../types';
import ThemeSelector from './ThemeSelector';

const GameInfo: React.FC = () => {
  const { gameState, roomId, newGame, startGame, isAIGame, aiDifficulty, surrenderGame } = useGame();
  const { currentPlayer } = useSocket();
  const [showCoinTransactions, setShowCoinTransactions] = useState(false);

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

            {/* ✅ Invite Link Section */}
            {roomId && !isAIGame && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const roomLink = `${window.location.origin}?room=${roomId}`;
                    navigator.clipboard.writeText(roomLink).then(() => {
                      alert("Đã sao chép link phòng!");
                    });
                  }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm"
                >
                  📋 Sao chép link
                </button>
                <button
                  onClick={async () => {
                    const roomLink = `${window.location.origin}?room=${roomId}`;
                    if (navigator.share) {
                      await navigator.share({
                        title: "Othello Game - Tham gia phòng",
                        text: `Tham gia phòng Othello của tôi! Mã phòng: ${roomId}`,
                        url: roomLink,
                      });
                    } else {
                      navigator.clipboard.writeText(roomLink);
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  📤 Chia sẻ
                </button>
              </div>
            )}
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
              <motion.button
                onClick={newGame}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🆕 Ván mới
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Players Info */}
      {/* (giữ nguyên code cũ) */}
      {/* ... */}
      
      {/* Stats, Theme, Rules */}
      {/* (giữ nguyên code cũ) */}
    </div>
  );
};

export default GameInfo;

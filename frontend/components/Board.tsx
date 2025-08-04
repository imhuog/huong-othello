import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';

const Board: React.FC = () => {
  const { gameState, makeMove, currentTheme } = useGame();
  const { socket } = useSocket();
  const [showCoinsEarned, setShowCoinsEarned] = useState(false);
  const [coinsEarnedInfo, setCoinsEarnedInfo] = useState<{ amount: number; isCurrentPlayer: boolean } | null>(null);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = currentPlayer && gameState.players[gameState.currentPlayer - 1]?.id === socket?.id;
  const canPlay = gameState.gameStatus === 'playing' && isMyTurn;

  // Show coins earned animation when game finishes and player won
  useEffect(() => {
    if (gameState.gameStatus === 'finished' && gameState.coinsAwarded && gameState.coinsAwarded.playerId === socket?.id) {
      setCoinsEarnedInfo({
        amount: gameState.coinsAwarded.amount,
        isCurrentPlayer: true
      });
      setShowCoinsEarned(true);
      
      // Hide animation after 4 seconds
      const timer = setTimeout(() => {
        setShowCoinsEarned(false);
        setCoinsEarnedInfo(null);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.gameStatus, gameState.coinsAwarded, socket?.id]);

  const handleSquareClick = (row: number, col: number) => {
    if (!canPlay) return;
    
    const isValidMove = gameState.validMoves.some(([r, c]) => r === row && c === col);
    if (isValidMove) {
      makeMove(row, col);
    }
  };

  const getPieceEmoji = (piece: number | null) => {
    if (piece === null) return null;
    
    // Tìm người chơi dựa trên số quân cờ (1 hoặc 2)
    const player = gameState.players.find(p => p.color === (piece === 1 ? 'black' : 'white'));
    
    // Sử dụng emoji tùy chỉnh nếu có, ngược lại dùng mặc định
    if (player?.pieceEmoji) {
      return piece === 1 ? player.pieceEmoji.black : player.pieceEmoji.white;
    }
    
    // Nếu không có người chơi cụ thể, tìm bất kỳ người chơi nào có pieceEmoji
    const anyPlayerWithCustomPieces = gameState.players.find(p => p.pieceEmoji);
    if (anyPlayerWithCustomPieces?.pieceEmoji) {
      return piece === 1 ? anyPlayerWithCustomPieces.pieceEmoji.black : anyPlayerWithCustomPieces.pieceEmoji.white;
    }
    
    // Mặc định là quân cờ trắng đen
    return piece === 1 ? '⚫' : '⚪';
  };

  const isValidMove = (row: number, col: number) => {
    return gameState.validMoves.some(([r, c]) => r === row && c === col);
  };

  // Function to get square color based on theme
  const getSquareColor = (rowIndex: number, colIndex: number) => {
    const isLight = (rowIndex + colIndex) % 2 === 0;
    
    // Special handling for rainbow themes
    if (currentTheme?.name === 'Cầu vồng' || currentTheme?.name === 'Cầu vồng tối') {
      // Create sharp rainbow pattern using position
      const rainbowColors = currentTheme.name === 'Cầu vồng tối' ? [
        ['bg-red-800', 'bg-red-950'],
        ['bg-orange-800', 'bg-orange-950'],
        ['bg-yellow-800', 'bg-yellow-950'],
        ['bg-green-800', 'bg-green-950'],
        ['bg-blue-800', 'bg-blue-950'],
        ['bg-indigo-800', 'bg-indigo-950'],
        ['bg-purple-800', 'bg-purple-950'],
        ['bg-pink-800', 'bg-pink-950']
      ] : [
        ['bg-red-200', 'bg-red-700'],
        ['bg-orange-200', 'bg-orange-700'],
        ['bg-yellow-200', 'bg-yellow-700'],
        ['bg-lime-200', 'bg-green-700'],
        ['bg-cyan-200', 'bg-blue-700'],
        ['bg-blue-200', 'bg-indigo-700'],
        ['bg-purple-200', 'bg-purple-700'],
        ['bg-pink-200', 'bg-pink-700']
      ];
      
      const colorIndex = (rowIndex + colIndex) % rainbowColors.length;
      const [lightColor, darkColor] = rainbowColors[colorIndex];
      return isLight ? lightColor : darkColor;
    }
    
    // Map theme names to actual colors - Sharp and clear colors with high contrast
    const themeColors: { [key: string]: { light: string; dark: string } } = {
      'Cổ điển': { light: 'bg-white', dark: 'bg-black' },
      'Đại dương': { light: 'bg-white', dark: 'bg-blue-600' },
      'Hoàng hôn': { light: 'bg-yellow-200', dark: 'bg-red-600' },
      'Rừng xanh': { light: 'bg-lime-200', dark: 'bg-green-700' },
      'Hoàng gia': { light: 'bg-yellow-100', dark: 'bg-purple-700' },
      'Hồng ngọt': { light: 'bg-pink-100', dark: 'bg-pink-600' },
      'Bạc hà': { light: 'bg-green-100', dark: 'bg-teal-600' },
      'Oải hương': { light: 'bg-purple-100', dark: 'bg-purple-600' },
      'San hô': { light: 'bg-orange-100', dark: 'bg-orange-600' },
      'Bầu trời': { light: 'bg-sky-100', dark: 'bg-blue-500' },
      // Themes tối mới
      'Đêm tối': { light: 'bg-gray-600', dark: 'bg-gray-900' },
      'Ma quái': { light: 'bg-slate-700', dark: 'bg-black' },
      'Lava': { light: 'bg-red-900', dark: 'bg-black' },
      'Rừng đêm': { light: 'bg-green-900', dark: 'bg-gray-900' },
      'Biển sâu': { light: 'bg-blue-900', dark: 'bg-slate-900' },
      'Không gian': { light: 'bg-indigo-900', dark: 'bg-black' },
      'Cầu vồng tối': { light: 'bg-purple-800', dark: 'bg-gray-900' },
    };

    const colors = themeColors[currentTheme?.name] || themeColors['Cổ điển'];
    return isLight ? colors.light : colors.dark;
  };

  // Column labels (A-H)
  const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  // Row labels (1-8)
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4 w-full max-w-2xl mx-auto relative">
      {/* Coins Earned Animation */}
      <AnimatePresence>
        {showCoinsEarned && coinsEarnedInfo && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-yellow-300"
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
              <div className="text-center">
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
                  🪙
                </motion.div>
                <motion.div
                  className="text-3xl font-bold mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  +{coinsEarnedInfo.amount} XU!
                </motion.div>
                <motion.div
                  className="text-lg font-semibold"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  🎉 Chúc mừng bạn đã thắng! 🎉
                </motion.div>
              </div>
              
              {/* Floating coins animation */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-3xl"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`,
                    }}
                    animate={{
                      y: [-20, -40, -20],
                      rotate: [0, 360],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut"
                    }}
                  >
                    🪙
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board container with labels */}
      <div className="relative w-full flex justify-center">
        <div className="relative">
          {/* Column labels (top) */}
          <div className="flex mb-2 ml-6 sm:ml-8">
            {columnLabels.map((label, index) => (
              <div
                key={label}
                className="w-10 h-6 sm:w-12 sm:h-8 md:w-14 md:h-8 lg:w-16 lg:h-10 flex items-center justify-center text-sm sm:text-base md:text-lg font-bold text-gray-200"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Row labels (left) */}
            <div className="flex flex-col mr-2">
              {rowLabels.map((label, index) => (
                <div
                  key={label}
                  className="w-6 h-10 sm:w-8 sm:h-12 md:w-8 md:h-14 lg:w-10 lg:h-16 flex items-center justify-center text-sm sm:text-base md:text-lg font-bold text-gray-200"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Game board - Much larger and more responsive */}
            <div className="grid grid-cols-8 gap-0 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-gray-500">
              {gameState.board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isValid = isValidMove(rowIndex, colIndex);
                  const squareColorClass = getSquareColor(rowIndex, colIndex);
                  
                  return (
                    <motion.div
                      key={`${rowIndex}-${colIndex}`}
                      className={`
                        w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 relative cursor-pointer
                        ${squareColorClass}
                        ${canPlay && isValid ? 'hover:brightness-110 hover:scale-105' : ''}
                        ${!canPlay ? 'cursor-not-allowed' : ''}
                        transition-all duration-200 flex items-center justify-center
                        border border-gray-400/20
                      `}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      whileHover={canPlay && isValid ? { scale: 1.05 } : {}}
                      whileTap={canPlay && isValid ? { scale: 0.95 } : {}}
                    >
                      {/* Valid move indicator - Small red dot with radial fade effect */}
                      {canPlay && isValid && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.div
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 bg-red-500 rounded-full"
                            style={{
                              background: 'radial-gradient(circle, rgba(239, 68, 68, 1) 0%, rgba(239, 68, 68, 0.8) 30%, rgba(239, 68, 68, 0.4) 60%, rgba(239, 68, 68, 0.1) 100%)',
                            }}
                            animate={{ 
                              scale: [0.8, 1.3, 0.8],
                              opacity: [0.7, 1, 0.7]
                            }}
                            transition={{ 
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        </motion.div>
                      )}
                      
                      {/* Game piece */}
                      {cell !== null && (
                        <motion.div
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl select-none"
                          initial={{ scale: 0, rotateY: 0 }}
                          animate={{ scale: 1, rotateY: 360 }}
                          transition={{
                            scale: { duration: 0.3, type: 'spring' },
                            rotateY: { duration: 0.6, ease: 'easeInOut' }
                          }}
                          key={`piece-${rowIndex}-${colIndex}-${cell}`}
                        >
                          {getPieceEmoji(cell)}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      {gameState.gameStatus === 'playing' && (
        <motion.div
          className="text-center p-4 sm:p-5 rounded-xl bg-white/10 backdrop-blur-sm w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-base sm:text-lg md:text-xl font-bold text-white mb-3">
            {isMyTurn ? (
              <span className="text-green-400">🎯 Lượt của bạn!</span>
            ) : (
              <span className="text-blue-400">⏳ Đang chờ đối thủ...</span>
            )}
          </div>
          
          {/* Timer */}
          <div className="flex items-center justify-center space-x-3">
            <span className="text-sm sm:text-base text-gray-300">Thời gian:</span>
            <motion.span
              className={`text-xl sm:text-2xl md:text-3xl font-bold ${
                gameState.timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'
              }`}
              animate={gameState.timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: gameState.timeLeft <= 10 ? Infinity : 0 }}
            >
              {gameState.timeLeft}s
            </motion.span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Board;

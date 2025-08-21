// FIXED: Complete MainMenu.tsx with proper roomId handling

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { AVAILABLE_EMOJIS, PIECE_EMOJI_OPTIONS, AIDifficulty } from '../types';
import ThemeSelector from './ThemeSelector';
import PlayerProfile from './PlayerProfile';

const MainMenu: React.FC = () => {
  const { createRoom, joinRoom, createAIGame, roomId, gameState } = useGame();
  const { currentPlayer, logoutPlayer } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'ai'>('create');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('medium');
  const [selectedPieceStyle, setSelectedPieceStyle] = useState(PIECE_EMOJI_OPTIONS[0]);
  const [showPieceSelector, setShowPieceSelector] = useState(false);
  
  // FIXED: Better room sharing state management
  const [showRoomShare, setShowRoomShare] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // DEBUG: Add console logs
  console.log('🔍 MainMenu Debug:', {
    roomId: roomId,
    roomIdType: typeof roomId,
    roomIdLength: roomId?.length,
    gameState: gameState?.gameStatus,
    showRoomShare: showRoomShare,
    currentRoomId: currentRoomId,
    currentUrl: window.location.href
  });

  // Auto-fill room ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setJoinRoomId(roomFromUrl.toUpperCase());
      setActiveTab('join');
    }
  }, []);

  // Set initial piece style from current player
  useEffect(() => {
    if (currentPlayer?.pieceEmoji) {
      const matchedStyle = PIECE_EMOJI_OPTIONS.find(option => 
        option.black === currentPlayer.pieceEmoji?.black && 
        option.white === currentPlayer.pieceEmoji?.white
      );
      if (matchedStyle) {
        setSelectedPieceStyle(matchedStyle);
      }
    }
  }, [currentPlayer]);

  // FIXED: Enhanced room creation detection
  useEffect(() => {
    console.log('🎯 roomId effect triggered:', roomId);
    
    if (roomId && roomId !== currentRoomId) {
      // New room created
      console.log('✅ New room detected:', roomId);
      setCurrentRoomId(roomId);
      setShowRoomShare(true);
      setCopySuccess(false);
    }
  }, [roomId, currentRoomId]);

  // FIXED: Also listen for gameState changes to detect room creation
  useEffect(() => {
    console.log('🎮 gameState effect triggered:', gameState?.gameStatus);
    
    if (gameState && gameState.gameStatus === 'waiting' && gameState.players.length === 1) {
      // Room just created and we're waiting for players
      const playerId = gameState.players[0]?.id;
      if (playerId === currentPlayer?.id && roomId && roomId !== currentRoomId) {
        console.log('✅ Room creation confirmed via gameState');
        setCurrentRoomId(roomId);
        setShowRoomShare(true);
        setCopySuccess(false);
      }
    }
  }, [gameState, roomId, currentRoomId, currentPlayer]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleCreateRoom called');
    
    if (currentPlayer) {
      const playerData = {
        name: currentPlayer.displayName,
        emoji: currentPlayer.emoji,
        pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
          black: selectedPieceStyle.black,
          white: selectedPieceStyle.white
        } : undefined
      };
      
      console.log('📤 Calling createRoom with:', playerData);
      
      // Reset current room state before creating new one
      setCurrentRoomId(null);
      setShowRoomShare(false);
      setCopySuccess(false);
      
      createRoom(playerData);
      
      // BACKUP: Force show modal after delay if roomId doesn't update
      setTimeout(() => {
        console.log('⏰ Backup check - roomId:', roomId);
        if (roomId && !showRoomShare) {
          console.log('🆘 Backup: Forcing modal show');
          setCurrentRoomId(roomId);
          setShowRoomShare(true);
        }
      }, 2000);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPlayer && joinRoomId.trim()) {
      const playerData = {
        name: currentPlayer.displayName,
        emoji: currentPlayer.emoji,
        pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
          black: selectedPieceStyle.black,
          white: selectedPieceStyle.white
        } : undefined
      };
      joinRoom(joinRoomId.trim().toUpperCase(), playerData);
    }
  };

  const handleCreateAIGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPlayer) {
      const playerData = {
        name: currentPlayer.displayName,
        emoji: currentPlayer.emoji,
        pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
          black: selectedPieceStyle.black,
          white: selectedPieceStyle.white
        } : undefined
      };
      createAIGame(playerData, selectedDifficulty);
    }
  };

  // FIXED: Proper room link generation based on current URL structure
  const getRoomLink = (roomIdToUse: string) => {
    // Get current page URL and replace with room parameter
    const currentUrl = new URL(window.location.href);
    
    // Check if we're already on a game page or if there's a specific game route
    if (currentUrl.pathname.includes('/game')) {
      // If already on game page, just update the room parameter
      currentUrl.searchParams.set('room', roomIdToUse);
      return currentUrl.toString();
    } else {
      // If on main menu/home page, add room parameter to current page
      // This assumes the same page handles both menu and game with URL params
      currentUrl.searchParams.set('room', roomIdToUse);
      return currentUrl.toString();
    }
  };

  // FIXED: Copy room link function with proper URL format
  const copyRoomLink = async () => {
    const roomIdToUse = roomId || currentRoomId;
    if (!roomIdToUse) {
      console.log('❌ No room ID available for copy');
      return;
    }
    
    // FIXED: Use the new getRoomLink function
    const roomLink = getRoomLink(roomIdToUse);
    
    console.log('📋 Copying room link:', roomLink);
    
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      console.log('✅ Room link copied successfully');
    } catch (err) {
      console.log('⚠️ Clipboard API failed, using fallback');
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        console.log('✅ Room link copied via fallback');
      } catch (err2) {
        console.error('❌ Failed to copy:', err2);
      }
      document.body.removeChild(textArea);
    }
  };

  // FIXED: Copy room ID function
  const copyRoomId = async () => {
    const roomIdToUse = roomId || currentRoomId;
    if (!roomIdToUse) return;
    
    try {
      await navigator.clipboard.writeText(roomIdToUse);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = roomIdToUse;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err2) {
        console.error('Failed to copy room ID:', err2);
      }
      document.body.removeChild(textArea);
    }
  };

  // FIXED: Share room link function
  const shareRoomLink = async () => {
    const roomIdToUse = roomId || currentRoomId;
    if (!roomIdToUse) return;
    
    const roomLink = getRoomLink(roomIdToUse);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Othello Game - Tham gia phòng chơi',
          text: `Tham gia phòng Othello của tôi! Mã phòng: ${roomIdToUse}`,
          url: roomLink,
        });
      } catch (err) {
        console.log('Share cancelled or failed, fallback to copy');
        copyRoomLink();
      }
    } else {
      copyRoomLink();
    }
  };

  // FIXED: Close room share modal
  const closeRoomShare = () => {
    setShowRoomShare(false);
    setCopySuccess(false);
  };

  if (!currentPlayer) {
    return null;
  }

  const displayRoomId = roomId || currentRoomId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        {/* FIXED: Room Share Modal - Shows when room is created */}
        <AnimatePresence>
          {showRoomShare && displayRoomId && (
            <motion.div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRoomShare}
            >
              <motion.div
                className="bg-white/15 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30 max-w-md w-full"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15 
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center text-white">
                  <motion.div
                    className="text-5xl mb-4"
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
                    🎉
                  </motion.div>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">Phòng đã tạo thành công!</h2>
                  <p className="text-gray-300 mb-6">Mời bạn bè tham gia bằng cách chia sẻ link hoặc mã phòng</p>
                  
                  {/* Room ID Display with Copy Button */}
                  <div className="bg-black/40 rounded-xl p-6 mb-6 border border-white/20">
                    <p className="text-sm text-gray-400 mb-2">Mã phòng:</p>
                    <div className="flex items-center justify-center space-x-3">
                      <p className="text-4xl font-bold font-mono text-yellow-400 tracking-wider">
                        {displayRoomId}
                      </p>
                      <motion.button
                        onClick={copyRoomId}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Sao chép mã phòng"
                      >
                        <span className="text-xl">📋</span>
                      </motion.button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 break-all">
                      Link: {getRoomLink(displayRoomId)}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <motion.button
                      onClick={shareRoomLink}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-xl">📤</span>
                      <span>Chia sẻ link phòng</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={copyRoomLink}
                      className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg ${
                        copySuccess 
                          ? 'bg-green-600 text-white border-green-400' 
                          : 'bg-white/20 hover:bg-white/30 border border-white/40'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-xl">{copySuccess ? '✅' : '📋'}</span>
                      <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép link'}</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={closeRoomShare}
                      className="w-full py-3 text-gray-300 hover:text-white transition-colors border border-gray-500/30 rounded-xl hover:bg-white/10"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Đóng
                    </motion.button>
                  </div>

                  {/* Additional info */}
                  <div className="mt-6 text-xs text-gray-400 bg-white/10 rounded-lg p-3">
                    💡 Tip: Bạn bè có thể tham gia bằng cách nhấn vào link hoặc nhập mã phòng trong tab "Vào phòng"
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          <PlayerProfile player={currentPlayer} onLogout={logoutPlayer} />
          
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {/* Header */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-5xl mb-4">⚫⚪</div>
              <h1 className="text-2xl font-bold text-white mb-2">Othello Game</h1>
              <p className="text-gray-300 text-sm">Chào mừng {currentPlayer.displayName}!</p>
              
              <div className="flex justify-center mt-4">
                <ThemeSelector />
              </div>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-black/20 p-1 mb-6">
              {[
                { key: 'create', label: '🏠 Tạo phòng', icon: '🏠' },
                { key: 'join', label: '🚀 Vào phòng', icon: '🚀' },
                { key: 'ai', label: '🤖 Chơi AI', icon: '🤖' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200
                    ${activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-lg">{tab.icon}</span>
                </button>
              ))}
            </div>

            {/* Piece Style Selection */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-white font-semibold mb-3">
                🎭 Chọn kiểu quân cờ:
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPieceSelector(!showPieceSelector)}
                  className="w-full px-4 py-3 bg-black/20 text-white rounded-lg border border-gray-600 hover:border-gray-500 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{selectedPieceStyle.black}</span>
                    <span className="text-xl">{selectedPieceStyle.white}</span>
                    <span>{selectedPieceStyle.name}</span>
                  </div>
                  <span className={`transform transition-transform ${showPieceSelector ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                <AnimatePresence>
                  {showPieceSelector && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-10 max-h-60 overflow-y-auto"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {PIECE_EMOJI_OPTIONS.map((option, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setSelectedPieceStyle(option);
                            setShowPieceSelector(false);
                          }}
                          className={`
                            w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3
                            ${selectedPieceStyle.name === option.name ? 'bg-gray-700 text-blue-400' : 'text-white'}
                          `}
                        >
                          <span className="text-xl">{option.black}</span>
                          <span className="text-xl">{option.white}</span>
                          <span>{option.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'create' && (
                <motion.form
                  key="create"
                  onSubmit={handleCreateRoom}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    🏠 Tạo phòng mới
                  </motion.button>
                  
                  <p className="text-gray-300 text-sm text-center">
                    Tạo phòng riêng và mời bạn bè cùng chơi
                  </p>
                </motion.form>
              )}

              {activeTab === 'join' && (
                <motion.form
                  key="join"
                  onSubmit={handleJoinRoom}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      🔑 Mã phòng:
                    </label>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="Nhập mã phòng..."
                      className="w-full px-4 py-3 bg-black/20 text-white placeholder-gray-400 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors text-center font-mono text-lg"
                      maxLength={6}
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!joinRoomId.trim()}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${joinRoomId.trim()
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                    whileHover={joinRoomId.trim() ? { scale: 1.02 } : {}}
                    whileTap={joinRoomId.trim() ? { scale: 0.98 } : {}}
                  >
                    🚀 Vào phòng
                  </motion.button>
                  
                  <p className="text-gray-300 text-sm text-center">
                    Nhập mã phòng 6 số để tham gia game
                  </p>
                </motion.form>
              )}

              {activeTab === 'ai' && (
                <motion.form
                  key="ai"
                  onSubmit={handleCreateAIGame}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div>
                    <label className="block text-white font-semibold mb-3">
                      🎯 Chọn độ khó:
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'easy', label: '😊 Dễ', desc: 'AI đi ngẫu nhiên' },
                        { value: 'medium', label: '🤔 Trung bình', desc: 'AI ưu tiên góc và cạnh' },
                        { value: 'hard', label: '😈 Khó', desc: 'AI thông minh và khó đánh bại' }
                      ].map((difficulty) => (
                        <motion.button
                          key={difficulty.value}
                          type="button"
                          onClick={() => setSelectedDifficulty(difficulty.value as AIDifficulty)}
                          className={`
                            w-full p-3 rounded-lg text-left transition-all duration-200 border-2
                            ${selectedDifficulty === difficulty.value
                              ? 'border-yellow-400 bg-yellow-400/20 text-white'
                              : 'border-gray-600 bg-black/20 text-gray-300 hover:border-gray-500'
                            }
                          `}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="font-semibold">{difficulty.label}</div>
                          <div className="text-sm text-gray-400">{difficulty.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <motion.button
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    🤖 Chơi với AI
                  </motion.button>
                  
                  <p className="text-gray-300 text-sm text-center">
                    Thử thách bản thân với AI thông minh
                  </p>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Footer */}
            <motion.div
              className="mt-8 text-center text-gray-400 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>🎮 Zui zẻ hong quạo 🎮</p>
              <p className="mt-1">Made by huongcute hehe</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;

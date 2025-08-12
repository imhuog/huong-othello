import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { AVAILABLE_EMOJIS, PIECE_EMOJI_OPTIONS, AIDifficulty } from '../types';
import ThemeSelector from './ThemeSelector';
import PlayerProfile from './PlayerProfile';

const MainMenu: React.FC = () => {
  const { createRoom, joinRoom, createAIGame } = useGame();
  const { currentPlayer, logoutPlayer } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'ai'>('create');
  const [roomId, setRoomId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('medium');
  const [selectedPieceStyle, setSelectedPieceStyle] = useState(PIECE_EMOJI_OPTIONS[0]);
  const [showPieceSelector, setShowPieceSelector] = useState(false);
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState(false);

  // Auto-fill room ID from URL and automatically join if user is logged in
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      const upperRoomId = roomFromUrl.toUpperCase();
      setRoomId(upperRoomId);
      setActiveTab('join');
      setIsJoiningFromUrl(true);
      
      // Auto-join if user is already logged in
      if (currentPlayer && !isJoiningFromUrl) {
        const playerData = {
          name: currentPlayer.displayName,
          emoji: currentPlayer.emoji,
          pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
            black: selectedPieceStyle.black,
            white: selectedPieceStyle.white
          } : undefined
        };
        
        // Small delay to ensure everything is initialized
        setTimeout(() => {
          joinRoom(upperRoomId, playerData);
        }, 500);
      }
    }
  }, [currentPlayer, joinRoom, selectedPieceStyle, isJoiningFromUrl]);

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

  // Clear URL params after joining attempt
  useEffect(() => {
    if (isJoiningFromUrl && currentPlayer) {
      // Clear the room parameter from URL after attempting to join
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, document.title, url.toString());
      setIsJoiningFromUrl(false);
    }
  }, [isJoiningFromUrl, currentPlayer]);

  const handleCreateRoom = (e: React.FormEvent) => {
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
      createRoom(playerData);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPlayer && roomId.trim()) {
      const playerData = {
        name: currentPlayer.displayName,
        emoji: currentPlayer.emoji,
        pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
          black: selectedPieceStyle.black,
          white: selectedPieceStyle.white
        } : undefined
      };
      joinRoom(roomId.trim().toUpperCase(), playerData);
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

  if (!currentPlayer) {
    return null; // This shouldn't happen if properly authenticated
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        {/* Mobile Layout - Stack vertically */}
        <div className="lg:hidden space-y-6">
          {/* Player Profile on Mobile - Collapsible */}
          <PlayerProfile player={currentPlayer} onLogout={logoutPlayer} />
          
          {/* Main Menu */}
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
              <p className="text-gray-300 text-sm">Chào mừng {currentPlayer.displayName}! 🎮</p>
              
              {/* Theme selector */}
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
                    ⌄
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
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Nhập mã phòng..."
                      className="w-full px-4 py-3 bg-black/20 text-white placeholder-gray-400 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors text-center font-mono text-lg"
                      maxLength={6}
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!roomId.trim()}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${roomId.trim()
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                    whileHover={roomId.trim() ? { scale: 1.02 } : {}}
                    whileTap={roomId.trim() ? { scale: 0.98 } : {}}
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

export default MainMenu;🎮</p>
              <p className="mt-1">Made by huongcute hehe</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Desktop Layout - Side by side */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {/* Player Profile - Left Column - Always expanded on desktop */}
          <div className="lg:col-span-1">
            <PlayerProfile player={currentPlayer} onLogout={logoutPlayer} />
          </div>

          {/* Main Menu - Right Columns */}
          <motion.div
            className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {/* Header */}
            <motion.div
              className="text-center mb-6 sm:mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-5xl sm:text-6xl mb-4">⚫⚪</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Othello Game</h1>
              <p className="text-gray-300 text-sm sm:text-base">Chào mừng {currentPlayer.displayName}! 🎮</p>
              
              {/* Theme selector */}
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
                  <span className="text-sm">{tab.label}</span>
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
                    ⌄
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
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Nhập mã phòng..."
                      className="w-full px-4 py-3 bg-black/20 text-white placeholder-gray-400 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors text-center font-mono text-lg"
                      maxLength={6}
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!roomId.trim()}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${roomId.trim()
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                    whileHover={roomId.trim() ? { scale: 1.02 } : {}}
                    whileTap={roomId.trim() ? { scale: 0.98 } : {}}
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
              <p>🎮 Zui zẻ hong quạo

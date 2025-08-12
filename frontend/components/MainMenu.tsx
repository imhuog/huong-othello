import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { AVAILABLE_EMOJIS, PIECE_EMOJI_OPTIONS, AIDifficulty } from '../types';
import ThemeSelector from './ThemeSelector';
import PlayerProfile from './PlayerProfile';

const MainMenu: React.FC = () => {
  const { createRoom, joinRoom, createAIGame, isJoiningRoom, joinError, clearJoinError } = useGame();
  const { currentPlayer, logoutPlayer } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'ai'>('create');
  const [roomId, setRoomId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('medium');
  const [selectedPieceStyle, setSelectedPieceStyle] = useState(PIECE_EMOJI_OPTIONS[0]);
  const [showPieceSelector, setShowPieceSelector] = useState(false);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);

  // Auto-fill room ID from URL and automatically join if user is logged in
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    if (roomFromUrl && !hasAutoJoined) {
      const upperRoomId = roomFromUrl.toUpperCase().trim();
      console.log('🔗 Room ID from URL:', upperRoomId);
      
      // Validate room ID format (6 characters)
      if (upperRoomId.length === 6) {
        setRoomId(upperRoomId);
        setActiveTab('join');
        
        // Auto-join if user is already logged in
        if (currentPlayer) {
          console.log('🚀 Auto-joining room:', upperRoomId);
          setHasAutoJoined(true);
          
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
          }, 1000);
        }
      } else {
        console.log('❌ Invalid room ID format from URL:', roomFromUrl);
      }
      
      // Clear the room parameter from URL after processing
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [currentPlayer, joinRoom, selectedPieceStyle, hasAutoJoined]);

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

  // Clear join error when switching tabs
  useEffect(() => {
    if (joinError) {
      clearJoinError();
    }
  }, [activeTab, clearJoinError]);

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
      const trimmedRoomId = roomId.trim().toUpperCase();
      
      // Validate room ID format
      if (trimmedRoomId.length !== 6) {
        return;
      }
      
      const playerData = {
        name: currentPlayer.displayName,
        emoji: currentPlayer.emoji,
        pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
          black: selectedPieceStyle.black,
          white: selectedPieceStyle.white
        } : undefined
      };
      
      console.log('🎯 Attempting to join room:', trimmedRoomId);
      joinRoom(trimmedRoomId, playerData);
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

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomId(value);
    
    // Clear join error when user starts typing
    if (joinError) {
      clearJoinError();
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

            {/* Join Error Display */}
            {joinError && (
              <motion.div
                className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">⚠️</span>
                  <span className="text-sm">{joinError}</span>
                  <button
                    onClick={clearJoinError}
                    className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}

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
                    disabled={isJoiningRoom}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${isJoiningRoom
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg'
                      }
                    `}
                    whileHover={!isJoiningRoom ? { scale: 1.02 } : {}}
                    whileTap={!isJoiningRoom ? { scale: 0.98 } : {}}
                  >
                    {isJoiningRoom ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang tạo...</span>
                      </div>
                    ) : (
                      '🏠 Tạo phòng mới'
                    )}
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
                      onChange={handleRoomIdChange}
                      placeholder="Nhập mã phòng 6 ký tự..."
                      className={`
                        w-full px-4 py-3 bg-black/20 text-white placeholder-gray-400 rounded-lg border transition-colors text-center font-mono text-lg
                        ${joinError 
                          ? 'border-red-500 focus:border-red-400' 
                          : 'border-gray-600 focus:border-blue-400'
                        } focus:outline-none
                      `}
                      maxLength={6}
                      disabled={isJoiningRoom}
                    />
                    {roomId.length > 0 && roomId.length !== 6 && (
                      <p className="text-yellow-400 text-xs mt-1 text-center">
                        Mã phòng phải có đúng 6 ký tự
                      </p>
                    )}
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!roomId.trim() || roomId.length !== 6 || isJoiningRoom}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${(roomId.trim() && roomId.length === 6 && !isJoiningRoom)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
                    whileHover={(roomId.trim() && roomId.length === 6 && !isJoiningRoom) ? { scale: 1.02 } : {}}
                    whileTap={(roomId.trim() && roomId.length === 6 && !isJoiningRoom) ? { scale: 0.98 } : {}}
                  >
                    {isJoiningRoom ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang vào phòng...</span>
                      </div>
                    ) : (
                      '🚀 Vào phòng'
                    )}
                  </motion.button>
                  
                  <p className="text-gray-300 text-sm text-center">
                    Nhập mã phòng 6 ký tự để tham gia game
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
                          disabled={isJoiningRoom}
                          className={`
                            w-full p-3 rounded-lg text-left transition-all duration-200 border-2
                            ${isJoiningRoom
                              ? 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed'
                              : selectedDifficulty === difficulty.value
                              ? 'border-yellow-400 bg-yellow-400/20 text-white'
                              : 'border-gray-600 bg-black/20 text-gray-300 hover:border-gray-500'
                            }
                          `}
                          whileHover={!isJoiningRoom ? { scale: 1.02 } : {}}
                          whileTap={!isJoiningRoom ? { scale: 0.98 } : {}}
                        >
                          <div className="font-semibold">{difficulty.label}</div>
                          <div className="text-sm text-gray-400">{difficulty.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={isJoiningRoom}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${isJoiningRoom
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg'
                      }
                    `}
                    whileHover={!isJoiningRoom ? { scale: 1.02 } : {}}
                    whileTap={!isJoiningRoom ? { scale: 0.98 } : {}}
                  >
                    {isJoiningRoom ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang tạo game...</span>
                      </div>
                    ) : (
                      '🤖 Chơi với AI'
                    )}
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

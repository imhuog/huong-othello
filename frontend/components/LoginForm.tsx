
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVAILABLE_EMOJIS, PIECE_EMOJI_OPTIONS, LoginRequest } from '../types';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';

interface LoginFormProps {
  onLogin?: (loginData: LoginRequest) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const { isConnected, connectionError, loginPlayer, isLoggingIn } = useSocket();
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(AVAILABLE_EMOJIS[0]);
  const [selectedPieceStyle, setSelectedPieceStyle] = useState(PIECE_EMOJI_OPTIONS[0]);
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [showPieceSelector, setShowPieceSelector] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!nickname.trim()) {
      toast.error('Vui lòng nhập nickname!');
      return;
    }
    
    if (nickname.trim().length > 20) {
      toast.error('Nickname không được dài quá 20 ký tự!');
      return;
    }
    
    if (nickname.trim().length < 2) {
      toast.error('Nickname phải có ít nhất 2 ký tự!');
      return;
    }

    if (!isConnected) {
      toast.error('Chưa kết nối tới máy chủ! Vui lòng đợi...');
      return;
    }

    const loginData: LoginRequest = {
      nickname: nickname.trim(),
      emoji: selectedEmoji,
      pieceEmoji: selectedPieceStyle.name !== 'Cổ điển' ? {
        black: selectedPieceStyle.black,
        white: selectedPieceStyle.white
      } : undefined
    };

    // Use socket context's loginPlayer function
    loginPlayer(loginData);
    
    // Call optional callback
    if (onLogin) {
      onLogin(loginData);
    }
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (connectionError) {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        text: `❌ Lỗi: ${connectionError}`,
        icon: '🚫'
      };
    }
    
    if (isConnected) {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        text: 'Đã kết nối máy chủ game!',
        icon: '✅'
      };
    }
    
    return {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20', 
      text: '🔄 Đang kết nối...',
      icon: '⏳'
    };
  };

  const status = getConnectionStatus();

  return (
    <motion.div
      className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20"
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Đăng nhập</h1>
        <p className="text-gray-300 text-sm sm:text-base">🤟Zô Zô🤟</p>
      </motion.div>

      {/* Connection Status */}
      <motion.div
        className={`mb-6 p-3 rounded-lg ${status.bgColor} border border-white/10`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={`text-sm font-medium ${status.color} flex items-center space-x-2`}>
          <span>{status.icon}</span>
          <span>{status.text}</span>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nickname Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-white font-semibold mb-2">
            👤 Nickname của bạn:
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nhập nickname..."
            className="w-full px-4 py-3 bg-black/20 text-white placeholder-gray-400 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors"
            maxLength={20}
            disabled={isLoggingIn || !isConnected}
          />
          <div className="mt-1 text-right text-xs text-gray-400">
            {nickname.length}/20
          </div>
        </motion.div>

        {/* Emoji Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="block text-white font-semibold mb-3">
            😀 Chọn avatar:
          </label>
          
          {/* Selected emoji display */}
          <button
            type="button"
            onClick={() => setShowEmojiSelector(!showEmojiSelector)}
            className="w-full px-4 py-3 bg-black/20 text-white rounded-lg border border-gray-600 hover:border-gray-500 transition-colors flex items-center justify-between mb-3"
            disabled={isLoggingIn || !isConnected}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{selectedEmoji}</span>
              <span>Avatar đã chọn</span>
            </div>
            <span className={`transform transition-transform ${showEmojiSelector ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </button>

          {/* Emoji grid - collapsible */}
          <AnimatePresence>
            {showEmojiSelector && (
              <motion.div
                className="grid grid-cols-8 sm:grid-cols-10 gap-2 p-3 bg-black/20 rounded-lg border border-gray-600 max-h-48 overflow-y-auto"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {AVAILABLE_EMOJIS.map((emoji, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setShowEmojiSelector(false);
                    }}
                    className={`
                      text-xl sm:text-2xl p-2 rounded-lg transition-all duration-200
                      ${selectedEmoji === emoji
                        ? 'bg-blue-500 shadow-lg scale-110'
                        : 'bg-black/20 hover:bg-black/40 hover:scale-105'
                      }
                    `}
                    whileHover={{ scale: selectedEmoji === emoji ? 1.1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoggingIn || !isConnected}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Piece Style Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <label className="block text-white font-semibold mb-3">
            🎭 Chọn kiểu quân cờ:
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPieceSelector(!showPieceSelector)}
              className="w-full px-4 py-3 bg-black/20 text-white rounded-lg border border-gray-600 hover:border-gray-500 transition-colors flex items-center justify-between"
              disabled={isLoggingIn || !isConnected}
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
                      disabled={isLoggingIn || !isConnected}
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

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={!nickname.trim() || isLoggingIn || !isConnected}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
            ${nickname.trim() && !isLoggingIn && isConnected
              ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
          whileHover={nickname.trim() && !isLoggingIn && isConnected ? { scale: 1.02 } : {}}
          whileTap={nickname.trim() && !isLoggingIn && isConnected ? { scale: 0.98 } : {}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {isLoggingIn ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Đang đăng nhập...</span>
            </div>
          ) : !isConnected ? (
            '⏳ Đang kết nối...'
          ) : (
            '🚀 Đăng nhập'
          )}
        </motion.button>

        {/* Info Text */}
        <motion.div
          className="text-center text-gray-300 text-sm space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p>🪙 Người chơi mới được tặng <strong className="text-yellow-400">100 xu</strong></p>
          <p>💰 Thắng: +10 xu • Hòa: +5 xu • Thua: -5 xu</p>
          <p className="text-xs text-gray-400">
            Kiếm xu chơi game thuiiii
          </p>
        </motion.div>
      </form>
    </motion.div>
  );
};


export default LoginForm;



import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerModel } from '../types'; // Quay lại import cũ
import toast from 'react-hot-toast';

interface PlayerProfileProps {
  player: PlayerModel;
  onLogout: () => void;
  compact?: boolean; // Hiển thị dạng compact cho mobile
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onLogout, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    toast.success(`Tạm biệt ${player.displayName}! 👋`);
    onLogout();
  };

  const toggleProfile = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    }
  };

  if (compact) {
    // Compact version for mobile/small spaces
    return (
      <motion.div
        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{player.emoji}</span>
            <div>
              <div className="font-semibold text-white text-sm">{player.displayName}</div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">🪙</span>
                <span className="text-yellow-300 font-bold text-sm">{player.coins}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
            title="Đăng xuất"
          >
            👻 Đăng xuất
          </button>
        </div>
      </motion.div>
    );
  }

  // Full version with mobile toggle
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Always visible */}
      <div 
        className={`flex items-center justify-between p-4 sm:p-6 ${isMobile ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
        onClick={toggleProfile}
      >
        <h3 className="text-lg font-bold text-white flex items-center">
          👤 Hồ sơ của bạn
        </h3>
        <div className="flex items-center space-x-3">
          {/* Mobile toggle icon */}
          {isMobile && (
            <motion.span
              className="text-white text-lg"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              ▼
            </motion.span>
          )}
          {/* Logout button - always visible on desktop, hidden on mobile when collapsed */}
          <button
            onClick={(e) => {
              if (isMobile) {
                e.stopPropagation();
              }
              handleLogout();
            }}
            className={`px-3 py-1 bg-red-500 hover:bg-red-500/40 text-white hover:text-gray-200 rounded-lg transition-colors text-sm font-medium ${
              isMobile && !isOpen ? 'hidden' : 'block'
            }`}
          >
            Đăng xuất 👉
          </button>
        </div>
      </div>

      {/* Content - Collapsible on mobile, always visible on desktop */}
      <AnimatePresence>
        {(!isMobile || isOpen) && (
          <motion.div
            className="px-4 pb-4 sm:px-6 sm:pb-6"
            initial={isMobile ? { height: 0, opacity: 0 } : { opacity: 1 }}
            animate={isMobile ? { height: 'auto', opacity: 1 } : { opacity: 1 }}
            exit={isMobile ? { height: 0, opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Player Info */}
            <div className="space-y-4">
              {/* Avatar & Name */}
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{player.emoji}</div>
                <div>
                  <div className="text-xl font-bold text-white">{player.displayName}</div>
                  <div className="text-sm text-gray-400">
                    {!player.createdAt || new Date(player.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 
                      ? 'Người chơi mới' 
                      : `Tham gia từ ${new Date(player.createdAt).toLocaleDateString('vi-VN')}`}
                  </div>
                </div>
              </div>

              {/* Coins */}
              <motion.div
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-3xl">🪙</span>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{player.coins}</div>
                    <div className="text-sm text-yellow-400">xu hiện tại</div>
                  </div>
                </div>
              </motion.div>

              {/* Stats */}
              {player.stats && player.stats.gamesPlayed > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-white text-center">📊 Thống kê</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{player.stats.gamesPlayed}</div>
                      <div className="text-xs text-gray-400">Tổng ván</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{player.stats.gamesWon}</div>
                      <div className="text-xs text-gray-400">Thắng</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-400">{player.stats.gamesDraw}</div>
                      <div className="text-xs text-gray-400">Hòa</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-red-400">{player.stats.gamesLost}</div>
                      <div className="text-xs text-gray-400">Thua</div>
                    </div>
                  </div>
                  
                  {/* Win Rate */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Tỷ lệ thắng</span>
                      <span className="text-sm font-bold text-white">{player.stats.winRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${player.stats.winRate}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* First time message */}
              {(!player.stats || player.stats.gamesPlayed === 0) && (
                <div className="text-center text-gray-400 text-sm bg-black/20 rounded-lg p-3">
                  <div className="text-2xl mb-2">🎮</div>
                  <p>Chưa có thống kê</p>
                  <p className="text-xs">Chơi ván đầu tiên để xem thống kê!</p>
                </div>
              )}

              {/* Coin Rules Reminder */}
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="font-medium text-gray-300 mb-1">💰 Quy tắc xu:</div>
                  <div>🏆 Thắng: <span className="text-green-400">+10 xu</span></div>
                  <div>🤝 Hòa: <span className="text-blue-400">+5 xu</span></div>
                  <div>😔 Thua: <span className="text-red-400">-5 xu</span></div>
                </div>
              </div>

              {/* Mobile logout button when expanded */}
              {isMobile && (
                <button
                  onClick={handleLogout}
                  className="w-full mt-4 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Đăng xuất 👉
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlayerProfile;



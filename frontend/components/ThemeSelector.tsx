import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { BOARD_THEMES } from '../types';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Override colors for theme preview to match actual board colors
  const getThemeColors = (theme: any) => {
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

    return themeColors[theme.name] || { light: theme.light, dark: theme.dark };
  };

  // Separate themes into light and dark categories
  const lightThemes = BOARD_THEMES.filter(theme => 
    !['Đêm tối', 'Ma quái', 'Lava', 'Rừng đêm', 'Biển sâu', 'Không gian', 'Cầu vồng tối'].includes(theme.name)
  );
  
  const darkThemes = BOARD_THEMES.filter(theme => 
    ['Đêm tối', 'Ma quái', 'Lava', 'Rừng đêm', 'Biển sâu', 'Không gian', 'Cầu vồng tối'].includes(theme.name)
  );

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm sm:text-base"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg sm:text-xl">🎨</span>
        <span className="hidden sm:inline text-white font-medium">Theme</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Theme selector - Centered */}
            <motion.div
              className="fixed inset-0 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-600 w-full max-w-md max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg sm:text-xl flex items-center">
                    <span className="mr-2">🎨</span>
                    Chọn theme bàn cờ
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors text-xl p-1"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Light Themes */}
                <div className="mb-6">
                  <h4 className="text-gray-300 font-semibold mb-3 text-sm sm:text-base flex items-center">
                    <span className="mr-2">☀️</span>
                    Themes sáng
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {lightThemes.map((theme, index) => {
                      const colors = getThemeColors(theme);
                      
                      return (
                        <motion.button
                          key={index}
                          onClick={() => {
                            setTheme(theme);
                            setIsOpen(false);
                          }}
                          className={`
                            relative p-3 rounded-xl border-2 transition-all duration-200
                            ${currentTheme.name === theme.name
                              ? 'border-yellow-400 bg-yellow-400/20 shadow-lg'
                              : 'border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50'
                            }
                          `}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Theme info */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg flex-shrink-0">{theme.emoji}</span>
                            <span className="text-white text-sm font-medium truncate">
                              {theme.name}
                            </span>
                          </div>
                          
                          {/* Mini board preview */}
                          <div className="grid grid-cols-4 gap-0 border border-gray-500 rounded overflow-hidden">
                            {Array.from({ length: 16 }, (_, i) => {
                              const isLight = (Math.floor(i / 4) + (i % 4)) % 2 === 0;
                              const colorClass = isLight ? colors.light : colors.dark;
                              return (
                                <div
                                  key={i}
                                  className={`w-4 h-4 ${colorClass}`}
                                />
                              );
                            })}
                          </div>

                          {/* Selected indicator */}
                          {currentTheme.name === theme.name && (
                            <motion.div
                              className="absolute top-2 right-2 bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Dark Themes */}
                <div className="mb-4">
                  <h4 className="text-gray-300 font-semibold mb-3 text-sm sm:text-base flex items-center">
                    <span className="mr-2">🌙</span>
                    Themes tối
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {darkThemes.map((theme, index) => {
                      const colors = getThemeColors(theme);
                      
                      return (
                        <motion.button
                          key={`dark-${index}`}
                          onClick={() => {
                            setTheme(theme);
                            setIsOpen(false);
                          }}
                          className={`
                            relative p-3 rounded-xl border-2 transition-all duration-200
                            ${currentTheme.name === theme.name
                              ? 'border-yellow-400 bg-yellow-400/20 shadow-lg'
                              : 'border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50'
                            }
                          `}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Theme info */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg flex-shrink-0">{theme.emoji}</span>
                            <span className="text-white text-sm font-medium truncate">
                              {theme.name}
                            </span>
                          </div>
                          
                          {/* Mini board preview */}
                          <div className="grid grid-cols-4 gap-0 border border-gray-500 rounded overflow-hidden">
                            {Array.from({ length: 16 }, (_, i) => {
                              const isLight = (Math.floor(i / 4) + (i % 4)) % 2 === 0;
                              const colorClass = isLight ? colors.light : colors.dark;
                              return (
                                <div
                                  key={i}
                                  className={`w-4 h-4 ${colorClass}`}
                                />
                              );
                            })}
                          </div>

                          {/* Selected indicator */}
                          {currentTheme.name === theme.name && (
                            <motion.div
                              className="absolute top-2 right-2 bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Current theme info */}
                <div className="text-center pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm">
                    Theme hiện tại: <span className="text-white font-medium">{currentTheme.emoji} {currentTheme.name}</span>
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
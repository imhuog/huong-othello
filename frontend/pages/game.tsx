import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import Board from '../components/Board';
import GameInfo from '../components/GameInfo';
import Chat from '../components/Chat';
import VoiceChat from '../components/VoiceChat';
import { VoiceParticipant } from '../types';

const GamePage: React.FC = () => {
  const { gameState, currentTheme } = useGame();
  const { currentPlayer } = useSocket();
  const [isVoiceChatVisible, setIsVoiceChatVisible] = useState(true);
  const [roomId, setRoomId] = useState<string | undefined>();

  // Get current room ID from URL or game context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      setRoomId(roomFromUrl || undefined);
    }
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-6xl mb-4">⚫⚪</div>
          <div className="text-xl">Đang tải game...</div>
        </motion.div>
      </div>
    );
  }

  // Convert game players to voice participants
  const voiceParticipants: VoiceParticipant[] = gameState.players
    .filter(p => p.id !== 'AI' && p.isAuthenticated) // Exclude AI and unauthenticated players
    .map(player => ({
      playerId: player.id,
      playerName: player.displayName,
      isMuted: player.voiceState?.isMuted || false,
      isDeafened: player.voiceState?.isDeafened || false,
      isSpeaking: false, // This would be updated by voice activity detection
      volume: 1
    }));

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mobile & Tablet Layout - Stack vertically */}
        <div className="xl:hidden space-y-4 sm:space-y-6">
          {/* Game Board - Top on mobile/tablet */}
          <motion.div
            className={`flex items-center justify-center rounded-2xl p-4 sm:p-6 shadow-2xl ${currentTheme.background} border border-white/10`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Board />
          </motion.div>

          {/* Game Info - Bottom on mobile/tablet */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameInfo />
          </motion.div>
        </div>

        {/* Desktop Layout - Side by side */}
        <div className="hidden xl:grid xl:grid-cols-5 gap-8 min-h-screen">
          {/* Game Info - Left Column (2/5 width) */}
          <motion.div
            className="xl:col-span-2 flex flex-col justify-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameInfo />
          </motion.div>

          {/* Game Board - Right Column (3/5 width) */}
          <motion.div
            className={`xl:col-span-3 flex items-center justify-center rounded-2xl p-6 shadow-2xl ${currentTheme.background} border border-white/10 min-h-[600px]`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Board />
          </motion.div>
        </div>
      </div>

      {/* Chat Component - Fixed position */}
      <Chat />

      {/* Voice Chat Component - THÊM MỚI */}
      {roomId && currentPlayer && gameState.players.length > 1 && (
        <VoiceChat
          roomId={roomId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.displayName}
          participants={voiceParticipants}
          isVisible={isVoiceChatVisible}
          onToggleVisibility={() => setIsVoiceChatVisible(!isVoiceChatVisible)}
        />
      )}

      {/* Voice Chat Toggle Button (nếu đang ẩn) */}
      {!isVoiceChatVisible && roomId && currentPlayer && gameState.players.length > 1 && (
        <motion.button
          onClick={() => setIsVoiceChatVisible(true)}
          className="fixed bottom-4 right-4 z-40 bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-colors"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </motion.button>
      )}
    </div>
  );
};

export default GamePage;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../contexts/VoiceContext';
import { useSocket } from '../contexts/SocketContext';

const VoiceControls: React.FC = () => {
  const { 
    isVoiceEnabled, 
    isMuted, 
    isConnecting, 
    participants, 
    toggleVoiceChat, 
    toggleMute,
    setParticipantVolume 
  } = useVoice();
  const { currentPlayer } = useSocket();
  const [showParticipants, setShowParticipants] = useState(false);

  if (!currentPlayer) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2">
      {/* Voice Chat Toggle Button */}
      <motion.button
        onClick={toggleVoiceChat}
        disabled={isConnecting}
        className={`
          relative p-4 rounded-full shadow-lg transition-all duration-300
          ${isVoiceEnabled 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          border-2 border-white/10
        `}
        whileTap={{ scale: 0.95 }}
        title={isVoiceEnabled ? 'Tắt Voice Chat' : 'Bật Voice Chat'}
      >
        {isConnecting ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isVoiceEnabled 
                ? "M19 11c0 1.657-1.343 3-3 3s-3-1.343-3-3m0 0c0 1.657-1.343 3-3 3s-3-1.343-3-3m6 0V9a3 3 0 00-6 0v2a3 3 0 006 0z M19 11v6a7 7 0 01-14 0v-6"
                : "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              }
            />
          </svg>
        )}
        
        {/* Connection indicator */}
        {isVoiceEnabled && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        )}
      </motion.button>

      {/* Mute/Unmute Button - Only show when voice is enabled */}
      <AnimatePresence>
        {isVoiceEnabled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={toggleMute}
            className={`
              p-3 rounded-full shadow-lg transition-all duration-300
              ${isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              hover:scale-105 border-2 border-white/10
            `}
            whileTap={{ scale: 0.95 }}
            title={isMuted ? 'Bật mic' : 'Tắt mic'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMuted ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              )}
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Participants Panel Toggle - Only show when voice is enabled and there are participants */}
      <AnimatePresence>
        {isVoiceEnabled && participants.size > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setShowParticipants(!showParticipants)}
            className={`
              relative p-3 rounded-full shadow-lg transition-all duration-300
              bg-purple-600 hover:bg-purple-700 text-white
              hover:scale-105 border-2 border-white/10
            `}
            whileTap={{ scale: 0.95 }}
            title="Xem người tham gia"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {/* Participant count badge */}
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {participants.size}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && isVoiceEnabled && participants.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-4 min-w-[250px]"
          >
            <div className="text-white text-sm font-semibold mb-3 flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Voice Chat ({participants.size})
            </div>
            
            <div className="space-y-3">
              {Array.from(participants.entries()).map(([participantId, participant]) => (
                <ParticipantItem
                  key={participantId}
                  participantId={participantId}
                  nickname={participant.nickname}
                  onVolumeChange={(volume) => setParticipantVolume(participantId, volume)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ParticipantItemProps {
  participantId: string;
  nickname: string;
  onVolumeChange: (volume: number) => void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participantId,
  nickname,
  onVolumeChange,
}) => {
  const [volume, setVolume] = useState(0.8);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onVolumeChange(newVolume);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-white text-sm font-medium truncate">
          {nickname}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowVolumeControl(!showVolumeControl)}
          className="p-1 rounded text-gray-400 hover:text-white transition-colors"
          title="Điều chỉnh âm lượng"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        </button>
        
        {showVolumeControl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-gray-400 w-8">
              {Math.round(volume * 100)}%
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VoiceControls;

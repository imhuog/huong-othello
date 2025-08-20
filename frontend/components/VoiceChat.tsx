import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useSocket } from '../contexts/SocketContext';

interface VoiceChatProps {
  gameRoomId?: string;
  isVisible?: boolean;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ 
  gameRoomId, 
  isVisible = true 
}) => {
  const { currentPlayer } = useSocket();
  const {
    voiceState,
    joinVoiceChat,
    leaveVoiceChat,
    toggleMic,
    toggleSpeaker,
    participants
  } = useVoiceChat();

  // Auto join voice chat when game room is available
  useEffect(() => {
    if (gameRoomId && currentPlayer && !voiceState.isInVoiceChat) {
      console.log('🎤 Auto joining voice chat for room:', gameRoomId);
    }
  }, [gameRoomId, currentPlayer, voiceState.isInVoiceChat]);

  const handleJoinVoice = () => {
    if (gameRoomId) {
      joinVoiceChat(gameRoomId);
    }
  };

  const handleLeaveVoice = () => {
    if (gameRoomId) {
      leaveVoiceChat(gameRoomId);
    }
  };

  if (!isVisible || !currentPlayer) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-white text-sm font-medium">Voice Chat</span>
            <div className="text-xs text-gray-400">
              {participants.length} người
            </div>
          </div>

          {/* Voice Controls */}
          <div className="flex items-center gap-2">
            {!voiceState.isInVoiceChat ? (
              <motion.button
                onClick={handleJoinVoice}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!gameRoomId}
              >
                <Phone size={16} />
                Tham gia
              </motion.button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Mic Control */}
                <motion.button
                  onClick={toggleMic}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    voiceState.isMicOn
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={voiceState.isMicOn ? 'Tắt mic' : 'Bật mic'}
                >
                  {voiceState.isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                </motion.button>

                {/* Speaker Control */}
                <motion.button
                  onClick={toggleSpeaker}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    voiceState.isSpeakerOn
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={voiceState.isSpeakerOn ? 'Tắt loa' : 'Bật loa'}
                >
                  {voiceState.isSpeakerOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </motion.button>

                {/* Leave Voice Chat */}
                <motion.button
                  onClick={handleLeaveVoice}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Rời voice chat"
                >
                  <PhoneOff size={16} />
                </motion.button>
              </div>
            )}
          </div>

          {/* Participants List */}
          {voiceState.isInVoiceChat && participants.length > 0 && (
            <motion.div
              className="mt-3 pt-3 border-t border-gray-700"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-xs text-gray-400 mb-2">Trong cuộc gọi:</div>
              <div className="space-y-1">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 text-xs text-gray-300"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      participant.isMicOn ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span>{participant.nickname}</span>
                    {participant.id === currentPlayer.id && (
                      <span className="text-blue-400">(bạn)</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Connection Status */}
          {voiceState.isConnecting && (
            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              Đang kết nối...
            </div>
          )}

          {voiceState.error && (
            <div className="mt-2 text-xs text-red-400">
              {voiceState.error}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceChat;

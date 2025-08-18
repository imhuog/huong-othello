import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceChat } from '../hooks/useVoiceChat';
import VoiceControls from './VoiceControls';
import { VoiceParticipant } from '../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Users, 
  Wifi, 
  WifiOff,
  Phone,
  PhoneOff,
  AlertTriangle
} from 'lucide-react';

interface VoiceChatProps {
  roomId?: string;
  playerId?: string;
  playerName?: string;
  participants?: VoiceParticipant[];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({
  roomId,
  playerId,
  playerName,
  participants = [],
  isVisible = true,
  onToggleVisibility
}) => {
  const {
    voiceState,
    connectVoice,
    disconnectVoice,
    toggleMute,
    toggleDeafen,
    isSupported
  } = useVoiceChat({ roomId, playerId, playerName });

  const [isExpanded, setIsExpanded] = useState(false);

  // Show unsupported browser warning
  if (!isSupported) {
    return (
      <motion.div
        className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg border border-red-400/50 max-w-xs"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">Voice Chat không hỗ trợ</div>
            <div className="text-xs opacity-90">Trình duyệt của bạn không hỗ trợ WebRTC</div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isVisible) return null;

  const connectionStatusIcon = () => {
    switch (voiceState.connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (voiceState.connectionStatus) {
      case 'connected':
        return 'Đã kết nối';
      case 'connecting':
        return 'Đang kết nối...';
      case 'error':
        return 'Lỗi kết nối';
      default:
        return 'Chưa kết nối';
    }
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
    >
      {/* Main Voice Chat Panel */}
      <motion.div
        className={`bg-gray-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden ${
          isExpanded ? 'w-80' : 'w-60'
        }`}
        layout
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <Phone className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">Voice Chat</div>
              <div className="text-xs text-gray-400 flex items-center space-x-1">
                {connectionStatusIcon()}
                <span>{getConnectionStatusText()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Users className="w-3 h-3" />
              <span>{voiceState.participants.length}</span>
            </div>
            {onToggleVisibility && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility();
                }}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              >
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Participants List */}
              {voiceState.participants.length > 0 && (
                <div className="p-3 border-b border-gray-700/50">
                  <div className="text-xs font-semibold text-gray-400 mb-2">
                    NGƯỜI THAM GIA ({voiceState.participants.length})
                  </div>
                  <div className="space-y-1">
                    {voiceState.participants.map((participant) => (
                      <motion.div
                        key={participant.playerId}
                        className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            participant.isConnected ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm">{participant.playerName}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {participant.isMuted ? (
                            <MicOff className="w-3 h-3 text-red-400" />
                          ) : (
                            <Mic className={`w-3 h-3 ${
                              participant.isSpeaking ? 'text-green-400 animate-pulse' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Message */}
              {voiceState.participants.length === 0 && voiceState.isConnected && (
                <div className="p-4 text-center">
                  <div className="text-gray-400 text-sm">
                    Chờ người khác tham gia voice chat...
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="p-3">
          <VoiceControls
            isConnected={voiceState.isConnected}
            isMuted={voiceState.isMuted}
            isDeafened={voiceState.isDeafened}
            connectionStatus={voiceState.connectionStatus}
            onConnect={connectVoice}
            onDisconnect={disconnectVoice}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
          />
        </div>

        {/* Connection Status Bar */}
        <div className={`h-1 transition-all duration-300 ${
          voiceState.connectionStatus === 'connected' 
            ? 'bg-green-400' 
            : voiceState.connectionStatus === 'connecting'
            ? 'bg-yellow-400 animate-pulse'
            : voiceState.connectionStatus === 'error'
            ? 'bg-red-400'
            : 'bg-gray-600'
        }`} />
      </motion.div>

      {/* Floating Connection Indicator (when collapsed) */}
      {!isExpanded && voiceState.isConnected && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Phone className="w-3 h-3 text-white" />
        </motion.div>
      )}

      {/* Quick Mute Indicator */}
      {voiceState.isConnected && voiceState.isMuted && (
        <motion.div
          className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <MicOff className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default VoiceChat;

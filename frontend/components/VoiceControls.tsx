import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff,
  Loader2
} from 'lucide-react';

interface VoiceControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isConnected,
  isMuted,
  isDeafened,
  connectionStatus,
  onConnect,
  onDisconnect,
  onToggleMute,
  onToggleDeafen
}) => {
  const buttonBaseClass = "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  return (
    <div className="flex items-center justify-center space-x-2">
      {/* Connect/Disconnect Button */}
      {!isConnected ? (
        <motion.button
          onClick={onConnect}
          disabled={connectionStatus === 'connecting'}
          className={`${buttonBaseClass} ${
            connectionStatus === 'connecting'
              ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
          whileHover={connectionStatus !== 'connecting' ? { scale: 1.05 } : {}}
          whileTap={connectionStatus !== 'connecting' ? { scale: 0.95 } : {}}
        >
          {connectionStatus === 'connecting' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </motion.button>
      ) : (
        <motion.button
          onClick={onDisconnect}
          className={`${buttonBaseClass} bg-red-500/20 text-red-400 hover:bg-red-500/30`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PhoneOff className="w-5 h-5" />
        </motion.button>
      )}

      {/* Mute/Unmute Button */}
      <motion.button
        onClick={onToggleMute}
        disabled={!isConnected}
        className={`${buttonBaseClass} ${
          !isConnected
            ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            : isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
        }`}
        whileHover={isConnected ? { scale: 1.05 } : {}}
        whileTap={isConnected ? { scale: 0.95 } : {}}
        animate={isMuted ? { 
          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.5)' 
        } : {}}
      >
        {isMuted ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </motion.button>

      {/* Deafen/Undeafen Button */}
      <motion.button
        onClick={onToggleDeafen}
        disabled={!isConnected}
        className={`${buttonBaseClass} ${
          !isConnected
            ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            : isDeafened
            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
        }`}
        whileHover={isConnected ? { scale: 1.05 } : {}}
        whileTap={isConnected ? { scale: 0.95 } : {}}
        animate={isDeafened ? { 
          boxShadow: '0 0 0 2px rgba(251, 146, 60, 0.5)' 
        } : {}}
      >
        {isDeafened ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </motion.button>
    </div>
  );
};

export default VoiceControls;

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';

interface VoiceChatProps {
  roomId: string;
}

interface VoiceSettings {
  micVolume: number;
  speakerVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ roomId }) => {
  const socket = useSocket();
  const { gameState } = useGame();
  
  // Voice states
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    micVolume: 80,
    speakerVolume: 70,
    noiseSuppression: true,
    echoCancellation: true
  });
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const volumeDataRef = useRef<Uint8Array | null>(null);

  // Check WebRTC support
  useEffect(() => {
    const checkSupport = () => {
      const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setIsVoiceSupported(hasWebRTC && hasGetUserMedia);
    };
    
    checkSupport();
  }, []);

  // Setup audio analysis for speaking detection
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      micAnalyserRef.current = analyser;
      volumeDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      // Start volume monitoring
      const checkVolume = () => {
        if (micAnalyserRef.current && volumeDataRef.current && isMicOn) {
          micAnalyserRef.current.getByteFrequencyData(volumeDataRef.current);
          const volume = volumeDataRef.current.reduce((sum, value) => sum + value, 0) / volumeDataRef.current.length;
          
          const isSpeaking = volume > 10; // Threshold for speaking detection
          if (isSpeaking) {
            socket?.emit('userSpeaking', { roomId, speaking: true });
          } else {
            socket?.emit('userSpeaking', { roomId, speaking: false });
          }
        }
        
        if (isMicOn) {
          requestAnimationFrame(checkVolume);
        }
      };
      
      if (isMicOn) {
        checkVolume();
      }
    } catch (error) {
      console.error('Audio analysis setup failed:', error);
    }
  };

  // Initialize WebRTC peer connection
  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const audioElement = new Audio();
      audioElement.srcObject = remoteStream;
      audioElement.volume = voiceSettings.speakerVolume / 100;
      audioElement.autoplay = true;
      
      remoteAudiosRef.current.set(peerId, audioElement);
      
      if (isSpeakerOn) {
        audioElement.play().catch(console.error);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('voiceIceCandidate', {
          roomId,
          candidate: event.candidate,
          targetPeerId: peerId
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`Peer connection with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectedPeers(prev => new Set([...prev, peerId]));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectedPeers(prev => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          return newSet;
        });
      }
    };

    return pc;
  };

  // Start voice chat
  const startVoiceChat = async () => {
    if (!isVoiceSupported) {
      alert('Trình duyệt của bạn không hỗ trợ voice chat');
      return;
    }

    setIsConnecting(true);
    
    try {
      const constraints = {
        audio: {
          echoCancellation: voiceSettings.echoCancellation,
          noiseSuppression: voiceSettings.noiseSuppression,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      // Setup audio analysis
      setupAudioAnalysis(stream);
      
      setIsMicOn(true);
      socket?.emit('voiceJoinRoom', { roomId });
      
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      alert('Không thể truy cập microphone. Vui lòng cấp quyền và thử lại.');
    }
    
    setIsConnecting(false);
  };

  // Stop voice chat
  const stopVoiceChat = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Stop remote audio elements
    remoteAudiosRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    // Clean up audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    setIsMicOn(false);
    setConnectedPeers(new Set());
    socket?.emit('voiceLeaveRoom', { roomId });
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (!localStreamRef.current) {
      startVoiceChat();
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      
      if (!audioTrack.enabled) {
        socket?.emit('userSpeaking', { roomId, speaking: false });
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    remoteAudiosRef.current.forEach(audio => {
      if (newSpeakerState) {
        audio.volume = voiceSettings.speakerVolume / 100;
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
    });
  };

  // Update audio settings
  const updateAudioSettings = (newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...voiceSettings, ...newSettings };
    setVoiceSettings(updatedSettings);
    
    // Apply speaker volume changes
    if (newSettings.speakerVolume !== undefined) {
      remoteAudiosRef.current.forEach(audio => {
        audio.volume = updatedSettings.speakerVolume / 100;
      });
    }

    // Apply microphone volume changes
    if (newSettings.micVolume !== undefined && localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack && 'volume' in audioTrack) {
        (audioTrack as any).volume = updatedSettings.micVolume / 100;
      }
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleVoiceUserJoined = async ({ peerId }: { peerId: string }) => {
      if (peerId === socket.id || !localStreamRef.current) return;
      
      const pc = createPeerConnection(peerId);
      peerConnectionsRef.current.set(peerId, pc);
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('voiceOffer', {
          roomId,
          offer,
          targetPeerId: peerId
        });
      } catch (error) {
        console.error('Failed to create offer:', error);
      }
    };

    const handleVoiceOffer = async ({ offer, fromPeerId }: { offer: RTCSessionDescriptionInit; fromPeerId: string }) => {
      if (!localStreamRef.current) return;
      
      const pc = createPeerConnection(fromPeerId);
      peerConnectionsRef.current.set(fromPeerId, pc);
      
      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('voiceAnswer', {
          roomId,
          answer,
          targetPeerId: fromPeerId
        });
      } catch (error) {
        console.error('Failed to handle offer:', error);
      }
    };

    const handleVoiceAnswer = async ({ answer, fromPeerId }: { answer: RTCSessionDescriptionInit; fromPeerId: string }) => {
      const pc = peerConnectionsRef.current.get(fromPeerId);
      if (pc) {
        try {
          await pc.setRemoteDescription(answer);
        } catch (error) {
          console.error('Failed to set remote description:', error);
        }
      }
    };

    const handleVoiceIceCandidate = async ({ candidate, fromPeerId }: { candidate: RTCIceCandidateInit; fromPeerId: string }) => {
      const pc = peerConnectionsRef.current.get(fromPeerId);
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error('Failed to add ICE candidate:', error);
        }
      }
    };

    const handleUserSpeaking = ({ userId, speaking }: { userId: string; speaking: boolean }) => {
      setSpeakingUsers(prev => {
        const newSet = new Set(prev);
        if (speaking) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    const handleVoiceUserLeft = ({ peerId }: { peerId: string }) => {
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }
      
      const audioElement = remoteAudiosRef.current.get(peerId);
      if (audioElement) {
        audioElement.pause();
        audioElement.srcObject = null;
        remoteAudiosRef.current.delete(peerId);
      }
      
      setConnectedPeers(prev => {
        const newSet = new Set(prev);
        newSet.delete(peerId);
        return newSet;
      });
    };

    // Register socket event handlers
    socket.on('voiceUserJoined', handleVoiceUserJoined);
    socket.on('voiceOffer', handleVoiceOffer);
    socket.on('voiceAnswer', handleVoiceAnswer);
    socket.on('voiceIceCandidate', handleVoiceIceCandidate);
    socket.on('userSpeaking', handleUserSpeaking);
    socket.on('voiceUserLeft', handleVoiceUserLeft);

    return () => {
      socket.off('voiceUserJoined', handleVoiceUserJoined);
      socket.off('voiceOffer', handleVoiceOffer);
      socket.off('voiceAnswer', handleVoiceAnswer);
      socket.off('voiceIceCandidate', handleVoiceIceCandidate);
      socket.off('userSpeaking', handleUserSpeaking);
      socket.off('voiceUserLeft', handleVoiceUserLeft);
    };
  }, [socket, roomId, isMicOn, localStreamRef.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  // Don't show voice chat for AI games
  if (!gameState || gameState.players.some(p => p.id === 'AI')) {
    return null;
  }

  // Only show when there are 2 players
  if (gameState.players.length < 2) {
    return null;
  }

  if (!isVoiceSupported) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-3 text-white text-sm">
        <div className="flex items-center space-x-2">
          <MicOff className="w-4 h-4" />
          <span>Voice chat không được hỗ trợ</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Voice Chat Controls */}
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${connectedPeers.size > 0 ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-300">
              {connectedPeers.size > 0 ? `${connectedPeers.size} kết nối` : 'Chưa kết nối'}
            </span>
          </div>

          {/* Microphone Toggle */}
          <button
            onClick={toggleMicrophone}
            disabled={isConnecting}
            className={`relative p-2 rounded-full transition-all duration-200 ${
              isMicOn 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
            } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            title={isMicOn ? 'Tắt mic' : 'Bật mic'}
          >
            {isConnecting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isMicOn ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
            
            {/* Speaking indicator */}
            {isMicOn && speakingUsers.has(socket?.id || '') && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-all duration-200 ${
              isSpeakerOn 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
            } hover:scale-105`}
            title={isSpeakerOn ? 'Tắt loa' : 'Bật loa'}
          >
            {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
            title="Cài đặt âm thanh"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Speaking Indicators for Other Players */}
        {connectedPeers.size > 0 && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs text-gray-400">Đang nói:</span>
            {gameState.players
              .filter(player => speakingUsers.has(player.id) && player.id !== socket?.id)
              .map(player => (
                <div key={player.id} className="flex items-center space-x-1">
                  <span className="text-xs">{player.emoji}</span>
                  <span className="text-xs text-green-400">{player.displayName}</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
              ))}
            {!gameState.players.some(player => speakingUsers.has(player.id) && player.id !== socket?.id) && (
              <span className="text-xs text-gray-500">Không ai</span>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 shadow-xl w-64">
          <h3 className="text-sm font-semibold text-white mb-3">Cài đặt âm thanh</h3>
          
          {/* Mic Volume */}
          <div className="mb-3">
            <label className="block text-xs text-gray-300 mb-1">Âm lượng mic ({voiceSettings.micVolume}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={voiceSettings.micVolume}
              onChange={(e) => updateAudioSettings({ micVolume: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Speaker Volume */}
          <div className="mb-3">
            <label className="block text-xs text-gray-300 mb-1">Âm lượng loa ({voiceSettings.speakerVolume}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={voiceSettings.speakerVolume}
              onChange={(e) => updateAudioSettings({ speakerVolume: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Audio Enhancement Options */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={voiceSettings.noiseSuppression}
                onChange={(e) => updateAudioSettings({ noiseSuppression: e.target.checked })}
                className="rounded"
              />
              <span>Khử tiếng ồn</span>
            </label>
            
            <label className="flex items-center space-x-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={voiceSettings.echoCancellation}
                onChange={(e) => updateAudioSettings({ echoCancellation: e.target.checked })}
                className="rounded"
              />
              <span>Khử tiếng vang</span>
            </label>
          </div>

          {/* Connection Info */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div>Kết nối: {connectedPeers.size}/{gameState.players.length - 1}</div>
              <div>Mic: {isMicOn ? 'Đang bật' : 'Đã tắt'}</div>
              <div>Loa: {isSpeakerOn ? 'Đang bật' : 'Đã tắt'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Chat Instructions */}
      {!isMicOn && gameState.players.length === 2 && (
        <div className="absolute bottom-full right-0 mb-2 bg-blue-900/80 backdrop-blur-sm border border-blue-500/30 rounded-lg p-3 text-white text-sm max-w-48">
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4 flex-shrink-0" />
            <span>Nhấn để bật voice chat và nói chuyện với đối thủ!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;

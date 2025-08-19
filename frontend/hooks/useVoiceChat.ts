import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { VoiceChatState, VoiceSignalData, VoiceParticipant } from '../types';
import toast from 'react-hot-toast';

// useVoiceChat.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { VoiceChatState, VoiceSignalData, VoiceParticipant, getDefaultVoiceSettings } from '../types';
import toast from 'react-hot-toast';

// ... interface UseVoiceChatOptions

const [voiceState, setVoiceState] = useState<VoiceChatState>({
  isConnected: false,
  isMuted: false,
  isDeafened: false,
  isRecording: false, // ← Thêm
  isMicOn: false, // ← Thêm
  isSpeakerOn: true, // ← Thêm
  participants: [],
  connectedPeers: new Set<string>(), // ← Thêm
  speakingUsers: new Set<string>(), // ← Thêm
  connectionStatus: 'disconnected',
  currentUser: undefined, // ← Thêm nếu thiếu
  error: undefined, // ← Thêm nếu thiếu
  settings: getDefaultVoiceSettings() // ← Thêm
});

interface UseVoiceChatOptions {
  roomId?: string;
  playerId?: string;
  playerName?: string;
}

interface UseVoiceChatReturn {
  voiceState: VoiceChatState;
  connectVoice: () => Promise<void>;
  disconnectVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  isSupported: boolean;
}

export const useVoiceChat = (options: UseVoiceChatOptions): UseVoiceChatReturn => {
  const { sendVoiceSignal, onVoiceSignal, offVoiceSignal } = useSocket();
  
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isConnected: false,
    isMuted: false,
    isDeafened: false,
    participants: [],
    connectionStatus: 'disconnected'
  });

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Check WebRTC support - Fixed the condition
  const isSupported = !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    window.RTCPeerConnection
  );

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Create peer connection
  const createPeerConnection = useCallback((remotePlayerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && options.playerId) {
        sendVoiceSignal({
          type: 'ice-candidate',
          from: options.playerId,
          to: remotePlayerId,
          data: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎵 Received remote stream from:', remotePlayerId);
      const [remoteStream] = event.streams;
      
      // Create audio element for remote stream
      let audioElement = audioElementsRef.current.get(remotePlayerId);
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.volume = voiceState.isDeafened ? 0 : 1;
        audioElementsRef.current.set(remotePlayerId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
      
      // Update participant
      setVoiceState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.playerId === remotePlayerId
            ? { ...p, isConnected: true }
            : p
        )
      }));
    };

    return pc;
  }, [sendVoiceSignal, options.playerId, voiceState.isDeafened]);

  // Connect to voice chat
  const connectVoice = useCallback(async () => {
    if (!isSupported) {
      toast.error('Trình duyệt không hỗ trợ voice chat!');
      return;
    }

    if (!options.roomId || !options.playerId) {
      toast.error('Thông tin phòng không hợp lệ!');
      return;
    }

    try {
      setVoiceState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      
      setVoiceState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'connected'
      }));

      toast.success('Đã kết nối voice chat!', {
        icon: '🎙️',
        duration: 2000
      });

    } catch (error) {
      console.error('❌ Failed to connect voice chat:', error);
      setVoiceState(prev => ({ ...prev, connectionStatus: 'error' }));
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Vui lòng cho phép truy cập microphone!');
        } else if (error.name === 'NotFoundError') {
          toast.error('Không tìm thấy microphone!');
        } else {
          toast.error('Không thể kết nối voice chat!');
        }
      }
    }
  }, [isSupported, options.roomId, options.playerId]);

  // Disconnect voice chat
  const disconnectVoice = useCallback(() => {
    console.log('🔇 Disconnecting voice chat');

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Remove audio elements
    audioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    setVoiceState({
      isConnected: false,
      isMuted: false,
      isDeafened: false,
      participants: [],
      connectionStatus: 'disconnected'
    });

    toast.success('Đã ngắt kết nối voice chat!', {
      icon: '🔇',
      duration: 2000
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = voiceState.isMuted;
      setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      
      // Notify other participants
      if (options.playerId) {
        sendVoiceSignal({
          type: 'voice-state-change',
          from: options.playerId,
          to: 'all',
          muted: !voiceState.isMuted
        });
      }

      toast.success(voiceState.isMuted ? 'Đã bật mic' : 'Đã tắt mic', {
        icon: voiceState.isMuted ? '🎙️' : '🔇',
        duration: 1000
      });
    }
  }, [voiceState.isMuted, sendVoiceSignal, options.playerId]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    const newDeafened = !voiceState.isDeafened;
    
    // Update all audio elements volume
    audioElementsRef.current.forEach(audio => {
      audio.volume = newDeafened ? 0 : 1;
    });

    setVoiceState(prev => ({ ...prev, isDeafened: newDeafened }));

    toast.success(newDeafened ? 'Đã tắt loa' : 'Đã bật loa', {
      icon: newDeafened ? '🔇' : '🔊',
      duration: 1000
    });
  }, [voiceState.isDeafened]);

  // Handle WebRTC signaling
  const handleVoiceSignal = useCallback(async (data: VoiceSignalData) => {
    if (!options.playerId || data.to !== options.playerId) return;

    console.log('🎙️ Handling voice signal:', data.type, 'from:', data.from);

    try {
      switch (data.type) {
        case 'offer': {
          const pc = createPeerConnection(data.from);
          peerConnectionsRef.current.set(data.from, pc);

          // Add local stream
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(data.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendVoiceSignal({
            type: 'answer',
            from: options.playerId,
            to: data.from,
            data: answer
          });
          break;
        }

        case 'answer': {
          const pc = peerConnectionsRef.current.get(data.from);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.data));
          }
          break;
        }

        case 'ice-candidate': {
          const pc = peerConnectionsRef.current.get(data.from);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.data));
          }
          break;
        }

        case 'voice-state-change': {
          setVoiceState(prev => ({
            ...prev,
            participants: prev.participants.map(p =>
              p.playerId === data.from
                ? { ...p, isMuted: data.muted || false }
                : p
            )
          }));
          break;
        }
      }
    } catch (error) {
      console.error('❌ Voice signal handling error:', error);
    }
  }, [options.playerId, createPeerConnection, sendVoiceSignal]);

  // Initialize peer connection for new participant
  const initializePeerConnection = useCallback(async (remotePlayerId: string) => {
    if (!localStreamRef.current || !options.playerId) return;

    const pc = createPeerConnection(remotePlayerId);
    peerConnectionsRef.current.set(remotePlayerId, pc);

    // Add local stream
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendVoiceSignal({
      type: 'offer',
      from: options.playerId,
      to: remotePlayerId,
      data: offer
    });
  }, [createPeerConnection, sendVoiceSignal, options.playerId]);

  // Setup voice signal listener
  useEffect(() => {
    onVoiceSignal(handleVoiceSignal);
    return () => offVoiceSignal();
  }, [handleVoiceSignal, onVoiceSignal, offVoiceSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, [disconnectVoice]);

  return {
    voiceState,
    connectVoice,
    disconnectVoice,
    toggleMute,
    toggleDeafen,
    isSupported
  };
};

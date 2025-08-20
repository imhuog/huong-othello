import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface VoiceContextType {
  isVoiceEnabled: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  participants: Map<string, { stream: MediaStream; nickname: string }>;
  
  // Actions
  toggleVoiceChat: () => void;
  toggleMute: () => void;
  setParticipantVolume: (participantId: string, volume: number) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

interface VoiceProviderProps {
  children: React.ReactNode;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children }) => {
  const { socket, currentPlayer, isConnected } = useSocket();
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<Map<string, { stream: MediaStream; nickname: string }>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebRTC when socket connects
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for voice chat events
    socket.on('voice-offer', async ({ from, offer, nickname }) => {
      console.log('📞 Received voice offer from:', nickname);
      await handleVoiceOffer(from, offer, nickname);
    });

    socket.on('voice-answer', async ({ from, answer }) => {
      console.log('📞 Received voice answer from:', from);
      await handleVoiceAnswer(from, answer);
    });

    socket.on('voice-ice-candidate', async ({ from, candidate }) => {
      console.log('🧊 Received ICE candidate from:', from);
      await handleIceCandidate(from, candidate);
    });

    socket.on('voice-user-joined', ({ userId, nickname }) => {
      console.log('🎤 User joined voice chat:', nickname);
      if (isVoiceEnabled) {
        initiateCall(userId, nickname);
      }
    });

    socket.on('voice-user-left', ({ userId }) => {
      console.log('👋 User left voice chat:', userId);
      handleUserLeft(userId);
    });

    socket.on('voice-user-muted', ({ userId, isMuted: userMuted }) => {
      console.log('🔇 User mute status changed:', userId, userMuted);
      // Handle remote user mute status if needed
    });

    return () => {
      socket.off('voice-offer');
      socket.off('voice-answer');
      socket.off('voice-ice-candidate');
      socket.off('voice-user-joined');
      socket.off('voice-user-left');
      socket.off('voice-user-muted');
    };
  }, [socket, isConnected, isVoiceEnabled]);

  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log('🎵 Received remote stream from:', peerId);
      const remoteStream = event.streams[0];
      
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const existingParticipant = newParticipants.get(peerId);
        if (existingParticipant) {
          newParticipants.set(peerId, {
            ...existingParticipant,
            stream: remoteStream
          });
        }
        return newParticipants;
      });

      // Create and play audio element
      playRemoteStream(peerId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice-ice-candidate', {
          to: peerId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || 
          peerConnection.connectionState === 'disconnected') {
        handleUserLeft(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, peerConnection);
    return peerConnection;
  };

  const playRemoteStream = (peerId: string, stream: MediaStream) => {
    // Remove existing audio element if any
    const existingAudio = audioElementsRef.current.get(peerId);
    if (existingAudio) {
      existingAudio.remove();
    }

    // Create new audio element
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = 0.8; // Default volume
    document.body.appendChild(audioElement);
    
    audioElementsRef.current.set(peerId, audioElement);
  };

  const handleVoiceOffer = async (from: string, offer: RTCSessionDescriptionInit, nickname: string) => {
    if (!isVoiceEnabled) return;

    try {
      const peerConnection = createPeerConnection(from);
      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.set(from, { stream: new MediaStream(), nickname });
        return newParticipants;
      });

      if (socket) {
        socket.emit('voice-answer', {
          to: from,
          answer: answer
        });
      }
    } catch (error) {
      console.error('❌ Error handling voice offer:', error);
    }
  };

  const handleVoiceAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('❌ Error handling voice answer:', error);
    }
  };

  const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(from);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  };

  const initiateCall = async (peerId: string, nickname: string) => {
    if (!localStreamRef.current) return;

    try {
      const peerConnection = createPeerConnection(peerId);
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.set(peerId, { stream: new MediaStream(), nickname });
        return newParticipants;
      });

      if (socket) {
        socket.emit('voice-offer', {
          to: peerId,
          offer: offer,
          nickname: currentPlayer?.displayName || 'Unknown'
        });
      }
    } catch (error) {
      console.error('❌ Error initiating call:', error);
    }
  };

  const handleUserLeft = (userId: string) => {
    // Clean up peer connection
    const peerConnection = peerConnectionsRef.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(userId);
    }

    // Remove audio element
    const audioElement = audioElementsRef.current.get(userId);
    if (audioElement) {
      audioElement.remove();
      audioElementsRef.current.delete(userId);
    }

    // Remove from participants
    setParticipants(prev => {
      const newParticipants = new Map(prev);
      newParticipants.delete(userId);
      return newParticipants;
    });
  };

  const toggleVoiceChat = async () => {
    if (!socket || !currentPlayer) {
      toast.error('Bạn cần đăng nhập để sử dụng voice chat!');
      return;
    }

    setIsConnecting(true);

    try {
      if (!isVoiceEnabled) {
        // Enable voice chat
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        localStreamRef.current = stream;
        setIsVoiceEnabled(true);
        
        // Notify server that user joined voice chat
        socket.emit('voice-user-joined', {
          nickname: currentPlayer.displayName
        });

        toast.success('Voice chat đã bật! 🎤', {
          icon: '🔊'
        });
      } else {
        // Disable voice chat
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          localStreamRef.current = null;
        }

        // Close all peer connections
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();

        // Remove all audio elements
        audioElementsRef.current.forEach(audio => audio.remove());
        audioElementsRef.current.clear();

        setIsVoiceEnabled(false);
        setParticipants(new Map());
        
        // Notify server that user left voice chat
        socket.emit('voice-user-left');

        toast.success('Voice chat đã tắt! 🔇');
      }
    } catch (error) {
      console.error('❌ Error toggling voice chat:', error);
      toast.error('Không thể bật/tắt voice chat. Vui lòng kiểm tra microphone!');
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      
      // Notify other users about mute status
      if (socket) {
        socket.emit('voice-user-muted', {
          isMuted: !audioTrack.enabled
        });
      }

      toast.success(
        audioTrack.enabled ? 'Microphone đã bật! 🎤' : 'Microphone đã tắt! 🔇',
        { duration: 1500 }
      );
    }
  };

  const setParticipantVolume = (participantId: string, volume: number) => {
    const audioElement = audioElementsRef.current.get(participantId);
    if (audioElement) {
      audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      audioElementsRef.current.forEach(audio => audio.remove());
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isVoiceEnabled,
        isMuted,
        isConnecting,
        participants,
        toggleVoiceChat,
        toggleMute,
        setParticipantVolume,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceParticipant } from '../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface VoiceState {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  participants: VoiceParticipant[];
  connectionStatus: ConnectionStatus;
  error?: string;
}

export interface UseVoiceChatParams {
  roomId?: string;
  playerId?: string;
  playerName?: string;
}

export interface UseVoiceChatReturn {
  voiceState: VoiceState;
  connectVoice: () => Promise<void>;
  disconnectVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  isSupported: boolean;
}

export const useVoiceChat = ({
  roomId,
  playerId,
  playerName
}: UseVoiceChatParams = {}): UseVoiceChatReturn => {
  
  // Check WebRTC support - Fixed the TypeScript error
  const isSupported = !!(
    navigator.mediaDevices?.getUserMedia &&
    window.RTCPeerConnection &&
    window.MediaStream
  );

  const [voiceState, setVoiceState] = useState<VoiceState>({
    isConnected: false,
    isMuted: false,
    isDeafened: false,
    participants: [],
    connectionStatus: 'disconnected'
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (!isSupported) return null;

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId,
          playerId
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      // Handle incoming audio stream
      console.log('Received remote stream:', event.streams[0]);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('Connection state changed:', state);
      
      if (state === 'connected') {
        setVoiceState(prev => ({
          ...prev,
          isConnected: true,
          connectionStatus: 'connected',
          error: undefined
        }));
      } else if (state === 'disconnected' || state === 'failed') {
        setVoiceState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'error',
          error: 'Connection failed'
        }));
      }
    };

    return peerConnection;
  }, [roomId, playerId, isSupported]);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!roomId) return null;

    // Replace with your actual WebSocket server URL
    const ws = new WebSocket(`wss://your-websocket-server.com/voice?roomId=${roomId}&playerId=${playerId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setVoiceState(prev => ({
        ...prev,
        connectionStatus: 'connecting'
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'user-joined':
            setVoiceState(prev => ({
              ...prev,
              participants: [...prev.participants, {
                playerId: message.playerId,
                playerName: message.playerName,
                isMuted: false,
                isSpeaking: false
              }]
            }));
            break;

          case 'user-left':
            setVoiceState(prev => ({
              ...prev,
              participants: prev.participants.filter(p => p.playerId !== message.playerId)
            }));
            break;

          case 'offer':
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.offer));
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              
              ws.send(JSON.stringify({
                type: 'answer',
                answer: answer,
                roomId,
                playerId
              }));
            }
            break;

          case 'answer':
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.answer));
            }
            break;

          case 'ice-candidate':
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
            break;

          case 'user-muted':
            setVoiceState(prev => ({
              ...prev,
              participants: prev.participants.map(p => 
                p.playerId === message.playerId 
                  ? { ...p, isMuted: message.isMuted }
                  : p
              )
            }));
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setVoiceState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: 'WebSocket connection failed'
      }));
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setVoiceState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected',
        participants: []
      }));
    };

    return ws;
  }, [roomId, playerId]);

  // Connect to voice chat
  const connectVoice = useCallback(async () => {
    if (!isSupported || !roomId || !playerId) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Voice chat not supported or missing required parameters'
      }));
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
        },
        video: false
      });

      localStreamRef.current = stream;

      // Initialize peer connection
      const peerConnection = initializePeerConnection();
      if (!peerConnection) throw new Error('Failed to initialize peer connection');
      
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Initialize WebSocket
      const ws = initializeWebSocket();
      if (!ws) throw new Error('Failed to initialize WebSocket');
      
      websocketRef.current = ws;

    } catch (error) {
      console.error('Failed to connect to voice chat:', error);
      setVoiceState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [roomId, playerId, isSupported, initializePeerConnection, initializeWebSocket]);

  // Disconnect from voice chat
  const disconnectVoice = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    setVoiceState({
      isConnected: false,
      isMuted: false,
      isDeafened: false,
      participants: [],
      connectionStatus: 'disconnected'
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTracks = localStreamRef.current.getAudioTracks();
    const newMutedState = !voiceState.isMuted;
    
    audioTracks.forEach(track => {
      track.enabled = !newMutedState;
    });

    setVoiceState(prev => ({ ...prev, isMuted: newMutedState }));

    // Notify other participants
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'user-muted',
        isMuted: newMutedState,
        roomId,
        playerId
      }));
    }
  }, [voiceState.isMuted, roomId, playerId]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    setVoiceState(prev => ({ ...prev, isDeafened: !prev.isDeafened }));
  }, []);

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

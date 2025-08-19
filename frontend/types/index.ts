// types.ts - Cập nhật định nghĩa theme và player options với Voice Chat
export interface VoiceParticipant {
  userId: string;
  username?: string;
  isConnected: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  joinedAt: Date;
}

export interface VoiceSignalData {
  userId: string;
  audioData?: ArrayBuffer | Blob;
  isRecording?: boolean;
  timestamp?: number;
  type?: 'audio' | 'mute' | 'unmute' | 'join' | 'leave';
}

export interface VoiceChatState {
  isConnected: boolean;
  participants: VoiceParticipant[];
  currentUser?: VoiceParticipant;
  isRecording: boolean;
  isMuted: boolean;
  error?: string;
}

export interface ThemeColors {
  name: string;
  emoji: string;
  light: string;  // Class CSS cho ô sáng
  dark: string;   // Class CSS cho ô tối
  background: string; // Background cho container bàn cờ
}

export interface VoiceChatState {
  isConnected: boolean;
  participants: VoiceParticipant[];
  currentUser?: VoiceParticipant;
  isRecording: boolean;
  isMuted: boolean;
  isDeafened: boolean; // ← Thêm dòng này
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'; // ← Thêm dòng này
  error?: string;
}

export const BOARD_THEMES: ThemeColors[] = [
  {
    name: 'Cổ điển',
    emoji: '⚫',
    light: 'bg-green-400',
    dark: 'bg-green-800',
    background: 'bg-gradient-to-br from-green-700 via-green-800 to-green-900',
  },
  {
    name: 'Đại dương',
    emoji: '🌊',
    light: 'bg-blue-400',
    dark: 'bg-blue-800',
    background: 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900',
  },
  {
    name: 'Hoàng hôn',
    emoji: '🌅',
    light: 'bg-orange-400',
    dark: 'bg-orange-800',
    background: 'bg-gradient-to-br from-orange-700 via-red-800 to-orange-900',
  },
  {
    name: 'Rừng xanh',
    emoji: '🌲',
    light: 'bg-emerald-400',
    dark: 'bg-emerald-800',
    background: 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900',
  },
  {
    name: 'Hoàng gia',
    emoji: '👑',
    light: 'bg-purple-400',
    dark: 'bg-purple-800',
    background: 'bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900',
  },
  {
    name: 'Hồng ngọt',
    emoji: '🌸',
    light: 'bg-pink-400',
    dark: 'bg-pink-800',
    background: 'bg-gradient-to-br from-pink-700 via-pink-800 to-pink-900',
  },
  {
    name: 'Bạc hà',
    emoji: '🍃',
    light: 'bg-teal-400',
    dark: 'bg-teal-800',
    background: 'bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900',
  },
  {
    name: 'Oải hương',
    emoji: '💜',
    light: 'bg-indigo-400',
    dark: 'bg-indigo-800',
    background: 'bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900',
  },
  {
    name: 'San hô',
    emoji: '🪸',
    light: 'bg-rose-400',
    dark: 'bg-rose-800',
    background: 'bg-gradient-to-br from-rose-700 via-rose-800 to-rose-900',
  },
  {
    name: 'Bầu trời',
    emoji: '☁️',
    light: 'bg-sky-400',
    dark: 'bg-sky-800',
    background: 'bg-gradient-to-br from-sky-700 via-sky-800 to-sky-900',
  },
  // Thêm các theme màu tối
  {
    name: 'Đêm tối',
    emoji: '🌙',
    light: 'bg-gray-600',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
  },
  {
    name: 'Ma quái',
    emoji: '👻',
    light: 'bg-slate-700',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
  },
  {
    name: 'Lava',
    emoji: '🌋',
    light: 'bg-red-900',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-red-900 via-black to-red-950',
  },
  {
    name: 'Rừng đêm',
    emoji: '🦇',
    light: 'bg-green-900',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-green-900 via-gray-900 to-black',
  },
  {  
    name: 'Biển sâu',
    emoji: '🦈',
    light: 'bg-blue-900',
    dark: 'bg-slate-900',
    background: 'bg-gradient-to-br from-blue-900 via-slate-900 to-black',
  },
  {
    name: 'Không gian',
    emoji: '🚀',
    light: 'bg-indigo-900',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-black',
  },
  {
    name: 'Cầu vồng',
    emoji: '🌈',
    light: 'bg-purple-800',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-purple-800 via-pink-700 to-blue-800',
  },
  {
    name: 'Cầu vồng tối',
    emoji: '🌈',
    light: 'bg-purple-800',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-purple-900 via-gray-900 to-black',
  }
];

// Thêm interface cho coinsAwarded
export interface CoinsAwarded {
  playerId: string;
  amount: number;
  result: 'win' | 'lose' | 'draw';
}

// Player và Game state interfaces - Updated with Voice Chat support
export interface GameState {
  board: (number | null)[][];
  players: Player[];
  currentPlayer: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  scores: { [key: number]: number };
  validMoves: [number, number][];
  timeLeft: number;
  winnerId?: string;
  coinTransactions?: CoinTransaction[]; // Thêm thông tin giao dịch xu
  coinsAwarded?: CoinsAwarded; // Thêm thuộc tính này để fix lỗi
}

export interface Player {
  id: string;
  nickname: string; // nickname lowercase cho backend
  displayName: string; // tên hiển thị với case gốc
  emoji: string;
  color: 'black' | 'white';
  isReady: boolean;
  coins: number; // Luôn có coins
  isAuthenticated: boolean; // Đã đăng nhập với nickname
  isVoiceConnected?: boolean; // NEW: Voice chat connection status
  // Thêm thuộc tính cho quân cờ tùy chỉnh
  pieceEmoji?: {
    black: string;
    white: string;
  };
  stats?: PlayerStats; // Thống kê player
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winRate: number;
}

export interface CoinTransaction {
  playerId: string;
  nickname: string;
  oldCoins: number;
  newCoins: number;
  coinChange: number;
  result: 'win' | 'lose' | 'draw';
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

// Login/Authentication interfaces
export interface LoginRequest {
  nickname: string;
  emoji: string;
  pieceEmoji?: {
    black: string;
    white: string;
  };
}

export interface LoginResponse {
  success: boolean;
  player?: PlayerModel;
  message?: string;
  isNewPlayer?: boolean;
}

export interface PlayerModel {
  id: string;
  nickname: string;
  displayName: string;
  emoji: string;
  coins: number;
  isReady: boolean;
  color?: 'black' | 'white';
  pieceEmoji?: {
    black: string;
    white: string;
  };
  stats?: PlayerStats;
  isAuthenticated: boolean;
  isVoiceConnected?: boolean; // NEW: Voice chat status
  lastPlayed?: string;
  createdAt?: string;
  isNewPlayer?: boolean; // Thêm dòng này
}

// NEW: Voice Chat interfaces
export interface VoiceSettings {
  micVolume: number;
  speakerVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export interface VoiceChatState {
  isConnected: boolean;
  isMicOn: boolean;
  isSpeakerOn: boolean;
  connectedPeers: Set<string>;
  speakingUsers: Set<string>;
  settings: VoiceSettings;
}

// WebRTC signaling message types
export interface VoiceOffer {
  roomId: string;
  offer: RTCSessionDescriptionInit;
  targetPeerId: string;
}

export interface VoiceAnswer {
  roomId: string;
  answer: RTCSessionDescriptionInit;
  targetPeerId: string;
}

export interface VoiceIceCandidate {
  roomId: string;
  candidate: RTCIceCandidateInit;
  targetPeerId: string;
}

export interface VoiceUserJoined {
  peerId: string;
}

export interface VoiceUserLeft {
  peerId: string;
}

export interface UserSpeaking {
  userId: string;
  speaking: boolean;
}

// Danh sách emoji có sẵn cho avatar
export const AVAILABLE_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
  '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
  '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
  '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
  '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
  '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
  '👻', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
];

// Danh sách các cặp emoji cho quân cờ
export const PIECE_EMOJI_OPTIONS = [
  { name: 'Cổ điển', black: '⚫', white: '⚪' },
  { name: 'Đỏ Xanh', black: '🔴', white: '🔵' },
  { name: 'Động vật', black: '🯁', white: '🐑' },
  { name: 'Animal', black: '🐰', white: '🐳' },
  { name: 'Trái cây', black: '🍇', white: '🥥' },
  { name: 'Hoa quả', black: '🍓', white: '🍊' },
  { name: 'Caro', black: '❌', white: '⭕' },
  { name: 'Tan vỡ', black: '💔', white: '🙅' },
  { name: 'Hoa', black: '🌺', white: '🌼' },
  { name: 'Thể thao', black: '⚽', white: '🏀' },
  { name: 'Âm nhạc', black: '🎵', white: '🎶' },
  { name: 'Giàu có', black: '💎', white: '💸' },
  { name: 'Thực phẩm', black: '🍫', white: '🥛' },
  { name: 'Giao thông', black: '🚗', white: '🚕' },
  { name: 'Vũ trụ', black: '🌑', white: '🌕' },
  { name: 'Mặt trăng âm mặt trời', black: '🌜', white: '🌞' },
  { name: 'Thời tiết', black: '🌤️', white: '⛈️' },
  { name: 'Biểu tượng', black: '❤️', white: '💙' },
  { name: 'Hình học', black: '⬛', white: '⬜' },
  { name: 'Ma thuật', black: '🔮', white: '💫' },
];

// Utility functions
export const getCoinChangeForResult = (result: 'win' | 'lose' | 'draw'): number => {
  switch (result) {
    case 'win':
      return 10;
    case 'draw':
      return 5;
    case 'lose':
      return -5;
    default:
      return 0;
  }
};

export const getResultMessage = (result: 'win' | 'lose' | 'draw', coinChange: number): string => {
  const changeText = coinChange >= 0 ? `+${coinChange}` : `${coinChange}`;
  switch (result) {
    case 'win':
      return `🏆 Chúc mừng! Bạn thắng và được ${changeText} xu!`;
    case 'draw':
      return `🤝 Hòa! Bạn được ${changeText} xu!`;
    case 'lose':
      return `😔 Bạn thua và bị trừ ${Math.abs(coinChange)} xu`;
    default:
      return '';
  }
};

// Voice Chat utility functions
export const getDefaultVoiceSettings = (): VoiceSettings => ({
  micVolume: 80,
  speakerVolume: 70,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true
});

export const checkWebRTCSupport = (): boolean => {
  const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  return hasWebRTC && hasGetUserMedia;
};

// Voice Chat error messages
export const VOICE_CHAT_ERRORS = {
  NOT_SUPPORTED: 'Trình duyệt của bạn không hỗ trợ voice chat',
  MIC_PERMISSION_DENIED: 'Không thể truy cập microphone. Vui lòng cấp quyền và thử lại.',
  CONNECTION_FAILED: 'Không thể kết nối voice chat. Vui lòng thử lại.',
  ROOM_NOT_FOUND: 'Phòng không tồn tại',
  NOT_IN_ROOM: 'Bạn không ở trong phòng này',
  PEER_CONNECTION_FAILED: 'Không thể kết nối với người chơi khác'
};

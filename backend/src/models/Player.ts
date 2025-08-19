export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winRate: number;
}

export interface PlayerModel {
  id: string; // Socket ID
  nickname: string;
  displayName: string; // Tên hiển thị với case gốc
  emoji: string;
  coins: number;
  isReady: boolean;
  color?: 'black' | 'white';
  pieceEmoji?: {
    black: string;
    white: string;
  };
  stats?: PlayerStats;
  isAuthenticated: boolean; // Đã đăng nhập với nickname hợp lệ
  lastPlayed?: string;
  createdAt?: string;
  isNewPlayer?: boolean; // Thêm thuộc tính này để khắc phục lỗi
  isVoiceConnected?: boolean; // 👈 THÊM PROPERTY NÀY ĐỂ SỬA LỖI
}

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
  isNewPlayer?: boolean; // Có phải player mới tạo không
}

export interface CoinTransaction {
  playerId: string;
  nickname: string;
  oldCoins: number;
  newCoins: number;
  coinChange: number;
  reason: 'win' | 'lose' | 'draw';
  timestamp: string;
}

// Utility functions
export const calculateWinRate = (stats: { gamesWon: number; gamesPlayed: number }): number => {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
};

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

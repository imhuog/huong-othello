import fs from 'fs';
import path from 'path';

export interface PlayerData {
  nickname: string;
  coins: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  lastPlayed: string;
  createdAt: string;
}

interface DatabaseSchema {
  players: { [nickname: string]: PlayerData };
}

class Database {
  private dbPath: string;
  private data: DatabaseSchema = { players: {} }; // Khởi tạo với giá trị mặc định

  constructor() {
    // Đường dẫn tới file database JSON
    this.dbPath = path.join(process.cwd(), 'data', 'players.json');
    this.ensureDirectoryExists();
    this.loadData();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileContent);
      } else {
        this.data = { players: {} };
        this.saveData();
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.data = { players: {} };
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // Lấy thông tin player theo nickname
  getPlayer(nickname: string): PlayerData | null {
    const normalizedNickname = nickname.toLowerCase().trim();
    return this.data.players[normalizedNickname] || null;
  }

  // Tạo player mới hoặc lấy player existing
  getOrCreatePlayer(nickname: string): PlayerData {
    const normalizedNickname = nickname.toLowerCase().trim();
    
    if (this.data.players[normalizedNickname]) {
      // Update last played time
      this.data.players[normalizedNickname].lastPlayed = new Date().toISOString();
      this.saveData();
      return this.data.players[normalizedNickname];
    }

    // Tạo player mới với 100 xu ban đầu
    const newPlayer: PlayerData = {
      nickname: nickname.trim(), // Giữ nguyên case gốc cho display
      coins: 100, // Bắt đầu với 100 xu
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDraw: 0,
      lastPlayed: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.data.players[normalizedNickname] = newPlayer;
    this.saveData();
    console.log(`Created new player: ${nickname} with 100 coins`);
    
    return newPlayer;
  }

  // Cập nhật xu cho player
  updatePlayerCoins(nickname: string, coinChange: number, gameResult: 'win' | 'lose' | 'draw'): PlayerData {
    const normalizedNickname = nickname.toLowerCase().trim();
    const player = this.getOrCreatePlayer(nickname);
    
    // Cập nhật xu
    player.coins = Math.max(0, player.coins + coinChange); // Không cho xu âm
    
    // Cập nhật stats
    player.gamesPlayed++;
    switch (gameResult) {
      case 'win':
        player.gamesWon++;
        break;
      case 'lose':
        player.gamesLost++;
        break;
      case 'draw':
        player.gamesDraw++;
        break;
    }
    
    player.lastPlayed = new Date().toISOString();
    
    this.data.players[normalizedNickname] = player;
    this.saveData();
    
    console.log(`Updated player ${nickname}: coins=${player.coins} (${coinChange >= 0 ? '+' : ''}${coinChange}), result=${gameResult}`);
    
    return player;
  }

  // Lấy top players by coins
  getTopPlayers(limit: number = 10): PlayerData[] {
    return Object.values(this.data.players)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, limit);
  }

  // Lấy tổng số players
  getPlayerCount(): number {
    return Object.keys(this.data.players).length;
  }

  // Kiểm tra nickname có tồn tại không
  nicknameExists(nickname: string): boolean {
    const normalizedNickname = nickname.toLowerCase().trim();
    return !!this.data.players[normalizedNickname];
  }
}

// Export singleton instance
export const database = new Database();

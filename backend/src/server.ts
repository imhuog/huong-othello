// Update GameState interface to include coinsAwarded
interface GameState {
  board: (number | null)[][];
  currentPlayer: 1 | 2;
  players: Player[];
  gameStatus: 'waiting' | 'playing' | 'finished';
  scores: { 1: number; 2: number };
  validMoves: number[][];
  timeLeft: number;
  winnerId?: string;
  lastMove?: { row: number; col: number; playerId: string };
  coinTransactions?: { playerId: string; nickname: string; oldCoins: number; newCoins: number; coinChange: number; result: string }[];
  coinsAwarded?: { playerId: string; amount: number; result: 'win' | 'lose' | 'draw' }; // Add this line
}

// Update awardCoinsToPlayers function to set coinsAwarded
function awardCoinsToPlayers(room: Room): void {
  if (room.gameState.gameStatus !== 'finished') return;
  
  const scores = room.gameState.scores;
  const player1 = room.gameState.players[0];
  const player2 = room.gameState.players[1];
  
  let player1Result: 'win' | 'lose' | 'draw';
  let player2Result: 'win' | 'lose' | 'draw';
  
  // Determine results
  if (scores[1] > scores[2]) {
    player1Result = 'win';
    player2Result = 'lose';
  } else if (scores[2] > scores[1]) {
    player1Result = 'lose';
    player2Result = 'win';
  } else {
    player1Result = 'draw';
    player2Result = 'draw';
  }
  
  const coinTransactions: any[] = [];
  
  // Update player 1 (chỉ nếu là human player và authenticated)
  if (player1 && player1.id !== 'AI' && player1.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player1Result);
    const updatedPlayerData = database.updatePlayerCoins(player1.displayName, coinChange, player1Result);
    
    // Update player coins in room
    player1.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player1.id,
      nickname: player1.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player1Result
    });
    
    // Set coinsAwarded for the player who won (or got coins from draw)
    if (coinChange > 0) {
      room.gameState.coinsAwarded = {
        playerId: player1.id,
        amount: coinChange,
        result: player1Result
      };
    }
    
    console.log(`Player ${player1.displayName} ${player1Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  // Update player 2 (chỉ nếu là human player và authenticated)
  if (player2 && player2.id !== 'AI' && player2.isAuthenticated) {
    const coinChange = getCoinChangeForResult(player2Result);
    const updatedPlayerData = database.updatePlayerCoins(player2.displayName, coinChange, player2Result);
    
    // Update player coins in room
    player2.coins = updatedPlayerData.coins;
    
    coinTransactions.push({
      playerId: player2.id,
      nickname: player2.displayName,
      oldCoins: updatedPlayerData.coins - coinChange,
      newCoins: updatedPlayerData.coins,
      coinChange: coinChange,
      result: player2Result
    });
    
    // Set coinsAwarded for the player who won (or got more coins from draw)
    // If both players get coins (draw), prioritize the one with higher amount or player2
    if (coinChange > 0 && (!room.gameState.coinsAwarded || coinChange >= room.gameState.coinsAwarded.amount)) {
      room.gameState.coinsAwarded = {
        playerId: player2.id,
        amount: coinChange,
        result: player2Result
      };
    }
    
    console.log(`Player ${player2.displayName} ${player2Result}: ${coinChange >= 0 ? '+' : ''}${coinChange} coins. Total: ${updatedPlayerData.coins}`);
  }
  
  // Set coin transactions info
  room.gameState.coinTransactions = coinTransactions;
}

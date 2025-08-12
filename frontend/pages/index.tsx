import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import MainMenu from '../components/MainMenu';
import LoginForm from '../components/LoginForm';
import GamePage from './game';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  const { gameState } = useGame();
  const { isAuthenticated, isConnected, loginPlayer, isLoggingIn } = useSocket();

  // Show loading if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-6xl mb-4">⚫⚪</div>
          <div className="text-xl mb-4">Đang kết nối...</div>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show game page if there's an active game and user is authenticated
  if (gameState && isAuthenticated) {
    return <GamePage />;
  }

  // Show main menu if authenticated but no active game
  if (isAuthenticated) {
    return <MainMenu />;
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <LoginForm onLogin={loginPlayer} />
    </div>
  );
};


export default HomePage;

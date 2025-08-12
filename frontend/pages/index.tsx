import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import MainMenu from '../components/MainMenu';
import LoginForm from '../components/LoginForm';
import GamePage from './game';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  const { gameState } = useGame();
  const { isAuthenticated, isConnected, loginPlayer, isLoggingIn, connectionError } = useSocket();

  // Show connection error if there's an issue
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center text-white bg-red-500/20 border border-red-500/50 rounded-2xl p-8 max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-4">Lỗi kết nối</h2>
          <p className="text-red-200 mb-4">{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Thử lại
          </button>
        </motion.div>
      </div>
    );
  }

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
          <p className="text-gray-300 text-sm mt-4">
            Đang thiết lập kết nối với server...
          </p>
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
      <LoginForm onLogin={loginPlayer} isLoading={isLoggingIn} />
    </div>
  );
};

export default HomePage;

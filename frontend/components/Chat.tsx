import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';

const Chat: React.FC = () => {
  const { messages, sendMessage, isAIGame } = useGame();
  const { socket } = useSocket();
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  // Don't show chat in AI games
  if (isAIGame) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      className={`
        fixed bottom-4 right-4 bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700
        ${isExpanded ? 'w-80 h-96' : 'w-16 h-16'}
        transition-all duration-300 z-30
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {!isExpanded ? (
        // Collapsed state - chat icon
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full h-full flex items-center justify-center hover:bg-gray-700 rounded-xl transition-colors relative"
        >
          <span className="text-2xl">💬</span>
          {messages.length > 0 && (
            <motion.div
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              {messages.length > 9 ? '9+' : messages.length}
            </motion.div>
          )}
        </button>
      ) : (
        // Expanded state - chat interface
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-lg">💬</span>
              <span className="text-white font-semibold">Chat</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence>
              {messages.map((message) => {
                const isMyMessage = message.playerId === socket?.id;
                
                return (
                  <motion.div
                    key={message.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`
                        max-w-[70%] p-2 rounded-lg text-sm
                        ${isMyMessage
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-700 text-gray-100 rounded-bl-none'
                        }
                      `}
                    >
                      {!isMyMessage && (
                        <div className="text-xs text-gray-300 mb-1 font-semibold break-words">
                          {message.playerName}
                        </div>
                      )}
                      <div className="break-words">{message.message}</div>
                      <div className={`
                        text-xs mt-1 text-right
                        ${isMyMessage ? 'text-blue-200' : 'text-gray-400'}
                      `}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                <div className="text-2xl mb-2">💬</div>
                <div>Chưa có tin nhắn nào</div>
                <div className="text-xs mt-1">Hãy bắt đầu trò chuyện!</div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 break-words"
                maxLength={200}
              />
              <motion.button
                type="submit"
                disabled={!newMessage.trim()}
                className={`
                  px-3 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${newMessage.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }
                `}
                whileHover={newMessage.trim() ? { scale: 1.05 } : {}}
                whileTap={newMessage.trim() ? { scale: 0.95 } : {}}
              >
                📤
              </motion.button>
            </div>
            
            <div className="text-xs text-gray-400 mt-1 text-right">
              {newMessage.length}/200
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default Chat;
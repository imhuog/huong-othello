import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { LoginRequest, LoginResponse, PlayerModel } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  // Player authentication
  currentPlayer: PlayerModel | null;
  isAuthenticated: boolean;
  loginPlayer: (loginData: LoginRequest) => void;
  logoutPlayer: () => void;
  isLoggingIn: boolean;
  // Function to refresh player data from database
  refreshPlayerData: (nickname: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerModel | null>(null);
  const [isAuthenticated, setIs

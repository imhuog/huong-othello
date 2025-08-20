import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from '../contexts/SocketContext';
import { GameProvider } from '../contexts/GameContext';
import { VoiceProvider } from '../contexts/VoiceContext'; // NEW: Import VoiceProvider
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SocketProvider>
      <GameProvider>
        <VoiceProvider> {/* NEW: Wrap with VoiceProvider */}
          <Component {...pageProps} />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1f2937',
                color: '#f3f4f6',
                border: '1px solid #374151',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
                style: {
                  border: '1px solid #10b981',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
                style: {
                  border: '1px solid #ef4444',
                },
              },
            }}
          />
        </VoiceProvider>
      </GameProvider>
    </SocketProvider>
  );
}

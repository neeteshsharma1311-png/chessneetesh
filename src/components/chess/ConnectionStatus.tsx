import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  isSearching?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isSearching = false,
  className 
}) => {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isConnected 
          ? "bg-green-500/10 text-green-500 border border-green-500/20"
          : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
          </motion.div>
        ) : isConnected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            <Wifi className="w-3 h-3" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WifiOff className="w-3 h-3" />
          </motion.div>
        )}
      </AnimatePresence>
      <span>
        {isSearching 
          ? 'Searching...' 
          : isConnected 
            ? 'Connected' 
            : 'Connecting...'}
      </span>
    </motion.div>
  );
};

export default ConnectionStatus;

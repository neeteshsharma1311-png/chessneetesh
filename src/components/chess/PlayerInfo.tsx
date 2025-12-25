import React from 'react';
import { motion } from 'framer-motion';

interface PlayerInfoProps {
  name: string;
  color: 'w' | 'b';
  isActive: boolean;
  timeRemaining: number;
  showTimer: boolean;
  capturedPieces?: string[];
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  name,
  color,
  isActive,
  timeRemaining,
  showTimer,
  capturedPieces = [],
}) => {
  const isLowTime = timeRemaining < 60 && timeRemaining > 0;

  return (
    <motion.div
      className={`glass-card p-4 flex items-center justify-between ${
        isActive ? 'ring-2 ring-primary' : ''
      }`}
      animate={isActive ? { scale: 1.02 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3">
        {/* Color indicator */}
        <div
          className={`w-4 h-4 rounded-full ${
            color === 'w' ? 'bg-chess-piece-white' : 'bg-chess-piece-black'
          } shadow-md`}
          style={{
            boxShadow: isActive ? '0 0 10px hsl(var(--primary))' : 'none',
          }}
        />
        
        {/* Player name */}
        <div>
          <p className={`font-display font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
            {name}
          </p>
          {isActive && (
            <motion.p
              className="text-xs text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Your turn
            </motion.p>
          )}
        </div>
      </div>

      {/* Timer */}
      {showTimer && (
        <motion.div
          className={`font-mono text-2xl font-bold px-4 py-2 rounded-lg ${
            isLowTime ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-foreground'
          }`}
          animate={isLowTime && isActive ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {formatTime(timeRemaining)}
        </motion.div>
      )}
    </motion.div>
  );
};

export default PlayerInfo;

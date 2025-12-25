import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameResult as GameResultType, PieceColor } from '@/types/chess';
import { Trophy, Handshake, Clock, Flag, RotateCcw, Home } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResultType | null;
  onRestart: () => void;
  onNewGame: () => void;
}

const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  result,
  onRestart,
  onNewGame,
}) => {
  if (!result) return null;

  const getIcon = () => {
    switch (result.reason) {
      case 'checkmate':
        return <Trophy className="w-16 h-16 text-primary" />;
      case 'stalemate':
      case 'draw':
        return <Handshake className="w-16 h-16 text-muted-foreground" />;
      case 'timeout':
        return <Clock className="w-16 h-16 text-destructive" />;
      case 'resignation':
        return <Flag className="w-16 h-16 text-destructive" />;
    }
  };

  const getMessage = () => {
    switch (result.reason) {
      case 'checkmate':
        return `${result.winner} wins by checkmate!`;
      case 'stalemate':
        return 'Game ended in stalemate!';
      case 'draw':
        return 'Game ended in a draw!';
      case 'timeout':
        return `${result.winner} wins on time!`;
      case 'resignation':
        return `${result.winner} wins by resignation!`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="glass-card p-8 max-w-sm w-full text-center relative z-10"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Icon */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              {getIcon()}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="font-display text-2xl md:text-3xl font-bold mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {result.winner ? 'Victory!' : 'Game Over!'}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="text-lg text-muted-foreground mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {getMessage()}
            </motion.p>

            {/* Stats */}
            <motion.div
              className="bg-secondary/50 rounded-lg p-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-muted-foreground">
                Total Moves: <span className="font-bold text-foreground">{result.moveCount}</span>
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onRestart}
                className="flex-1 glow-button"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rematch
              </Button>
              <Button
                onClick={onNewGame}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                New Game
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameResultModal;

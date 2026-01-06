import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameResult as GameResultType, PieceColor, Move } from '@/types/chess';
import { Trophy, Handshake, Clock, Flag, RotateCcw, Home } from 'lucide-react';
import MoveAnalysis from './MoveAnalysis';

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResultType | null;
  onRestart: () => void;
  onNewGame: () => void;
  isOnlineGame?: boolean;
  moves?: Move[];
  whitePlayerName?: string;
  blackPlayerName?: string;
}

const GameResultModal = forwardRef<HTMLDivElement, GameResultModalProps>(({
  isOpen,
  result,
  onRestart,
  onNewGame,
  isOnlineGame = false,
  moves = [],
  whitePlayerName = 'White',
  blackPlayerName = 'Black',
}, ref) => {
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
            className="glass-card p-6 max-w-lg w-full relative z-10 max-h-[90vh] overflow-hidden flex flex-col"
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
              className="font-display text-2xl md:text-3xl font-bold mb-2 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {result.winner ? 'Victory!' : 'Game Over!'}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="text-lg text-muted-foreground mb-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {getMessage()}
            </motion.p>

            {/* Stats */}
            <motion.div
              className="bg-secondary/50 rounded-lg p-4 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-muted-foreground text-center">
                Total Moves: <span className="font-bold text-foreground">{result.moveCount}</span>
              </p>
            </motion.div>

            {/* Move Analysis */}
            {moves.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex-1 overflow-hidden mb-4"
              >
                <ScrollArea className="h-full max-h-48">
                  <MoveAnalysis 
                    moves={moves} 
                    whitePlayerName={whitePlayerName}
                    blackPlayerName={blackPlayerName}
                  />
                </ScrollArea>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={onRestart}
                className="flex-1 glow-button"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isOnlineGame ? 'Rematch' : 'Play Again'}
              </Button>
              <Button
                onClick={onNewGame}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                {isOnlineGame ? 'Leave' : 'New Game'}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

GameResultModal.displayName = 'GameResultModal';

export default GameResultModal;

import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GameResult as GameResultType, PieceColor, Move } from '@/types/chess';
import { Trophy, Handshake, Clock, Flag, RotateCcw, Home, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import MoveAnalysis from './MoveAnalysis';
import GameAnalysis from './GameAnalysis';

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResultType | null;
  onRestart: () => void;
  onNewGame: () => void;
  isOnlineGame?: boolean;
  moves?: Move[];
  whitePlayerName?: string;
  blackPlayerName?: string;
  currentPlayerColor?: 'w' | 'b' | null;
  winnerId?: string | null;
  currentPlayerId?: string | null;
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
  currentPlayerColor,
  winnerId,
  currentPlayerId,
}, ref) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  if (!result) return null;

  const RATING_CHANGE = 16;

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

  // Calculate rating change for current player
  const getRatingChange = () => {
    if (!isOnlineGame) return null;
    
    const isDraw = !winnerId;
    if (isDraw) {
      return { value: 0, type: 'draw' as const };
    }
    
    const didWin = winnerId === currentPlayerId;
    return {
      value: didWin ? RATING_CHANGE : -RATING_CHANGE,
      type: didWin ? 'win' as const : 'loss' as const,
    };
  };

  const ratingChange = getRatingChange();

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

            {/* Rating Change for Online Games */}
            {isOnlineGame && ratingChange && (
              <motion.div
                className="flex justify-center mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
              >
                <Badge 
                  variant="outline" 
                  className={`text-lg px-4 py-2 gap-2 ${
                    ratingChange.type === 'win' 
                      ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                      : ratingChange.type === 'loss'
                      ? 'bg-red-500/20 text-red-500 border-red-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {ratingChange.type === 'win' && <TrendingUp className="w-5 h-5" />}
                  {ratingChange.type === 'loss' && <TrendingDown className="w-5 h-5" />}
                  {ratingChange.type === 'draw' && <Minus className="w-5 h-5" />}
                  <span className="font-bold">
                    {ratingChange.value > 0 ? '+' : ''}{ratingChange.value} Rating
                  </span>
                </Badge>
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              className="bg-secondary/50 rounded-lg p-4 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Moves</p>
                  <p className="font-bold text-lg">{result.moveCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">White</p>
                  <p className="font-medium text-sm truncate max-w-24">{whitePlayerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Black</p>
                  <p className="font-medium text-sm truncate max-w-24">{blackPlayerName}</p>
                </div>
              </div>
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
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {/* Analyze Game Button */}
              {moves.length > 0 && (
                <Button
                  onClick={() => setShowAnalysis(true)}
                  variant="secondary"
                  className="w-full gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analyze Game
                </Button>
              )}
              
              <div className="flex gap-3">
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
              </div>
            </motion.div>
          </motion.div>
          
          {/* Game Analysis Modal */}
          <AnimatePresence>
            {showAnalysis && (
              <GameAnalysis
                moves={moves}
                whitePlayerName={whitePlayerName}
                blackPlayerName={blackPlayerName}
                onClose={() => setShowAnalysis(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

GameResultModal.displayName = 'GameResultModal';

export default GameResultModal;
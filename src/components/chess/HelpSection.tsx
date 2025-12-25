import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const HelpSection: React.FC = () => {
  const pieces = [
    {
      name: 'King',
      symbol: '♔',
      description: 'Moves one square in any direction. The most important piece - if checkmated, you lose!',
    },
    {
      name: 'Queen',
      symbol: '♕',
      description: 'Moves any number of squares horizontally, vertically, or diagonally. The most powerful piece.',
    },
    {
      name: 'Rook',
      symbol: '♖',
      description: 'Moves any number of squares horizontally or vertically. Great for controlling files and ranks.',
    },
    {
      name: 'Bishop',
      symbol: '♗',
      description: 'Moves any number of squares diagonally. Each bishop stays on its starting color.',
    },
    {
      name: 'Knight',
      symbol: '♘',
      description: 'Moves in an L-shape: 2 squares in one direction and 1 square perpendicular. Can jump over other pieces.',
    },
    {
      name: 'Pawn',
      symbol: '♙',
      description: 'Moves forward one square (or two from starting position). Captures diagonally. Can be promoted to any piece upon reaching the opposite end.',
    },
  ];

  const specialRules = [
    {
      name: 'Castling',
      description: 'A special move where the king moves two squares towards a rook, and the rook moves to the other side of the king. Can only be done if neither piece has moved and there are no pieces between them.',
    },
    {
      name: 'En Passant',
      description: 'A special pawn capture that can occur immediately after a pawn moves two squares forward from its starting position, passing an enemy pawn that could have captured it had it moved only one square.',
    },
    {
      name: 'Pawn Promotion',
      description: 'When a pawn reaches the opposite end of the board, it must be promoted to a queen, rook, bishop, or knight (usually queen).',
    },
    {
      name: 'Check',
      description: 'When a king is under attack. The player must move out of check, block the attack, or capture the attacking piece.',
    },
    {
      name: 'Checkmate',
      description: 'When a king is in check and there is no legal move to escape. The game ends and the checkmated player loses.',
    },
    {
      name: 'Stalemate',
      description: 'When a player has no legal moves but is not in check. The game ends in a draw.',
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient">
            How to Play Chess
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-8">
            {/* Chess Pieces */}
            <section>
              <h3 className="font-display text-lg font-semibold mb-4 text-primary">
                Chess Pieces
              </h3>
              <div className="grid gap-4">
                {pieces.map((piece, index) => (
                  <motion.div
                    key={piece.name}
                    className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="text-4xl">{piece.symbol}</span>
                    <div>
                      <h4 className="font-semibold text-foreground">{piece.name}</h4>
                      <p className="text-sm text-muted-foreground">{piece.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Special Rules */}
            <section>
              <h3 className="font-display text-lg font-semibold mb-4 text-primary">
                Special Rules
              </h3>
              <div className="space-y-3">
                {specialRules.map((rule, index) => (
                  <motion.div
                    key={rule.name}
                    className="p-4 rounded-lg bg-secondary/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <h4 className="font-semibold text-foreground mb-1">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Playing vs AI */}
            <section>
              <h3 className="font-display text-lg font-semibold mb-4 text-primary">
                Playing vs Computer
              </h3>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-3">
                  When playing against the AI, you always play as White (moving first). 
                  The AI has three difficulty levels:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <strong>Easy:</strong> Makes random legal moves
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <strong>Medium:</strong> Prioritizes captures but still somewhat random
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <strong>Hard:</strong> Evaluates positions, prefers checks and center control
                  </li>
                </ul>
              </div>
            </section>

            {/* Controls */}
            <section>
              <h3 className="font-display text-lg font-semibold mb-4 text-primary">
                Controls
              </h3>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Desktop:</strong>
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                  <li>• Click a piece to select it</li>
                  <li>• Click a highlighted square to move</li>
                  <li>• Press <kbd className="px-1 py-0.5 rounded bg-muted">U</kbd> to undo</li>
                  <li>• Press <kbd className="px-1 py-0.5 rounded bg-muted">R</kbd> to restart</li>
                  <li>• Press <kbd className="px-1 py-0.5 rounded bg-muted">M</kbd> to toggle sound</li>
                </ul>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Mobile:</strong>
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Tap a piece to select it</li>
                  <li>• Tap a highlighted square to move</li>
                  <li>• Use on-screen buttons for controls</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HelpSection;

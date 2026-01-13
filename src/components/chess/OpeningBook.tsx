import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, TrendingUp, Info } from 'lucide-react';

// Common chess openings database
const OPENINGS = [
  // King's Pawn Openings
  { moves: ['e2e4'], name: "King's Pawn Opening", eco: "B00" },
  { moves: ['e2e4', 'e7e5'], name: "Open Game", eco: "C20" },
  { moves: ['e2e4', 'e7e5', 'g1f3'], name: "King's Knight Opening", eco: "C40" },
  { moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'], name: "Four Knights Game", eco: "C47" },
  { moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'], name: "Ruy Lopez (Spanish)", eco: "C60" },
  { moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'], name: "Italian Game", eco: "C50" },
  { moves: ['e2e4', 'e7e5', 'g1f3', 'd2d4'], name: "Scotch Game", eco: "C45" },
  { moves: ['e2e4', 'e7e5', 'g1f3', 'g8f6'], name: "Petrov Defense", eco: "C42" },
  { moves: ['e2e4', 'e7e5', 'f1c4'], name: "Bishop's Opening", eco: "C23" },
  { moves: ['e2e4', 'e7e5', 'f2f4'], name: "King's Gambit", eco: "C30" },
  
  // Sicilian Defense
  { moves: ['e2e4', 'c7c5'], name: "Sicilian Defense", eco: "B20" },
  { moves: ['e2e4', 'c7c5', 'g1f3'], name: "Open Sicilian", eco: "B30" },
  { moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6'], name: "Sicilian Najdorf", eco: "B90" },
  { moves: ['e2e4', 'c7c5', 'g1f3', 'b8c6'], name: "Sicilian Classical", eco: "B56" },
  { moves: ['e2e4', 'c7c5', 'g1f3', 'e7e6'], name: "Sicilian Paulsen", eco: "B41" },
  { moves: ['e2e4', 'c7c5', 'c2c3'], name: "Sicilian Alapin", eco: "B22" },
  { moves: ['e2e4', 'c7c5', 'b1c3'], name: "Closed Sicilian", eco: "B23" },
  
  // French Defense
  { moves: ['e2e4', 'e7e6'], name: "French Defense", eco: "C00" },
  { moves: ['e2e4', 'e7e6', 'd2d4'], name: "French Defense", eco: "C00" },
  { moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5'], name: "French Defense: Main Line", eco: "C01" },
  { moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3'], name: "French Winawer", eco: "C15" },
  { moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1d2'], name: "French Tarrasch", eco: "C03" },
  
  // Caro-Kann Defense
  { moves: ['e2e4', 'c7c6'], name: "Caro-Kann Defense", eco: "B10" },
  { moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5'], name: "Caro-Kann: Main Line", eco: "B12" },
  
  // Queen's Pawn Openings
  { moves: ['d2d4'], name: "Queen's Pawn Opening", eco: "A40" },
  { moves: ['d2d4', 'd7d5'], name: "Closed Game", eco: "D00" },
  { moves: ['d2d4', 'd7d5', 'c2c4'], name: "Queen's Gambit", eco: "D06" },
  { moves: ['d2d4', 'd7d5', 'c2c4', 'd5c4'], name: "Queen's Gambit Accepted", eco: "D20" },
  { moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6'], name: "Queen's Gambit Declined", eco: "D30" },
  { moves: ['d2d4', 'd7d5', 'c2c4', 'c7c6'], name: "Slav Defense", eco: "D10" },
  
  // Indian Defenses
  { moves: ['d2d4', 'g8f6'], name: "Indian Defense", eco: "A45" },
  { moves: ['d2d4', 'g8f6', 'c2c4'], name: "Indian Game", eco: "A46" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6'], name: "King's Indian Defense", eco: "E60" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6'], name: "Nimzo-Indian/Queen's Indian", eco: "E00" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4'], name: "Nimzo-Indian Defense", eco: "E20" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'b7b6'], name: "Queen's Indian Defense", eco: "E12" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'c7c5'], name: "Benoni Defense", eco: "A56" },
  { moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'd7d5'], name: "Grünfeld Defense", eco: "D80" },
  
  // English Opening
  { moves: ['c2c4'], name: "English Opening", eco: "A10" },
  { moves: ['c2c4', 'e7e5'], name: "English: Reversed Sicilian", eco: "A20" },
  { moves: ['c2c4', 'g8f6'], name: "English: Anglo-Indian", eco: "A15" },
  
  // Other Openings
  { moves: ['g1f3'], name: "Réti Opening", eco: "A04" },
  { moves: ['g2g3'], name: "King's Fianchetto Opening", eco: "A00" },
  { moves: ['b2b3'], name: "Larsen's Opening", eco: "A01" },
  { moves: ['f2f4'], name: "Bird's Opening", eco: "A02" },
  
  // Scandinavian
  { moves: ['e2e4', 'd7d5'], name: "Scandinavian Defense", eco: "B01" },
  
  // Pirc/Modern
  { moves: ['e2e4', 'd7d6'], name: "Pirc Defense", eco: "B07" },
  { moves: ['e2e4', 'g7g6'], name: "Modern Defense", eco: "B06" },
  
  // Alekhine
  { moves: ['e2e4', 'g8f6'], name: "Alekhine's Defense", eco: "B02" },
];

interface OpeningBookProps {
  moveHistory: { from: string; to: string }[];
  isVisible?: boolean;
}

const OpeningBook: React.FC<OpeningBookProps> = ({ moveHistory, isVisible = true }) => {
  const currentOpening = useMemo(() => {
    if (moveHistory.length === 0) return null;
    
    // Convert move history to simple format
    const moves = moveHistory.map(m => `${m.from}${m.to}`);
    
    // Find the longest matching opening
    let bestMatch: typeof OPENINGS[0] | null = null;
    
    for (const opening of OPENINGS) {
      const matchLength = opening.moves.length;
      if (matchLength <= moves.length) {
        const isMatch = opening.moves.every((move, i) => moves[i] === move);
        if (isMatch && (!bestMatch || opening.moves.length > bestMatch.moves.length)) {
          bestMatch = opening;
        }
      }
    }
    
    return bestMatch;
  }, [moveHistory]);

  const possibleContinuations = useMemo(() => {
    const moves = moveHistory.map(m => `${m.from}${m.to}`);
    
    // Find openings that could follow from current position
    return OPENINGS.filter(opening => {
      if (opening.moves.length <= moves.length) return false;
      if (opening.moves.length > moves.length + 3) return false; // Limit lookahead
      
      // Check if current moves match the start of this opening
      return moves.every((move, i) => opening.moves[i] === move);
    }).slice(0, 3);
  }, [moveHistory]);

  if (!isVisible || moveHistory.length > 15) return null; // Hide after opening phase

  return (
    <AnimatePresence>
      {(currentOpening || possibleContinuations.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Book className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Opening Book</span>
              </div>
              
              {currentOpening && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {currentOpening.eco}
                    </Badge>
                    <span className="font-semibold text-sm">{currentOpening.name}</span>
                  </div>
                </div>
              )}
              
              {possibleContinuations.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Possible continuations:</span>
                  </div>
                  {possibleContinuations.map((cont, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono text-[10px] px-1">
                        {cont.eco}
                      </Badge>
                      <span className="text-muted-foreground">{cont.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OpeningBook;

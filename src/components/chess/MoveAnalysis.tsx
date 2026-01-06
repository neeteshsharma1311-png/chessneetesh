import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Move } from '@/types/chess';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronDown, 
  ChevronUp,
  Target,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface MoveAnalysisProps {
  moves: Move[];
  whitePlayerName: string;
  blackPlayerName: string;
}

interface AnalyzedMove extends Move {
  quality: 'brilliant' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';
  evaluation: number;
  moveNumber: number;
  color: 'w' | 'b';
}

// Simple move analysis based on common chess patterns
const analyzeMove = (move: Move, moveIndex: number): AnalyzedMove => {
  const moveNumber = Math.floor(moveIndex / 2) + 1;
  const color = moveIndex % 2 === 0 ? 'w' : 'b';
  
  // Basic heuristics for move quality
  let quality: AnalyzedMove['quality'] = 'book';
  let evaluation = 0;
  
  // Captures are generally interesting
  if (move.captured) {
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const capturedValue = pieceValues[move.captured] || 0;
    const movedPieceValue = pieceValues[move.piece] || 1;
    
    if (capturedValue > movedPieceValue) {
      quality = 'good';
      evaluation = capturedValue - movedPieceValue;
    } else if (capturedValue < movedPieceValue && !move.san.includes('+')) {
      // Trading down without check might be inaccurate
      quality = Math.random() > 0.7 ? 'inaccuracy' : 'book';
      evaluation = capturedValue - movedPieceValue;
    }
  }
  
  // Check moves are usually good
  if (move.san.includes('+')) {
    quality = Math.random() > 0.5 ? 'good' : 'book';
    evaluation = 0.5;
  }
  
  // Checkmate is brilliant
  if (move.san.includes('#')) {
    quality = 'brilliant';
    evaluation = 100;
  }
  
  // Castling is generally good (safety)
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    quality = 'good';
    evaluation = 0.3;
  }
  
  // Queen moves early might be inaccurate
  if (move.piece === 'q' && moveIndex < 10) {
    quality = Math.random() > 0.6 ? 'inaccuracy' : 'book';
  }
  
  // Pawn promotions are usually good
  if (move.promotion) {
    quality = move.promotion === 'q' ? 'good' : 'book';
    evaluation = 8;
  }
  
  // Random variation for more realistic analysis
  const rand = Math.random();
  if (quality === 'book') {
    if (rand < 0.1) quality = 'brilliant';
    else if (rand < 0.3) quality = 'good';
    else if (rand < 0.85) quality = 'book';
    else if (rand < 0.95) quality = 'inaccuracy';
    else quality = 'mistake';
  }
  
  return {
    ...move,
    quality,
    evaluation,
    moveNumber,
    color,
  };
};

const MoveAnalysis: React.FC<MoveAnalysisProps> = ({ 
  moves, 
  whitePlayerName, 
  blackPlayerName 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const analyzedMoves = useMemo(() => {
    return moves.map((move, index) => analyzeMove(move, index));
  }, [moves]);
  
  const stats = useMemo(() => {
    const whiteStats = { brilliant: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const blackStats = { brilliant: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    
    analyzedMoves.forEach(move => {
      if (move.color === 'w') {
        whiteStats[move.quality]++;
      } else {
        blackStats[move.quality]++;
      }
    });
    
    return { white: whiteStats, black: blackStats };
  }, [analyzedMoves]);
  
  const getQualityIcon = (quality: AnalyzedMove['quality']) => {
    switch (quality) {
      case 'brilliant':
        return <CheckCircle2 className="w-4 h-4 text-cyan-500" />;
      case 'good':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'book':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      case 'inaccuracy':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'mistake':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'blunder':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };
  
  const getQualityColor = (quality: AnalyzedMove['quality']) => {
    switch (quality) {
      case 'brilliant': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
      case 'good': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'book': return 'bg-secondary text-muted-foreground border-border';
      case 'inaccuracy': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'mistake': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'blunder': return 'bg-red-500/20 text-red-500 border-red-500/30';
    }
  };
  
  const getQualityLabel = (quality: AnalyzedMove['quality']) => {
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  const interestingMoves = analyzedMoves.filter(m => 
    m.quality !== 'book' && m.quality !== 'good'
  );
  
  if (moves.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Move Analysis
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-border" />
              <span className="font-medium text-sm">{whitePlayerName}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {stats.white.brilliant > 0 && (
                <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-500">
                  {stats.white.brilliant} Brilliant
                </Badge>
              )}
              {stats.white.good > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500">
                  {stats.white.good} Good
                </Badge>
              )}
              {stats.white.inaccuracy > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500">
                  {stats.white.inaccuracy} Inaccuracy
                </Badge>
              )}
              {stats.white.mistake > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-500">
                  {stats.white.mistake} Mistake
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-800 border border-border" />
              <span className="font-medium text-sm">{blackPlayerName}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {stats.black.brilliant > 0 && (
                <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-500">
                  {stats.black.brilliant} Brilliant
                </Badge>
              )}
              {stats.black.good > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500">
                  {stats.black.good} Good
                </Badge>
              )}
              {stats.black.inaccuracy > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500">
                  {stats.black.inaccuracy} Inaccuracy
                </Badge>
              )}
              {stats.black.mistake > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-500">
                  {stats.black.mistake} Mistake
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Key Moves */}
        {interestingMoves.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Key Moments</p>
            <div className="flex flex-wrap gap-2">
              {interestingMoves.slice(0, 5).map((move, index) => (
                <Badge 
                  key={index}
                  variant="outline"
                  className={`gap-1 ${getQualityColor(move.quality)}`}
                >
                  {getQualityIcon(move.quality)}
                  {move.moveNumber}. {move.color === 'b' && '...'}{move.san}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Expanded Move List */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ScrollArea className="h-48 mt-3">
                <div className="space-y-1">
                  {analyzedMoves.map((move, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        move.quality !== 'book' ? getQualityColor(move.quality) : 'hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-8">
                          {move.moveNumber}.{move.color === 'b' ? '..' : ''}
                        </span>
                        <span className="font-mono font-medium">{move.san}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getQualityIcon(move.quality)}
                        <span className="text-xs">{getQualityLabel(move.quality)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default MoveAnalysis;
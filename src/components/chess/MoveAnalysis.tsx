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
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface MoveAnalysisProps {
  moves: Move[];
  whitePlayerName: string;
  blackPlayerName: string;
}

interface AnalyzedMove extends Move {
  quality: 'brilliant' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';
  moveNumber: number;
  color: 'w' | 'b';
}

// Deterministic move analysis based on actual chess patterns
const analyzeMove = (move: Move, moveIndex: number, allMoves: Move[]): AnalyzedMove => {
  const moveNumber = Math.floor(moveIndex / 2) + 1;
  const color = moveIndex % 2 === 0 ? 'w' : 'b';
  
  let quality: AnalyzedMove['quality'] = 'book';
  
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  
  // Checkmate is always brilliant
  if (move.san?.includes('#')) {
    quality = 'brilliant';
    return { ...move, quality, moveNumber, color };
  }
  
  // Check if this move delivers check
  const isCheck = move.san?.includes('+') || false;
  
  // Castling is generally good (king safety)
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    quality = 'good';
    return { ...move, quality, moveNumber, color };
  }
  
  // Pawn promotions
  if (move.promotion) {
    // Queen promotion is usually good
    if (move.promotion === 'q') {
      quality = isCheck ? 'brilliant' : 'good';
    } else {
      // Underpromotion might be tactical
      quality = 'book';
    }
    return { ...move, quality, moveNumber, color };
  }
  
  // Captures analysis - this is where good/bad moves are most visible
  if (move.captured) {
    const capturedValue = pieceValues[move.captured] || 0;
    const movingPieceValue = pieceValues[move.piece] || 1;
    
    // Winning material (capturing higher value piece with lower value piece)
    if (capturedValue > movingPieceValue) {
      const valueDiff = capturedValue - movingPieceValue;
      if (valueDiff >= 6) {
        quality = 'brilliant'; // Winning queen with pawn or minor piece
      } else if (valueDiff >= 2) {
        quality = 'good'; // Winning exchange or good trade
      } else {
        quality = 'good'; // Any winning material capture
      }
    } 
    // Equal trade (same value pieces)
    else if (capturedValue === movingPieceValue) {
      quality = 'book'; // Neutral trade
    }
    // Trading down (losing material) - could be a blunder unless tactical
    else {
      const valueLoss = movingPieceValue - capturedValue;
      if (isCheck) {
        // Check might make it tactical
        quality = valueLoss >= 3 ? 'inaccuracy' : 'book';
      } else if (valueLoss >= 6) {
        quality = 'blunder'; // Losing a lot of material
      } else if (valueLoss >= 3) {
        quality = 'mistake'; // Losing significant material
      } else {
        quality = 'inaccuracy'; // Minor material loss
      }
    }
    return { ...move, quality, moveNumber, color };
  }
  
  // Check for piece development patterns
  const piece = move.piece?.toLowerCase();
  const fromSquare = move.from;
  const toSquare = move.to;
  
  // Early queen moves (before move 10) are often inaccurate
  if (piece === 'q' && moveIndex < 10) {
    if (!isCheck) {
      quality = 'inaccuracy';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Knight positioning
  if (piece === 'n' && toSquare) {
    const toFile = toSquare[0];
    const toRank = toSquare[1];
    
    // Knight on rim is dim (edge of board)
    if (toFile === 'a' || toFile === 'h') {
      quality = 'inaccuracy';
      return { ...move, quality, moveNumber, color };
    }
    
    // Knight to center is usually good in opening
    if (moveIndex < 12 && (toFile === 'd' || toFile === 'e') && (toRank === '4' || toRank === '5')) {
      quality = 'good';
      return { ...move, quality, moveNumber, color };
    }
    
    // Developing knights early is good
    if (moveIndex < 8 && (toFile === 'c' || toFile === 'f') && (toRank === '3' || toRank === '6')) {
      quality = 'good';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Bishop development
  if (piece === 'b' && moveIndex < 12) {
    // Developing bishops early is generally good
    const developmentSquares = ['c4', 'f4', 'b5', 'g5', 'c5', 'f5', 'b4', 'g4', 'e2', 'd2', 'e3', 'd3'];
    if (developmentSquares.includes(toSquare)) {
      quality = 'good';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Central pawn moves in opening are good
  if (piece === 'p' && moveIndex < 8 && toSquare) {
    const toFile = toSquare[0];
    const toRank = toSquare[1];
    if ((toFile === 'd' || toFile === 'e') && (toRank === '4' || toRank === '5')) {
      quality = 'good';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Pawn pushes that could be weakening
  if (piece === 'p' && moveIndex > 10 && toSquare) {
    const toFile = toSquare[0];
    // Pushing edge pawns in middlegame can be dubious
    if ((toFile === 'a' || toFile === 'h') && !isCheck) {
      quality = 'inaccuracy';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Check moves are usually good (creates threats)
  if (isCheck) {
    quality = 'good';
    return { ...move, quality, moveNumber, color };
  }
  
  // Rook moves to open files are good
  if (piece === 'r' && toSquare) {
    const toFile = toSquare[0];
    // If rook moves to d or e file (usually open), it's often good
    if (moveIndex > 10 && (toFile === 'd' || toFile === 'e')) {
      quality = 'good';
      return { ...move, quality, moveNumber, color };
    }
  }
  
  // Default: book move (neutral)
  return { ...move, quality, moveNumber, color };
};

const MoveAnalysis: React.FC<MoveAnalysisProps> = ({ 
  moves, 
  whitePlayerName, 
  blackPlayerName 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const analyzedMoves = useMemo(() => {
    return moves.map((move, index) => analyzeMove(move, index, moves));
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
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'good':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
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
      case 'brilliant': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
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
    m.quality === 'brilliant' || m.quality === 'inaccuracy' || m.quality === 'mistake' || m.quality === 'blunder'
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
              <span className="font-medium text-sm truncate">{whitePlayerName}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {stats.white.brilliant > 0 && (
                <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 gap-1">
                  <Sparkles className="w-3 h-3" />
                  {stats.white.brilliant}
                </Badge>
              )}
              {stats.white.good > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500">
                  {stats.white.good} Good
                </Badge>
              )}
              {stats.white.inaccuracy > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500">
                  {stats.white.inaccuracy} ?!
                </Badge>
              )}
              {stats.white.mistake > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-500">
                  {stats.white.mistake} ?
                </Badge>
              )}
              {stats.white.blunder > 0 && (
                <Badge variant="outline" className="text-xs bg-red-500/20 text-red-500">
                  {stats.white.blunder} ??
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-800 border border-border" />
              <span className="font-medium text-sm truncate">{blackPlayerName}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {stats.black.brilliant > 0 && (
                <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 gap-1">
                  <Sparkles className="w-3 h-3" />
                  {stats.black.brilliant}
                </Badge>
              )}
              {stats.black.good > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500">
                  {stats.black.good} Good
                </Badge>
              )}
              {stats.black.inaccuracy > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500">
                  {stats.black.inaccuracy} ?!
                </Badge>
              )}
              {stats.black.mistake > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-500">
                  {stats.black.mistake} ?
                </Badge>
              )}
              {stats.black.blunder > 0 && (
                <Badge variant="outline" className="text-xs bg-red-500/20 text-red-500">
                  {stats.black.blunder} ??
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
              {interestingMoves.slice(0, 6).map((move, index) => (
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

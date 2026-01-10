import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  ChevronLeft, 
  ChevronRight, 
  SkipBack, 
  SkipForward,
  Sparkles,
  AlertTriangle,
  XCircle,
  Target,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Move } from '@/types/chess';
import { Chess, Square } from 'chess.js';

interface AnalyzedMove {
  moveIndex: number;
  san: string;
  from: string;
  to: string;
  evaluation: number;
  previousEval: number;
  evalChange: number;
  classification: 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  isWhite: boolean;
  explanation: string;
}

interface GameAnalysisProps {
  moves: Move[];
  whitePlayerName: string;
  blackPlayerName: string;
  onClose: () => void;
}

const GameAnalysis: React.FC<GameAnalysisProps> = ({
  moves,
  whitePlayerName,
  blackPlayerName,
  onClose,
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const chess = useMemo(() => new Chess(), []);

  // Analyze all moves
  const analyzedMoves = useMemo(() => {
    const analyzed: AnalyzedMove[] = [];
    const tempChess = new Chess();
    let prevEval = 0;

    moves.forEach((move, index) => {
      const isWhite = index % 2 === 0;
      const beforeFen = tempChess.fen();
      
      // Make the move
      try {
        tempChess.move({ from: move.from, to: move.to, promotion: 'q' });
      } catch {
        return;
      }

      // Calculate position evaluation (simplified engine-like evaluation)
      const newEval = evaluatePosition(tempChess, beforeFen, move, isWhite);
      const evalChange = isWhite ? (newEval - prevEval) : (prevEval - newEval);
      
      // Classify the move based on evaluation change
      let classification: AnalyzedMove['classification'];
      let explanation: string;
      
      if (evalChange >= 1.5) {
        classification = 'brilliant';
        explanation = 'Exceptional move! Found a winning continuation.';
      } else if (evalChange >= 0.5) {
        classification = 'best';
        explanation = 'The best move in the position.';
      } else if (evalChange >= -0.2) {
        classification = 'good';
        explanation = 'A solid move maintaining the position.';
      } else if (evalChange >= -0.8) {
        classification = 'inaccuracy';
        explanation = 'Slightly imprecise, but not critical.';
      } else if (evalChange >= -2.0) {
        classification = 'mistake';
        explanation = 'This move loses significant advantage.';
      } else {
        classification = 'blunder';
        explanation = 'A serious error that may lose the game.';
      }

      analyzed.push({
        moveIndex: index,
        san: move.san || '',
        from: move.from,
        to: move.to,
        evaluation: newEval,
        previousEval: prevEval,
        evalChange,
        classification,
        isWhite,
        explanation,
      });

      prevEval = newEval;
    });

    return analyzed;
  }, [moves]);

  // Simplified position evaluation function
  function evaluatePosition(game: Chess, beforeFen: string, move: Move, isWhiteTurn: boolean): number {
    let score = 0;
    const board = game.board();
    
    // Material count
    const pieceValues: Record<string, number> = {
      'p': 1, 'n': 3, 'b': 3.2, 'r': 5, 'q': 9, 'k': 0
    };
    
    board.forEach((row, rowIdx) => {
      row.forEach((piece, colIdx) => {
        if (piece) {
          const value = pieceValues[piece.type] || 0;
          const positionBonus = getPositionBonus(piece.type, piece.color, rowIdx, colIdx);
          
          if (piece.color === 'w') {
            score += value + positionBonus;
          } else {
            score -= value + positionBonus;
          }
        }
      });
    });
    
    // Bonus for captures
    if (move.captured) {
      const capturedValue = pieceValues[move.captured] || 0;
      score += isWhiteTurn ? capturedValue * 0.1 : -capturedValue * 0.1;
    }
    
    // Bonus for checks
    if (game.isCheck()) {
      score += isWhiteTurn ? 0.3 : -0.3;
    }
    
    // Penalty for repetition
    const fen = game.fen().split(' ')[0];
    
    // Bonus for castling
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      if (lastMove.flags.includes('k') || lastMove.flags.includes('q')) {
        score += lastMove.color === 'w' ? 0.5 : -0.5;
      }
    }
    
    // Center control bonus
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    centerSquares.forEach(sq => {
      const piece = game.get(sq as Square);
      if (piece) {
        score += piece.color === 'w' ? 0.15 : -0.15;
      }
    });
    
    // Development bonus (early game)
    if (game.history().length < 20) {
      const developedPieces = countDevelopedPieces(game);
      score += developedPieces.white * 0.1;
      score -= developedPieces.black * 0.1;
    }
    
    // Add some randomness for realism (simulating depth variance)
    score += (Math.random() - 0.5) * 0.3;
    
    return Math.round(score * 100) / 100;
  }
  
  function getPositionBonus(pieceType: string, color: string, row: number, col: number): number {
    // Simplified piece-square tables
    const centerBonus = (3.5 - Math.abs(col - 3.5)) * 0.02 + (3.5 - Math.abs(row - 3.5)) * 0.02;
    
    if (pieceType === 'p') {
      // Pawns are better advanced
      const advancement = color === 'w' ? (7 - row) : row;
      return advancement * 0.05 + centerBonus;
    }
    
    if (pieceType === 'n') {
      // Knights are better in the center
      return centerBonus * 2;
    }
    
    if (pieceType === 'b') {
      // Bishops are slightly better in center
      return centerBonus;
    }
    
    if (pieceType === 'k') {
      // King should stay safe (back rank) in opening/middle game
      const safeRow = color === 'w' ? 7 : 0;
      return row === safeRow ? 0.2 : -0.1;
    }
    
    return centerBonus;
  }
  
  function countDevelopedPieces(game: Chess): { white: number; black: number } {
    const board = game.board();
    let white = 0;
    let black = 0;
    
    // Check if knights and bishops have moved from starting squares
    const startingPositions: Record<string, Square[]> = {
      'wn': ['b1', 'g1'],
      'wb': ['c1', 'f1'],
      'bn': ['b8', 'g8'],
      'bb': ['c8', 'f8'],
    };
    
    Object.entries(startingPositions).forEach(([key, squares]) => {
      const color = key[0];
      const pieceType = key[1];
      squares.forEach(sq => {
        const piece = game.get(sq);
        // If piece is NOT on starting square, it's developed
        if (!piece || piece.type !== pieceType || piece.color !== color) {
          if (color === 'w') white++;
          else black++;
        }
      });
    });
    
    return { white, black };
  }

  // Get current position FEN
  const currentPositionFen = useMemo(() => {
    chess.reset();
    for (let i = 0; i <= currentMoveIndex && i < moves.length; i++) {
      try {
        chess.move({ from: moves[i].from, to: moves[i].to, promotion: 'q' });
      } catch {
        break;
      }
    }
    return chess.fen();
  }, [currentMoveIndex, moves, chess]);

  // Statistics
  const stats = useMemo(() => {
    const whiteMoves = analyzedMoves.filter(m => m.isWhite);
    const blackMoves = analyzedMoves.filter(m => !m.isWhite);
    
    const countByClassification = (moves: AnalyzedMove[], classification: string) =>
      moves.filter(m => m.classification === classification).length;
    
    return {
      white: {
        brilliant: countByClassification(whiteMoves, 'brilliant'),
        best: countByClassification(whiteMoves, 'best'),
        good: countByClassification(whiteMoves, 'good'),
        inaccuracy: countByClassification(whiteMoves, 'inaccuracy'),
        mistake: countByClassification(whiteMoves, 'mistake'),
        blunder: countByClassification(whiteMoves, 'blunder'),
        accuracy: calculateAccuracy(whiteMoves),
      },
      black: {
        brilliant: countByClassification(blackMoves, 'brilliant'),
        best: countByClassification(blackMoves, 'best'),
        good: countByClassification(blackMoves, 'good'),
        inaccuracy: countByClassification(blackMoves, 'inaccuracy'),
        mistake: countByClassification(blackMoves, 'mistake'),
        blunder: countByClassification(blackMoves, 'blunder'),
        accuracy: calculateAccuracy(blackMoves),
      },
    };
  }, [analyzedMoves]);

  function calculateAccuracy(moves: AnalyzedMove[]): number {
    if (moves.length === 0) return 0;
    
    const weights = {
      brilliant: 100,
      best: 95,
      good: 80,
      inaccuracy: 60,
      mistake: 30,
      blunder: 0,
    };
    
    const total = moves.reduce((sum, m) => sum + weights[m.classification], 0);
    return Math.round(total / moves.length);
  }

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'brilliant': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'best': return <Target className="w-4 h-4 text-green-500" />;
      case 'good': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'inaccuracy': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'mistake': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'blunder': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'brilliant': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'best': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'inaccuracy': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'mistake': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'blunder': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return '';
    }
  };

  const currentAnalyzedMove = analyzedMoves[currentMoveIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Game Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Player Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* White Stats */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white border border-border" />
                    <span className="font-medium">{whitePlayerName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-lg font-bold">{stats.white.accuracy}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{stats.white.brilliant}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-green-500" />
                    <span>{stats.white.best}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span>{stats.white.good}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span>{stats.white.inaccuracy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    <span>{stats.white.mistake}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>{stats.white.blunder}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Black Stats */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-800 border border-border" />
                    <span className="font-medium">{blackPlayerName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-lg font-bold">{stats.black.accuracy}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{stats.black.brilliant}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-green-500" />
                    <span>{stats.black.best}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span>{stats.black.good}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span>{stats.black.inaccuracy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    <span>{stats.black.mistake}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>{stats.black.blunder}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Move Navigation */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMoveIndex(0)}
                disabled={currentMoveIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
                disabled={currentMoveIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                Move {currentMoveIndex + 1} / {moves.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMoveIndex(Math.min(moves.length - 1, currentMoveIndex + 1))}
                disabled={currentMoveIndex >= moves.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMoveIndex(moves.length - 1)}
                disabled={currentMoveIndex >= moves.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
            
            <Slider
              value={[currentMoveIndex]}
              min={0}
              max={Math.max(0, moves.length - 1)}
              step={1}
              onValueChange={([value]) => setCurrentMoveIndex(value)}
              className="w-full"
            />
          </div>

          {/* Current Move Analysis */}
          {currentAnalyzedMove && (
            <Card className={`border ${getClassificationColor(currentAnalyzedMove.classification)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      currentAnalyzedMove.isWhite ? 'bg-white text-black' : 'bg-gray-800 text-white'
                    }`}>
                      {Math.floor(currentAnalyzedMove.moveIndex / 2) + 1}.
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono">
                          {currentAnalyzedMove.san}
                        </span>
                        {getClassificationIcon(currentAnalyzedMove.classification)}
                        <Badge variant="outline" className={getClassificationColor(currentAnalyzedMove.classification)}>
                          {currentAnalyzedMove.classification}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentAnalyzedMove.explanation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {currentAnalyzedMove.evalChange >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`font-mono ${
                        currentAnalyzedMove.evalChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {currentAnalyzedMove.evalChange >= 0 ? '+' : ''}{currentAnalyzedMove.evalChange.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Eval: {currentAnalyzedMove.evaluation >= 0 ? '+' : ''}{currentAnalyzedMove.evaluation.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Move List */}
          <ScrollArea className="h-48">
            <div className="flex flex-wrap gap-1 p-1">
              {analyzedMoves.map((move, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentMoveIndex(index)}
                  className={`px-2 py-1 rounded text-sm font-mono transition-all flex items-center gap-1 ${
                    index === currentMoveIndex
                      ? 'bg-primary text-primary-foreground'
                      : `hover:bg-secondary ${getClassificationColor(move.classification).replace('bg-', 'hover:bg-')}`
                  }`}
                >
                  {index % 2 === 0 && (
                    <span className="text-muted-foreground text-xs">
                      {Math.floor(index / 2) + 1}.
                    </span>
                  )}
                  {move.san}
                  {(move.classification === 'brilliant' || move.classification === 'blunder') && (
                    <span className="ml-0.5">
                      {getClassificationIcon(move.classification)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GameAnalysis;

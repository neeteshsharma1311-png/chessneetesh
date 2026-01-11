import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { 
  ArrowLeft, 
  RotateCcw, 
  Lightbulb, 
  Trophy, 
  Target,
  ChevronRight,
  Star,
  Zap,
  Brain,
  Flame,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Puzzle type definition
interface Puzzle {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  fen: string;
  solution: string[];
  playerColor: 'w' | 'b';
  theme: string;
}

// Famous chess puzzles and tactical patterns
const PUZZLES: Puzzle[] = [
  // Beginner puzzles - Simple captures and forks
  {
    id: 1,
    name: "Knight Fork",
    description: "Use the knight to attack two pieces at once!",
    difficulty: 'easy',
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solution: ["h5f7"],
    playerColor: 'w',
    theme: "Fork",
  },
  {
    id: 2,
    name: "Back Rank Mate",
    description: "Deliver checkmate on the back rank!",
    difficulty: 'easy',
    fen: "6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1",
    solution: ["a1a8"],
    playerColor: 'w',
    theme: "Checkmate",
  },
  {
    id: 3,
    name: "Queen Trap",
    description: "Win the opponent's queen!",
    difficulty: 'easy',
    fen: "rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    solution: ["f3f4"],
    playerColor: 'w',
    theme: "Trap",
  },
  // Intermediate puzzles
  {
    id: 4,
    name: "Smothered Mate",
    description: "A classic smothered mate pattern!",
    difficulty: 'medium',
    fen: "r1b2rk1/ppp2ppp/2n5/3qN3/8/8/PPPP1PPP/R1BQK2R w KQ - 0 1",
    solution: ["e5f7", "f8f7", "d1d5"],
    playerColor: 'w',
    theme: "Checkmate Pattern",
  },
  {
    id: 5,
    name: "Greek Gift Sacrifice",
    description: "Sacrifice the bishop on h7!",
    difficulty: 'medium',
    fen: "r1bq1rk1/pppn1ppp/3bpn2/3p4/2PP4/2N1PN2/PPB2PPP/R1BQ1RK1 w - - 0 1",
    solution: ["c2h7"],
    playerColor: 'w',
    theme: "Sacrifice",
  },
  {
    id: 6,
    name: "Discovered Attack",
    description: "Move one piece to reveal an attack from another!",
    difficulty: 'medium',
    fen: "r2qkb1r/ppp2ppp/2n1bn2/3Np3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1",
    solution: ["d5f6"],
    playerColor: 'w',
    theme: "Discovered Attack",
  },
  // Hard puzzles
  {
    id: 7,
    name: "The Immortal Game",
    description: "Adolf Anderssen's brilliant finish!",
    difficulty: 'hard',
    fen: "1r3kr1/pbpBBp1p/1b3P2/8/8/2P2q2/P4PPP/3R2K1 w - - 0 1",
    solution: ["d7e8"],
    playerColor: 'w',
    theme: "Famous Game",
  },
  {
    id: 8,
    name: "Queen Sacrifice",
    description: "Sacrifice the queen for a winning attack!",
    difficulty: 'hard',
    fen: "r1b1kb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solution: ["h5f7"],
    playerColor: 'w',
    theme: "Sacrifice",
  },
  {
    id: 9,
    name: "Deflection",
    description: "Force the defender away from their duty!",
    difficulty: 'hard',
    fen: "2r3k1/pp3ppp/8/3p4/8/1P6/P4PPP/2R3K1 w - - 0 1",
    solution: ["c1c8"],
    playerColor: 'w',
    theme: "Deflection",
  },
  // Add a puzzle where black plays
  {
    id: 10,
    name: "Counter Attack",
    description: "Find the winning move for black!",
    difficulty: 'medium',
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    solution: ["f6e4"],
    playerColor: 'b',
    theme: "Counter Attack",
  },
];

interface PuzzleModeProps {
  onBack: () => void;
}

const PuzzleMode: React.FC<PuzzleModeProps> = ({ onBack }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [chess] = useState(() => new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [puzzleState, setPuzzleState] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [showHint, setShowHint] = useState(false);
  const [solvedPuzzles, setSolvedPuzzles] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  
  const { playMove, playCapture, playCheck, playGameOver, playClick } = useSoundEffects();

  // Filter puzzles by difficulty
  const filteredPuzzles = useMemo(() => {
    if (!selectedDifficulty) return [];
    return PUZZLES.filter(p => p.difficulty === selectedDifficulty);
  }, [selectedDifficulty]);

  const currentPuzzle = filteredPuzzles[currentPuzzleIndex];

  // Load puzzle
  const loadPuzzle = useCallback((puzzle: typeof PUZZLES[0]) => {
    chess.load(puzzle.fen);
    setBoardPosition(chess.board());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveIndex(0);
    setPuzzleState('playing');
    setShowHint(false);
  }, [chess]);

  // Initialize puzzle when selected
  useEffect(() => {
    if (currentPuzzle) {
      loadPuzzle(currentPuzzle);
    }
  }, [currentPuzzle, loadPuzzle]);

  const handleSquareClick = useCallback((square: Square) => {
    if (puzzleState !== 'playing' || !currentPuzzle) return;

    const piece = chess.get(square);
    
    // If a piece is already selected
    if (selectedSquare) {
      // Try to make a move
      const moveString = `${selectedSquare}${square}`;
      const expectedMove = currentPuzzle.solution[moveIndex];
      
      if (moveString === expectedMove || moveString === expectedMove?.slice(0, 4)) {
        // Correct move!
        try {
          const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
          if (move) {
            setBoardPosition(chess.board());
            setLastMove({ from: selectedSquare, to: square });
            
            if (move.captured) {
              playCapture();
            } else {
              playMove();
            }
            
            if (chess.isCheck()) {
              playCheck();
            }
            
            const nextMoveIndex = moveIndex + 1;
            setMoveIndex(nextMoveIndex);
            
            // Check if puzzle is solved
            if (nextMoveIndex >= currentPuzzle.solution.length) {
              setPuzzleState('solved');
              playGameOver();
              setSolvedPuzzles(prev => [...prev, currentPuzzle.id]);
              setStreak(prev => prev + 1);
            }
          }
        } catch (e) {
          console.error('Move error:', e);
        }
      } else {
        // Wrong move
        setPuzzleState('failed');
        setStreak(0);
        playClick();
      }
      
      setSelectedSquare(null);
      setValidMoves([]);
    } else if (piece && piece.color === currentPuzzle.playerColor) {
      // Select piece
      playClick();
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves.map(m => m.to as Square));
    }
  }, [chess, selectedSquare, currentPuzzle, moveIndex, puzzleState, playMove, playCapture, playCheck, playClick, playGameOver]);

  const handleRetry = () => {
    if (currentPuzzle) {
      loadPuzzle(currentPuzzle);
    }
  };

  const handleNextPuzzle = () => {
    if (currentPuzzleIndex < filteredPuzzles.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
    } else {
      // Reset to first puzzle if at the end
      setCurrentPuzzleIndex(0);
    }
  };

  const handleShowHint = () => {
    if (currentPuzzle && moveIndex < currentPuzzle.solution.length) {
      setShowHint(true);
    }
  };

  const getDifficultyIcon = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return <Zap className="w-6 h-6 text-green-500" />;
      case 'medium': return <Brain className="w-6 h-6 text-yellow-500" />;
      case 'hard': return <Flame className="w-6 h-6 text-red-500" />;
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  // Difficulty selection screen
  if (!selectedDifficulty) {
    return (
      <motion.div
        className="glass-panel p-6 md:p-8 max-w-lg w-full mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient">
            Puzzle Mode
          </h2>
        </div>

        <p className="text-muted-foreground mb-6 text-center">
          Practice tactical patterns from famous games. Choose your difficulty:
        </p>

        <div className="space-y-4">
          {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
            const count = PUZZLES.filter(p => p.difficulty === difficulty).length;
            const solved = solvedPuzzles.filter(id => 
              PUZZLES.find(p => p.id === id && p.difficulty === difficulty)
            ).length;
            
            return (
              <motion.button
                key={difficulty}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                  selectedDifficulty === difficulty
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/50 hover:border-primary/50'
                }`}
                onClick={() => setSelectedDifficulty(difficulty)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {getDifficultyIcon(difficulty)}
                <div className="flex-1 text-left">
                  <p className="font-semibold capitalize">{difficulty}</p>
                  <p className="text-sm text-muted-foreground">
                    {solved}/{count} puzzles solved
                  </p>
                </div>
                <Progress value={(solved / count) * 100} className="w-20" />
              </motion.button>
            );
          })}
        </div>

        {streak > 0 && (
          <motion.div 
            className="mt-6 flex items-center justify-center gap-2 text-primary"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Star className="w-5 h-5 fill-current" />
            <span className="font-semibold">Current Streak: {streak}</span>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Puzzle playing screen
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-8">
        {/* Left panel - Info */}
        <div className="order-2 lg:order-1 space-y-4">
          <Card className="glass-panel border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDifficulty(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Badge className={getDifficultyColor(currentPuzzle?.difficulty || 'easy')}>
                  {currentPuzzle?.difficulty}
                </Badge>
              </div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {currentPuzzle?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {currentPuzzle?.description}
              </p>
              <Badge variant="outline" className="mb-4">
                Theme: {currentPuzzle?.theme}
              </Badge>
              
              {/* Progress */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">
                  Puzzle {currentPuzzleIndex + 1} of {filteredPuzzles.length}
                </span>
                <Progress 
                  value={((currentPuzzleIndex + 1) / filteredPuzzles.length) * 100} 
                  className="flex-1"
                />
              </div>

              {/* Hint */}
              {showHint && currentPuzzle && (
                <motion.div
                  className="p-3 rounded-lg bg-primary/10 border border-primary/30 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Hint:</span> Move from{' '}
                    <span className="font-mono">{currentPuzzle.solution[moveIndex]?.slice(0, 2)}</span>
                  </p>
                </motion.div>
              )}

              {/* State feedback */}
              <AnimatePresence>
                {puzzleState === 'solved' && (
                  <motion.div
                    className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-400">Correct!</p>
                      <p className="text-sm text-green-400/80">Great job solving this puzzle!</p>
                    </div>
                  </motion.div>
                )}
                
                {puzzleState === 'failed' && (
                  <motion.div
                    className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <XCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-400">Incorrect!</p>
                      <p className="text-sm text-red-400/80">Try again or see the solution.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-2">
            {puzzleState === 'playing' && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleShowHint}
                disabled={showHint}
              >
                <Lightbulb className="w-4 h-4" />
                {showHint ? 'Hint Shown' : 'Show Hint'}
              </Button>
            )}
            
            {puzzleState !== 'playing' && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleRetry}
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  className="w-full gap-2 glow-button"
                  onClick={handleNextPuzzle}
                >
                  <ChevronRight className="w-4 h-4" />
                  Next Puzzle
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm">Solved</span>
                </div>
                <span className="font-bold">{solvedPuzzles.length}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-sm">Streak</span>
                </div>
                <span className="font-bold">{streak}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Board */}
        <div className="order-1 lg:order-2 flex flex-col items-center">
          <div className="w-full max-w-[min(90vw,500px)] lg:max-w-[500px]">
            <div className="mb-2 flex items-center justify-center gap-3">
              <Badge variant={
                puzzleState === 'solved' ? 'default' : 
                puzzleState === 'failed' ? 'destructive' : 'secondary'
              }>
                {puzzleState === 'playing' ? `${currentPuzzle?.playerColor === 'w' ? 'White' : 'Black'} to move` :
                 puzzleState === 'solved' ? 'Solved!' : 'Try Again'}
              </Badge>
            </div>
            <ChessBoard
              board={boardPosition}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              isCheck={chess.isCheck()}
              currentTurn={chess.turn()}
              onSquareClick={handleSquareClick}
              disabled={puzzleState !== 'playing'}
              flipped={currentPuzzle?.playerColor === ('b' as const)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PuzzleMode;

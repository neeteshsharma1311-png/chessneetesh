import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  RotateCcw, 
  Lightbulb, 
  Trophy, 
  Target,
  Star,
  Flame,
  CheckCircle2,
  XCircle,
  Calendar,
  Gift,
  Zap
} from 'lucide-react';

interface DailyPuzzle {
  id: string;
  puzzle_date: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  fen: string;
  solution: string[];
  player_color: 'w' | 'b';
  theme: string;
}

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  total_puzzles_solved: number;
  last_completed_date: string | null;
}

interface DailyPuzzleProps {
  onBack: () => void;
}

const DailyPuzzle: React.FC<DailyPuzzleProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alreadySolved, setAlreadySolved] = useState(false);
  
  const [chess] = useState(() => new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [puzzleState, setPuzzleState] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const { playMove, playCapture, playCheck, playGameOver, playClick } = useSoundEffects();

  // Fetch today's puzzle and user's streak
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch today's puzzle
      const today = new Date().toISOString().split('T')[0];
      const { data: puzzleData, error: puzzleError } = await supabase
        .from('daily_puzzles')
        .select('*')
        .eq('puzzle_date', today)
        .single();

      if (puzzleError) {
        console.error('Error fetching daily puzzle:', puzzleError);
        toast({
          title: "No puzzle available",
          description: "Check back tomorrow for a new puzzle!",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      setPuzzle(puzzleData as DailyPuzzle);
      chess.load(puzzleData.fen);
      setBoardPosition(chess.board());

      // Fetch user's streak if logged in
      if (user) {
        const { data: streakData } = await supabase
          .from('user_puzzle_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (streakData) {
          setStreak(streakData as UserStreak);
        }

        // Check if already solved today
        const { data: progressData } = await supabase
          .from('user_puzzle_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('puzzle_id', puzzleData.id)
          .single();

        if (progressData) {
          setAlreadySolved(true);
          setPuzzleState('solved');
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user, chess, toast]);

  const handleSquareClick = useCallback((square: Square) => {
    if (puzzleState !== 'playing' || !puzzle || alreadySolved) return;

    const piece = chess.get(square);
    
    if (selectedSquare) {
      const moveString = `${selectedSquare}${square}`;
      const expectedMove = puzzle.solution[moveIndex];
      
      if (moveString === expectedMove || moveString === expectedMove?.slice(0, 4)) {
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
            
            if (nextMoveIndex >= puzzle.solution.length) {
              setPuzzleState('solved');
              playGameOver();
              savePuzzleProgress();
            }
          }
        } catch (e) {
          console.error('Move error:', e);
        }
      } else {
        setAttempts(prev => prev + 1);
        if (attempts >= 2) {
          setPuzzleState('failed');
        }
        playClick();
      }
      
      setSelectedSquare(null);
      setValidMoves([]);
    } else if (piece && piece.color === puzzle.player_color) {
      playClick();
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves.map(m => m.to as Square));
    }
  }, [chess, selectedSquare, puzzle, moveIndex, puzzleState, attempts, alreadySolved, playMove, playCapture, playCheck, playClick, playGameOver]);

  const savePuzzleProgress = async () => {
    if (!user || !puzzle) return;

    try {
      // Save puzzle progress
      await supabase
        .from('user_puzzle_progress')
        .upsert({
          user_id: user.id,
          puzzle_id: puzzle.id,
          attempts: attempts + 1,
          hints_used: hintsUsed,
          completed_at: new Date().toISOString()
        });

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const { data: existingStreak } = await supabase
        .from('user_puzzle_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let newStreak = 1;
      let longestStreak = 1;
      let totalSolved = 1;

      if (existingStreak) {
        totalSolved = existingStreak.total_puzzles_solved + 1;
        if (existingStreak.last_completed_date === yesterday) {
          newStreak = existingStreak.current_streak + 1;
        } else if (existingStreak.last_completed_date === today) {
          newStreak = existingStreak.current_streak;
        }
        longestStreak = Math.max(existingStreak.longest_streak, newStreak);
      }

      await supabase
        .from('user_puzzle_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          longest_streak: longestStreak,
          total_puzzles_solved: totalSolved,
          last_completed_date: today,
          updated_at: new Date().toISOString()
        });

      setStreak({
        current_streak: newStreak,
        longest_streak: longestStreak,
        total_puzzles_solved: totalSolved,
        last_completed_date: today
      });

      toast({
        title: "🎉 Puzzle Solved!",
        description: `Streak: ${newStreak} days! Keep it up!`,
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleRetry = () => {
    if (puzzle) {
      chess.load(puzzle.fen);
      setBoardPosition(chess.board());
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setMoveIndex(0);
      setPuzzleState('playing');
      setShowHint(false);
      setAttempts(0);
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return '';
    }
  };

  const getStreakReward = (streak: number) => {
    if (streak >= 30) return { icon: '👑', label: 'Grandmaster', color: 'text-yellow-400' };
    if (streak >= 14) return { icon: '🏆', label: 'Master', color: 'text-purple-400' };
    if (streak >= 7) return { icon: '⭐', label: 'Expert', color: 'text-blue-400' };
    if (streak >= 3) return { icon: '🔥', label: 'Hot Streak', color: 'text-orange-400' };
    return { icon: '✨', label: 'Getting Started', color: 'text-muted-foreground' };
  };

  if (isLoading) {
    return (
      <motion.div
        className="glass-panel p-8 max-w-md w-full mx-auto text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </motion.div>
    );
  }

  if (!puzzle) {
    return (
      <motion.div
        className="glass-panel p-8 max-w-md w-full mx-auto text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="font-display text-2xl font-bold mb-2">No Puzzle Today</h2>
        <p className="text-muted-foreground mb-4">Check back tomorrow for a new daily puzzle!</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </motion.div>
    );
  }

  const reward = streak ? getStreakReward(streak.current_streak) : null;

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
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    Daily Puzzle
                  </Badge>
                  <Badge className={getDifficultyColor(puzzle.difficulty)}>
                    {puzzle.difficulty}
                  </Badge>
                </div>
              </div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {puzzle.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {puzzle.description}
              </p>
              <Badge variant="outline" className="mb-4">
                Theme: {puzzle.theme}
              </Badge>

              {/* Hint */}
              {showHint && (
                <motion.div
                  className="p-3 rounded-lg bg-primary/10 border border-primary/30 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Hint:</span> Move from{' '}
                    <span className="font-mono">{puzzle.solution[moveIndex]?.slice(0, 2)}</span>
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
                      <p className="font-semibold text-green-400">
                        {alreadySolved ? 'Already Solved!' : 'Correct!'}
                      </p>
                      <p className="text-sm text-green-400/80">
                        {alreadySolved ? 'Come back tomorrow for a new puzzle!' : 'Great job solving today\'s puzzle!'}
                      </p>
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
                      <p className="font-semibold text-red-400">Too Many Attempts!</p>
                      <p className="text-sm text-red-400/80">Try again or use a hint.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-2">
            {puzzleState === 'playing' && !alreadySolved && (
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
            
            {(puzzleState === 'failed' || alreadySolved) && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleRetry}
              >
                <RotateCcw className="w-4 h-4" />
                {alreadySolved ? 'Practice Again' : 'Try Again'}
              </Button>
            )}
          </div>

          {/* Streak Stats */}
          {user && streak && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold">Your Streak</span>
                  </div>
                  {reward && (
                    <Badge variant="secondary" className={reward.color}>
                      {reward.icon} {reward.label}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{streak.current_streak}</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{streak.longest_streak}</p>
                    <p className="text-xs text-muted-foreground">Longest</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{streak.total_puzzles_solved}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    {streak.current_streak >= 7 
                      ? 'Keep going for special rewards!' 
                      : `${7 - streak.current_streak} more days to Expert badge!`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {!user && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium mb-1">Sign in to track your streak!</p>
                <p className="text-xs text-muted-foreground">
                  Earn badges and compete on the leaderboard
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right - Chess board */}
        <div className="order-1 lg:order-2">
          <div className="w-full max-w-[min(90vw,500px)] lg:max-w-[500px]">
            <ChessBoard
              board={boardPosition}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              isCheck={chess.isCheck()}
              currentTurn={puzzle.player_color}
              onSquareClick={handleSquareClick}
              disabled={puzzleState !== 'playing' || alreadySolved}
              flipped={puzzle.player_color === 'b'}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyPuzzle;
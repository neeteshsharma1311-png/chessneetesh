import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ChessBoard from './ChessBoard';
import PlayerInfo from './PlayerInfo';
import MoveHistory from './MoveHistory';
import GameControls from './GameControls';
import GameSetup from './GameSetup';
import GameResultModal from './GameResultModal';
import ThemeSelector from './ThemeSelector';
import HelpSection from './HelpSection';
import Footer from './Footer';
import OnlineLobby from './OnlineLobby';
import OnlineGame from './OnlineGame';
import PuzzleMode from './PuzzleMode';
import LoadingScreen from './LoadingScreen';
import OpeningBook from './OpeningBook';
import DailyPuzzle from './DailyPuzzle';
import TournamentMode from './TournamentMode';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChessGame } from '@/hooks/useChessGame';
import { useTheme } from '@/hooks/useTheme';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useWelcomeVoice } from '@/hooks/useWelcomeVoice';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import { GameResult, GameMode, AIDifficulty } from '@/types/chess';
import { Square } from 'chess.js';
import { User, LogIn } from 'lucide-react';

const ChessGame: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const {
    gameState,
    boardPosition,
    selectedSquare,
    validMoves,
    lastMove,
    startGame,
    selectSquare,
    undoMove,
    restartGame,
    resignGame,
    offerDraw,
  } = useChessGame();

  const { currentGame } = useOnlineGame(user?.id);
  const { theme, changeTheme } = useTheme();
  const { playMove, playCapture, playCheck, playGameOver, playClick, toggleSound, isSoundEnabled } = useSoundEffects();
  const { playWelcome } = useWelcomeVoice();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showOnlineGame, setShowOnlineGame] = useState(false);
  const [showPuzzleMode, setShowPuzzleMode] = useState(false);
  const [showDailyPuzzle, setShowDailyPuzzle] = useState(false);
  const [showTournament, setShowTournament] = useState(false);

  // Loading screen and welcome voice
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Play welcome after loading completes
      setTimeout(() => {
        playWelcome();
      }, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [playWelcome]);

  // Handle game over
  useEffect(() => {
    if (gameState.gameOver && gameState.gameStarted) {
      playGameOver();
      
      let reason: GameResult['reason'] = 'checkmate';
      if (gameState.isStalemate) reason = 'stalemate';
      else if (gameState.isDraw) reason = 'draw';
      else if (!gameState.isCheckmate && gameState.winner) {
        // Timeout or resignation
        reason = gameState.players.white.timeRemaining === 0 || gameState.players.black.timeRemaining === 0
          ? 'timeout'
          : 'resignation';
      }

      const winnerName = gameState.winner
        ? gameState.winner === 'w'
          ? gameState.players.white.name
          : gameState.players.black.name
        : null;

      setGameResult({
        winner: winnerName,
        reason,
        moveCount: gameState.moveHistory.length,
      });
      
      setTimeout(() => setShowResult(true), 500);
    }
  }, [gameState.gameOver, gameState.gameStarted, gameState.isStalemate, gameState.isDraw, gameState.isCheckmate, gameState.winner, gameState.players, gameState.moveHistory.length, playGameOver]);

  // Show loading screen after all hooks
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show online game when currentGame is in progress
  useEffect(() => {
    if (!currentGame) {
      // No current game - if we were in a game, go back to lobby
      if (showOnlineGame) {
        console.log('ChessGame: No current game, returning to lobby');
        setShowOnlineGame(false);
        setShowOnlineLobby(true);
      }
      return;
    }

    console.log('ChessGame: currentGame changed', { 
      id: currentGame.id, 
      status: currentGame.status,
      black_player: currentGame.black_player_id,
      showOnlineLobby,
      showOnlineGame
    });
    
    if (currentGame.status === 'in_progress') {
      console.log('ChessGame: Game is in_progress - transitioning to game view');
      setShowOnlineGame(true);
      setShowOnlineLobby(false);
    } else if (currentGame.status === 'waiting') {
      // If not already showing lobby or game, show lobby
      if (!showOnlineLobby && !showOnlineGame) {
        console.log('ChessGame: Waiting game detected, showing lobby');
        setShowOnlineLobby(true);
      }
    }
  }, [currentGame?.id, currentGame?.status, currentGame?.black_player_id]);

  // Play sounds on moves
  useEffect(() => {
    if (gameState.moveHistory.length > 0) {
      const lastMoveData = gameState.moveHistory[gameState.moveHistory.length - 1];
      if (lastMoveData.captured) {
        playCapture();
      } else {
        playMove();
      }
      
      if (gameState.isCheck) {
        setTimeout(() => playCheck(), 100);
      }
    }
  }, [gameState.moveHistory.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'u' || e.key === 'U') {
        undoMove();
        playClick();
      }
      if (e.key === 'r' || e.key === 'R') {
        restartGame();
        playClick();
      }
      if (e.key === 'm' || e.key === 'M') {
        handleToggleSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoMove, restartGame, playClick]);

  const handleSquareClick = (square: Square) => {
    playClick();
    selectSquare(square);
  };

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  };

  const handleNewGame = () => {
    setShowResult(false);
    setGameResult(null);
  };

  const handleRestart = () => {
    setShowResult(false);
    restartGame();
  };

  const handleStartGame = (
    mode: GameMode,
    difficulty: AIDifficulty,
    player1Name: string,
    player2Name: string,
    useTimer: boolean,
    timerDuration: number
  ) => {
    playClick();
    startGame(mode, difficulty, player1Name, player2Name, useTimer, timerDuration);
  };

  const handlePlayOnline = () => {
    playClick();
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowOnlineLobby(true);
  };

  const handleBackFromLobby = () => {
    setShowOnlineLobby(false);
  };

  const handleBackFromGame = () => {
    setShowOnlineGame(false);
    setShowOnlineLobby(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Animated background */}
      <div className="animated-bg">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>

      {/* Header */}
      <header className="w-full py-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.h1
            className="font-display text-2xl md:text-3xl font-bold text-gradient"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            ♔ Chess Master
          </motion.h1>
          
          <div className="flex items-center gap-2">
            <ThemeSelector currentTheme={theme} onThemeChange={changeTheme} />
            <HelpSection />
            
            {user && profile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
                className="rounded-full"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {showDailyPuzzle ? (
            <motion.div
              key="daily-puzzle"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DailyPuzzle onBack={() => setShowDailyPuzzle(false)} />
            </motion.div>
          ) : showTournament ? (
            <motion.div
              key="tournament"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TournamentMode onBack={() => setShowTournament(false)} />
            </motion.div>
          ) : showPuzzleMode ? (
            <motion.div
              key="puzzle-mode"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PuzzleMode onBack={() => setShowPuzzleMode(false)} />
            </motion.div>
          ) : showOnlineGame && currentGame ? (
            <motion.div
              key="online-game"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <OnlineGame onBack={handleBackFromGame} />
            </motion.div>
          ) : showOnlineLobby ? (
            <motion.div
              key="online-lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <OnlineLobby onBack={handleBackFromLobby} />
            </motion.div>
          ) : !gameState.gameStarted ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GameSetup 
                onStartGame={handleStartGame} 
                onPlayOnline={handlePlayOnline}
                onPlayPuzzle={() => setShowPuzzleMode(true)}
                onPlayDailyPuzzle={() => setShowDailyPuzzle(true)}
                onPlayTournament={() => setShowTournament(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              className="w-full max-w-7xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-8 items-start">
                {/* Left panel - Player info & controls */}
                <div className="order-2 lg:order-1 space-y-4">
                  <PlayerInfo
                    name={gameState.players.black.name}
                    color="b"
                    isActive={gameState.currentTurn === 'b' && !gameState.gameOver}
                    timeRemaining={gameState.players.black.timeRemaining}
                    showTimer={gameState.useTimer}
                  />
                  
                  {/* Opening Book for local games */}
                  <OpeningBook moveHistory={gameState.moveHistory} />
                  
                  <div className="hidden lg:block">
                    <GameControls
                      onUndo={undoMove}
                      onRestart={restartGame}
                      onResign={resignGame}
                      onDraw={offerDraw}
                      soundEnabled={soundEnabled}
                      onToggleSound={handleToggleSound}
                      canUndo={gameState.moveHistory.length > 0}
                      gameStarted={gameState.gameStarted}
                      gameOver={gameState.gameOver}
                    />
                  </div>
                </div>

                {/* Center - Chess board */}
                <div className="order-1 lg:order-2 flex justify-center">
                  <div className="w-full max-w-[min(90vw,500px)] lg:max-w-[500px]">
                    <ChessBoard
                      board={boardPosition}
                      selectedSquare={selectedSquare}
                      validMoves={validMoves}
                      lastMove={lastMove}
                      isCheck={gameState.isCheck}
                      currentTurn={gameState.currentTurn}
                      onSquareClick={handleSquareClick}
                      disabled={gameState.gameOver || (gameState.mode === 'ai' && gameState.currentTurn === 'b')}
                    />
                  </div>
                </div>

                {/* Right panel - Move history & player info */}
                <div className="order-3 space-y-4">
                  <PlayerInfo
                    name={gameState.players.white.name}
                    color="w"
                    isActive={gameState.currentTurn === 'w' && !gameState.gameOver}
                    timeRemaining={gameState.players.white.timeRemaining}
                    showTimer={gameState.useTimer}
                  />
                  
                  <MoveHistory moves={gameState.moveHistory} />
                  
                  {/* Mobile controls */}
                  <div className="lg:hidden">
                    <GameControls
                      onUndo={undoMove}
                      onRestart={restartGame}
                      onResign={resignGame}
                      onDraw={offerDraw}
                      soundEnabled={soundEnabled}
                      onToggleSound={handleToggleSound}
                      canUndo={gameState.moveHistory.length > 0}
                      gameStarted={gameState.gameStarted}
                      gameOver={gameState.gameOver}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Game result modal */}
      <GameResultModal
        isOpen={showResult}
        result={gameResult}
        onRestart={handleRestart}
        onNewGame={handleNewGame}
        moves={gameState.moveHistory}
        whitePlayerName={gameState.players.white.name}
        blackPlayerName={gameState.players.black.name}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ChessGame;

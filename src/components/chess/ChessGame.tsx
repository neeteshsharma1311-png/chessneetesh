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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChessGame } from '@/hooks/useChessGame';
import { useTheme } from '@/hooks/useTheme';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import { GameResult, GameMode, AIDifficulty } from '@/types/chess';
import { Square } from 'chess.js';
import { User, LogIn } from 'lucide-react';

const ChessGame: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
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
  } = useChessGame();

  const { currentGame } = useOnlineGame(user?.id);
  const { theme, changeTheme } = useTheme();
  const { playMove, playCapture, playCheck, playGameOver, playClick, toggleSound, isSoundEnabled } = useSoundEffects();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showOnlineGame, setShowOnlineGame] = useState(false);

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
  }, [gameState.gameOver, gameState.gameStarted, playGameOver]);

  // Show online game when currentGame is in progress
  useEffect(() => {
    if (currentGame) {
      if (currentGame.status === 'in_progress') {
        setShowOnlineGame(true);
        setShowOnlineLobby(false);
      } else if (currentGame.status === 'waiting') {
        // Keep in lobby for waiting games
        setShowOnlineLobby(true);
        setShowOnlineGame(false);
      }
    }
  }, [currentGame, currentGame?.status]);

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
      <div className="animated-bg" />

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
          {showOnlineGame && currentGame ? (
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
              <GameSetup onStartGame={handleStartGame} onPlayOnline={handlePlayOnline} />
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
                  
                  <div className="hidden lg:block">
                    <GameControls
                      onUndo={undoMove}
                      onRestart={restartGame}
                      onResign={resignGame}
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
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ChessGame;

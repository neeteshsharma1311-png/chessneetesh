import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ChessBoard from './ChessBoard';
import PlayerInfo from './PlayerInfo';
import MoveHistory from './MoveHistory';
import GameResultModal from './GameResultModal';
import GameChat from './GameChat';
import ConnectionStatus from './ConnectionStatus';
import { Button } from '@/components/ui/button';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import { useAuth, Profile } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResult } from '@/types/chess';
import { Square } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import { Flag, ArrowLeft, Volume2, VolumeX } from 'lucide-react';

interface OnlineGameProps {
  onBack: () => void;
}

const OnlineGame: React.FC<OnlineGameProps> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const {
    currentGame,
    playerColor,
    boardPosition,
    selectedSquare,
    validMoves,
    lastMove,
    moveHistory,
    isMyTurn,
    isCheck,
    isCheckmate,
    isGameOver,
    isRealtimeConnected,
    whiteTimeRemaining,
    blackTimeRemaining,
    selectSquare,
    resignGame,
    leaveGame,
    requestRematch,
  } = useOnlineGame(user?.id);

  const { playMove, playCapture, playCheck, playGameOver, playClick, toggleSound, isSoundEnabled } = useSoundEffects();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [whiteProfile, setWhiteProfile] = useState<Profile | null>(null);
  const [blackProfile, setBlackProfile] = useState<Profile | null>(null);

  // Fetch both player profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentGame) return;
      
      // Fetch white player profile
      if (currentGame.white_player_id) {
        const { data: whiteData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentGame.white_player_id)
          .maybeSingle();
        setWhiteProfile(whiteData as Profile);
      }

      // Fetch black player profile
      if (currentGame.black_player_id) {
        const { data: blackData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentGame.black_player_id)
          .maybeSingle();
        setBlackProfile(blackData as Profile);
        setOpponentProfile(blackData as Profile);
      }
    };

    fetchProfiles();
  }, [currentGame?.white_player_id, currentGame?.black_player_id]);

  // Play sounds on moves
  useEffect(() => {
    if (moveHistory.length > 0) {
      const lastMoveData = moveHistory[moveHistory.length - 1];
      if (lastMoveData.captured) {
        playCapture();
      } else {
        playMove();
      }
      
      if (isCheck) {
        setTimeout(() => playCheck(), 100);
      }
    }
  }, [moveHistory.length, isCheck, playMove, playCapture, playCheck]);

  // Handle game over
  useEffect(() => {
    if (currentGame?.status === 'completed') {
      playGameOver();
      
      const isWinner = currentGame.winner_id === user?.id;
      const isDraw = !currentGame.winner_id;
      
      // Determine winner name based on winner_id
      let winnerName: string | null = null;
      if (!isDraw && currentGame.winner_id) {
        if (currentGame.winner_id === currentGame.white_player_id) {
          winnerName = whiteProfile?.display_name || whiteProfile?.username || 'White';
        } else {
          winnerName = blackProfile?.display_name || blackProfile?.username || 'Black';
        }
      }
      
      setGameResult({
        winner: winnerName,
        reason: currentGame.result as GameResult['reason'] || 'checkmate',
        moveCount: moveHistory.length,
      });
      
      setTimeout(() => setShowResult(true), 500);
    }
  }, [currentGame?.status, currentGame?.winner_id, currentGame?.result, user?.id, whiteProfile, blackProfile, playGameOver, moveHistory.length]);

  const handleSquareClick = (square: Square) => {
    if (!isMyTurn) return;
    playClick();
    selectSquare(square);
  };

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  };

  const handleLeave = () => {
    leaveGame();
    onBack();
  };

  const handleRematch = async () => {
    setShowResult(false);
    setGameResult(null);
    await requestRematch();
  };

  const handleNewGame = () => {
    setShowResult(false);
    setGameResult(null);
    leaveGame();
    onBack();
  };

  if (!currentGame) {
    return null;
  }

  // Get player names from profiles
  const whiteName = whiteProfile?.display_name || whiteProfile?.username || 'Waiting...';
  const blackName = blackProfile?.display_name || blackProfile?.username || 'Waiting...';

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-8 items-start">
        {/* Left panel */}
        <div className="order-2 lg:order-1 space-y-4">
          <PlayerInfo
            name={blackName}
            color="b"
            isActive={currentGame.current_turn === 'b' && currentGame.status === 'in_progress'}
            timeRemaining={blackTimeRemaining}
            showTimer={!!currentGame.time_control}
          />
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleToggleSound}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={resignGame}
              disabled={currentGame.status !== 'in_progress'}
            >
              <Flag className="w-4 h-4" />
              Resign
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleLeave}
            >
              <ArrowLeft className="w-4 h-4" />
              Leave Game
            </Button>
          </div>
        </div>

        {/* Center - Chess board */}
        <div className="order-1 lg:order-2 flex flex-col items-center">
          <div className="w-full max-w-[min(90vw,500px)] lg:max-w-[500px]">
            <div className="mb-2 flex items-center justify-center gap-3">
              <ConnectionStatus isConnected={isRealtimeConnected} />
              {isMyTurn ? (
                <span className="text-green-500 font-medium">Your turn</span>
              ) : (
                <span className="text-muted-foreground">Waiting for opponent...</span>
              )}
            </div>
            <ChessBoard
              board={boardPosition}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              isCheck={isCheck}
              currentTurn={currentGame.current_turn as 'w' | 'b'}
              onSquareClick={handleSquareClick}
              disabled={!isMyTurn || currentGame.status !== 'in_progress'}
              flipped={playerColor === 'b'}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="order-3 space-y-4">
          <PlayerInfo
            name={whiteName}
            color="w"
            isActive={currentGame.current_turn === 'w' && currentGame.status === 'in_progress'}
            timeRemaining={whiteTimeRemaining}
            showTimer={!!currentGame.time_control}
          />
          
          <MoveHistory moves={moveHistory} />
        </div>
      </div>

      <GameResultModal
        isOpen={showResult}
        result={gameResult}
        onRestart={handleRematch}
        onNewGame={handleNewGame}
        isOnlineGame={true}
      />

      {/* In-game chat */}
      {user && currentGame.status === 'in_progress' && (
        <GameChat
          gameId={currentGame.id}
          currentUserId={user.id}
          opponentName={opponentProfile?.display_name || opponentProfile?.username || 'Opponent'}
        />
      )}
    </motion.div>
  );
};

export default OnlineGame;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ChessBoard from './ChessBoard';
import PlayerInfo from './PlayerInfo';
import MoveHistory from './MoveHistory';
import GameResultModal from './GameResultModal';
import GameChat from './GameChat';
import ConnectionStatus from './ConnectionStatus';
import DrawOffer from './DrawOffer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import { useAuth, Profile } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResult } from '@/types/chess';
import { Square } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import { Flag, ArrowLeft, Volume2, VolumeX, RotateCcw, Check, X } from 'lucide-react';

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
    isDrawOffered,
    isDrawReceived,
    rematchRequest,
    selectSquare,
    resignGame,
    leaveGame,
    requestRematch,
    acceptRematch,
    offerDraw,
    acceptDraw,
    declineDraw,
  } = useOnlineGame(user?.id);

  const { playMove, playCapture, playCheck, playGameOver, playClick, toggleSound, isSoundEnabled } = useSoundEffects();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [whiteProfile, setWhiteProfile] = useState<Profile | null>(null);
  const [blackProfile, setBlackProfile] = useState<Profile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Fetch player profiles when game or players change
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentGame) {
        setIsLoadingProfiles(false);
        return;
      }
      
      setIsLoadingProfiles(true);
      
      try {
        // Fetch white player profile
        if (currentGame.white_player_id) {
          const { data: whiteData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentGame.white_player_id)
            .single();
          if (whiteData) {
            setWhiteProfile(whiteData as Profile);
          }
        }

        // Fetch black player profile
        if (currentGame.black_player_id) {
          const { data: blackData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentGame.black_player_id)
            .single();
          if (blackData) {
            setBlackProfile(blackData as Profile);
          }
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [currentGame?.id, currentGame?.white_player_id, currentGame?.black_player_id]);

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
    if (currentGame?.status === 'completed' && !showResult) {
      playGameOver();
      
      const isDraw = !currentGame.winner_id;
      
      // Determine winner name
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
  }, [currentGame?.status, currentGame?.winner_id, currentGame?.result, whiteProfile, blackProfile, playGameOver, moveHistory.length, showResult]);

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

  const handleAcceptRematch = async () => {
    if (rematchRequest) {
      await acceptRematch(rematchRequest.id);
    }
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
  const whiteName = whiteProfile?.display_name || whiteProfile?.username || (currentGame.white_player_id ? 'Loading...' : 'Waiting...');
  const blackName = blackProfile?.display_name || blackProfile?.username || (currentGame.black_player_id ? 'Loading...' : 'Waiting...');

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
            name={playerColor === 'w' ? blackName : whiteName}
            color={playerColor === 'w' ? 'b' : 'w'}
            isActive={(playerColor === 'w' ? currentGame.current_turn === 'b' : currentGame.current_turn === 'w') && currentGame.status === 'in_progress'}
            timeRemaining={playerColor === 'w' ? blackTimeRemaining : whiteTimeRemaining}
            showTimer={!!currentGame.time_control}
          />
          
          <div className="space-y-2">
            {/* Rematch notification */}
            {rematchRequest && currentGame.status === 'completed' && (
              <Card className="border-primary/50 bg-primary/10">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-2">Rematch requested!</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={handleAcceptRematch}
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-1"
                      onClick={handleNewGame}
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <DrawOffer
              isOffering={isDrawOffered}
              isReceiving={isDrawReceived}
              onOffer={offerDraw}
              onAccept={acceptDraw}
              onDecline={declineDraw}
              disabled={currentGame.status !== 'in_progress'}
            />
            
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
              {currentGame.status === 'waiting' ? (
                <span className="text-muted-foreground">Waiting for opponent...</span>
              ) : isMyTurn ? (
                <span className="text-green-500 font-medium">Your turn</span>
              ) : (
                <span className="text-muted-foreground">Opponent's turn</span>
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
            name={playerColor === 'w' ? whiteName : blackName}
            color={playerColor === 'w' ? 'w' : 'b'}
            isActive={(playerColor === 'w' ? currentGame.current_turn === 'w' : currentGame.current_turn === 'b') && currentGame.status === 'in_progress'}
            timeRemaining={playerColor === 'w' ? whiteTimeRemaining : blackTimeRemaining}
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
        moves={moveHistory}
        whitePlayerName={whiteName}
        blackPlayerName={blackName}
      />

      {/* In-game chat */}
      {user && currentGame.status === 'in_progress' && (
        <GameChat
          gameId={currentGame.id}
          currentUserId={user.id}
          opponentName={playerColor === 'w' ? blackName : whiteName}
        />
      )}
    </motion.div>
  );
};

export default OnlineGame;

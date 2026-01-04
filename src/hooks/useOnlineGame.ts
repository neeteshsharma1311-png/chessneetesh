import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square, Move as ChessMove } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PieceColor, Move } from '@/types/chess';

export interface OnlineGame {
  id: string;
  white_player_id: string | null;
  black_player_id: string | null;
  status: string;
  game_type: string;
  fen: string;
  pgn: string | null;
  current_turn: string;
  winner_id: string | null;
  result: string | null;
  time_control: number | null;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export const useOnlineGame = (userId: string | undefined) => {
  const [chess] = useState(() => new Chess());
  const [currentGame, setCurrentGame] = useState<OnlineGame | null>(null);
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);
  const [boardPosition, setBoardPosition] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const updateBoardFromFen = useCallback((fen: string) => {
    chess.load(fen);
    setBoardPosition(chess.board());
  }, [chess]);

  // Check for any active games where user is a player
  useEffect(() => {
    if (!userId) return;

    const checkActiveGame = async () => {
      console.log('useOnlineGame: Checking for active games for user:', userId);
      
      const { data: games, error } = await supabase
        .from('online_games')
        .select('*')
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('useOnlineGame: Error fetching active games:', error);
        return;
      }

      console.log('useOnlineGame: Active games found:', games?.length || 0, games);

      if (games && games.length > 0) {
        const game = games[0];
        setCurrentGame(game as OnlineGame);
        const color = game.white_player_id === userId ? 'w' : 'b';
        setPlayerColor(color);
        console.log('useOnlineGame: Set player color to:', color, 'for game:', game.id);
        chess.load(game.fen);
        setBoardPosition(chess.board());
      }
    };

    checkActiveGame();
  }, [userId, chess]);

  // Subscribe to updates for the current game specifically
  // This ensures both players get notified when the game state changes
  useEffect(() => {
    if (!currentGame?.id || !userId) return;

    console.log('useOnlineGame: Setting up game subscription for:', currentGame.id, 'status:', currentGame.status);

    // Create a unique channel name to avoid conflicts
    const channelName = `game-updates-${currentGame.id}-${Date.now()}`;
    
    const gameChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_games',
          filter: `id=eq.${currentGame.id}`,
        },
        (payload) => {
          const updatedGame = payload.new as OnlineGame;
          console.log('useOnlineGame: Realtime update received:', {
            id: updatedGame.id,
            status: updatedGame.status,
            black_player: updatedGame.black_player_id,
            event: payload.eventType
          });
          
          // Force state update with new object reference
          setCurrentGame({...updatedGame});
          
          // Set player color
          if (updatedGame.white_player_id === userId) {
            setPlayerColor('w');
          } else if (updatedGame.black_player_id === userId) {
            setPlayerColor('b');
          }
          
          // Update board position
          if (updatedGame.fen) {
            chess.load(updatedGame.fen);
            setBoardPosition(chess.board());
          }
        }
      )
      .subscribe((status) => {
        console.log('useOnlineGame: Game channel status:', status, 'for game:', currentGame.id);
      });

    // Aggressive polling for waiting games to ensure state sync
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollGameState = async () => {
      const { data: game, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', currentGame.id)
        .single();
      
      if (!error && game) {
        const currentStatus = currentGame.status;
        const newStatus = game.status;
        
        if (newStatus !== currentStatus || game.black_player_id !== currentGame.black_player_id) {
          console.log('useOnlineGame: Polling detected state change:', {
            from: currentStatus,
            to: newStatus,
            black_player: game.black_player_id
          });
          
          setCurrentGame({...game} as OnlineGame);
          
          if (game.white_player_id === userId) {
            setPlayerColor('w');
          } else if (game.black_player_id === userId) {
            setPlayerColor('b');
          }
          
          if (game.fen) {
            chess.load(game.fen);
            setBoardPosition(chess.board());
          }
        }
      }
    };
    
    // Start polling immediately for waiting games
    if (currentGame.status === 'waiting') {
      console.log('useOnlineGame: Starting aggressive polling for waiting game');
      pollGameState(); // Poll immediately
      pollInterval = setInterval(pollGameState, 1500); // Poll every 1.5 seconds
    }

    return () => {
      console.log('useOnlineGame: Cleaning up game subscription');
      supabase.removeChannel(gameChannel);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentGame?.id, currentGame?.status, currentGame?.black_player_id, userId, chess]);

  // Subscribe to game moves for the current game
  useEffect(() => {
    if (!currentGame?.id) return;

    console.log('useOnlineGame: Subscribing to moves for game:', currentGame.id);

    const channel = supabase
      .channel(`game-moves-${currentGame.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${currentGame.id}`,
        },
        (payload) => {
          console.log('useOnlineGame: Move received:', payload.new);
          const move = payload.new as any;
          if (move.player_id !== userId) {
            // Opponent made a move
            chess.load(move.fen_after);
            setBoardPosition(chess.board());
            setLastMove({ from: move.from_square, to: move.to_square });
            setMoveHistory(prev => [...prev, {
              from: move.from_square,
              to: move.to_square,
              piece: 'p',
              san: move.san,
              flags: '',
            }]);
          }
        }
      )
      .subscribe((status) => {
        console.log('useOnlineGame: Moves subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('useOnlineGame: Unsubscribing from game moves:', currentGame.id);
      supabase.removeChannel(channel);
    };
  }, [currentGame?.id, userId, chess]);

  // Join a game by ID (when accepting an invite)
  const joinGameById = useCallback(async (gameId: string) => {
    if (!userId) return null;

    try {
      console.log('useOnlineGame: Joining game by ID:', gameId);
      
      // Small delay to ensure the database has been updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: game, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;

      console.log('useOnlineGame: Fetched game:', game.id, 'status:', game.status, 'black_player:', game.black_player_id);
      
      setCurrentGame(game as OnlineGame);
      setPlayerColor(game.white_player_id === userId ? 'w' : 'b');
      chess.load(game.fen);
      setBoardPosition(chess.board());

      return game;
    } catch (error) {
      console.error('Error joining game by ID:', error);
      return null;
    }
  }, [userId, chess]);

  const findRandomGame = useCallback(async () => {
    if (!userId) return null;
    setIsSearching(true);

    try {
      // First, check if there's a waiting game we can join
      const { data: waitingGames, error: fetchError } = await supabase
        .from('online_games')
        .select('*')
        .eq('status', 'waiting')
        .eq('game_type', 'random')
        .is('black_player_id', null)
        .neq('white_player_id', userId)
        .limit(1);

      if (fetchError) throw fetchError;

      if (waitingGames && waitingGames.length > 0) {
        // Join existing game as black
        const game = waitingGames[0];
        const { data: updatedGame, error: updateError } = await supabase
          .from('online_games')
          .update({
            black_player_id: userId,
            status: 'in_progress',
          })
          .eq('id', game.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setCurrentGame(updatedGame);
        setPlayerColor('b');
        chess.load(updatedGame.fen);
        setBoardPosition(chess.board());
        
        toast({
          title: "Game found!",
          description: "You're playing as Black. Good luck!",
        });

        setIsSearching(false);
        return updatedGame;
      }

      // No waiting games, create a new one
      const { data: newGame, error: createError } = await supabase
        .from('online_games')
        .insert({
          white_player_id: userId,
          status: 'waiting',
          game_type: 'random',
          fen: chess.fen(),
          time_control: 600,
          white_time_remaining: 600,
          black_time_remaining: 600,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentGame(newGame);
      setPlayerColor('w');
      
      toast({
        title: "Searching for opponent...",
        description: "Waiting for another player to join.",
      });

      setIsSearching(false);
      return newGame;
    } catch (error: any) {
      console.error('Error finding game:', error);
      toast({
        title: "Error",
        description: "Failed to find a game. Please try again.",
        variant: "destructive",
      });
      setIsSearching(false);
      return null;
    }
  }, [userId, chess, toast]);

  const createFriendGame = useCallback(async () => {
    if (!userId) return null;

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('useOnlineGame: Creating friend game with code:', inviteCode);
      
      const { data: newGame, error } = await supabase
        .from('online_games')
        .insert({
          white_player_id: userId,
          status: 'waiting',
          game_type: 'friend',
          fen: chess.fen(),
          invite_code: inviteCode,
          time_control: 600,
          white_time_remaining: 600,
          black_time_remaining: 600,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('useOnlineGame: Created friend game:', newGame.id);
      setCurrentGame(newGame);
      setPlayerColor('w');

      toast({
        title: "Game created!",
        description: `Share code: ${inviteCode}`,
      });

      return newGame;
    } catch (error: any) {
      console.error('Error creating friend game:', error);
      toast({
        title: "Error",
        description: "Failed to create game.",
        variant: "destructive",
      });
      return null;
    }
  }, [userId, chess, toast]);

  const joinFriendGame = useCallback(async (inviteCode: string) => {
    if (!userId) return null;
    setIsConnecting(true);

    try {
      console.log('useOnlineGame: Attempting to join with code:', inviteCode);
      
      const { data: games, error: fetchError } = await supabase
        .from('online_games')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'waiting')
        .is('black_player_id', null)
        .limit(1);

      if (fetchError) throw fetchError;

      console.log('useOnlineGame: Found waiting games:', games?.length || 0);

      if (!games || games.length === 0) {
        toast({
          title: "Game not found",
          description: "Invalid code or game already started.",
          variant: "destructive",
        });
        setIsConnecting(false);
        return null;
      }

      const game = games[0];

      if (game.white_player_id === userId) {
        toast({
          title: "Cannot join",
          description: "You cannot join your own game.",
          variant: "destructive",
        });
        setIsConnecting(false);
        return null;
      }

      console.log('useOnlineGame: Joining game:', game.id);
      
      const { data: updatedGame, error: updateError } = await supabase
        .from('online_games')
        .update({
          black_player_id: userId,
          status: 'in_progress',
        })
        .eq('id', game.id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('useOnlineGame: Successfully joined game:', updatedGame.id, 'status:', updatedGame.status);
      
      setCurrentGame(updatedGame);
      setPlayerColor('b');
      chess.load(updatedGame.fen);
      setBoardPosition(chess.board());

      toast({
        title: "Joined game!",
        description: "You're playing as Black.",
      });

      setIsConnecting(false);
      return updatedGame;
    } catch (error: any) {
      console.error('Error joining game:', error);
      toast({
        title: "Error",
        description: "Failed to join game.",
        variant: "destructive",
      });
      setIsConnecting(false);
      return null;
    }
  }, [userId, chess, toast]);

  const makeMove = useCallback(async (from: Square, to: Square) => {
    if (!currentGame || !userId || !playerColor) return false;
    if (chess.turn() !== playerColor) return false;

    try {
      const piece = chess.get(from);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      const move = chess.move({
        from,
        to,
        promotion: isPromotion ? 'q' : undefined,
      });

      if (!move) return false;

      const newFen = chess.fen();
      setBoardPosition(chess.board());
      setLastMove({ from, to });
      setSelectedSquare(null);
      setValidMoves([]);

      // Update game in database
      const { error: gameError } = await supabase
        .from('online_games')
        .update({
          fen: newFen,
          current_turn: chess.turn(),
          status: chess.isGameOver() ? 'completed' : 'in_progress',
          winner_id: chess.isCheckmate() ? (chess.turn() === 'w' ? currentGame.black_player_id : currentGame.white_player_id) : null,
          result: chess.isCheckmate() ? 'checkmate' : chess.isStalemate() ? 'stalemate' : chess.isDraw() ? 'draw' : null,
          completed_at: chess.isGameOver() ? new Date().toISOString() : null,
        })
        .eq('id', currentGame.id);

      if (gameError) throw gameError;

      // Insert move record
      const { error: moveError } = await supabase
        .from('game_moves')
        .insert({
          game_id: currentGame.id,
          player_id: userId,
          move_number: moveHistory.length + 1,
          from_square: from,
          to_square: to,
          san: move.san,
          fen_after: newFen,
        });

      if (moveError) throw moveError;

      const newMove: Move = {
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
        flags: move.flags,
      };
      setMoveHistory(prev => [...prev, newMove]);

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      // Revert the move
      chess.undo();
      setBoardPosition(chess.board());
      return false;
    }
  }, [currentGame, userId, playerColor, chess, moveHistory.length]);

  const getValidMoves = useCallback((square: Square): Square[] => {
    const moves = chess.moves({ square, verbose: true });
    return moves.map((m: ChessMove) => m.to as Square);
  }, [chess]);

  const selectSquare = useCallback((square: Square) => {
    if (!currentGame || currentGame.status !== 'in_progress') return;
    if (chess.turn() !== playerColor) return;

    const piece = chess.get(square);
    
    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      setValidMoves(getValidMoves(square));
      return;
    }

    if (selectedSquare && validMoves.includes(square)) {
      makeMove(selectedSquare, square);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [currentGame, chess, playerColor, selectedSquare, validMoves, getValidMoves, makeMove]);

  const resignGame = useCallback(async () => {
    if (!currentGame || !userId) return;

    try {
      const winnerId = playerColor === 'w' ? currentGame.black_player_id : currentGame.white_player_id;
      
      await supabase
        .from('online_games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          result: 'resignation',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentGame.id);

      toast({
        title: "Game Over",
        description: "You resigned. Better luck next time!",
      });
    } catch (error) {
      console.error('Error resigning:', error);
    }
  }, [currentGame, userId, playerColor, toast]);

  const leaveGame = useCallback(async () => {
    if (!currentGame) return;

    if (currentGame.status === 'waiting') {
      // Cancel the game
      await supabase
        .from('online_games')
        .update({ status: 'abandoned' })
        .eq('id', currentGame.id);
    }

    setCurrentGame(null);
    setPlayerColor(null);
    chess.reset();
    setBoardPosition(chess.board());
    setMoveHistory([]);
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
  }, [currentGame, chess]);

  // Request rematch with the same opponent
  const requestRematch = useCallback(async () => {
    if (!currentGame || !userId) return null;

    try {
      const opponentId = playerColor === 'w' 
        ? currentGame.black_player_id 
        : currentGame.white_player_id;

      if (!opponentId) {
        toast({
          title: "Cannot rematch",
          description: "Opponent not found.",
          variant: "destructive",
        });
        return null;
      }

      // Create new game with colors swapped
      const { data: newGame, error } = await supabase
        .from('online_games')
        .insert({
          white_player_id: currentGame.black_player_id, // Swap colors
          black_player_id: currentGame.white_player_id,
          status: 'in_progress',
          game_type: currentGame.game_type,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          time_control: currentGame.time_control,
          white_time_remaining: currentGame.time_control,
          black_time_remaining: currentGame.time_control,
        })
        .select()
        .single();

      if (error) throw error;

      // Reset local state
      chess.reset();
      setBoardPosition(chess.board());
      setMoveHistory([]);
      setLastMove(null);
      setSelectedSquare(null);
      setValidMoves([]);
      
      // Set new game
      setCurrentGame(newGame as OnlineGame);
      const newColor = newGame.white_player_id === userId ? 'w' : 'b';
      setPlayerColor(newColor);

      toast({
        title: "Rematch started!",
        description: `You're now playing as ${newColor === 'w' ? 'White' : 'Black'}.`,
      });

      return newGame;
    } catch (error) {
      console.error('Error creating rematch:', error);
      toast({
        title: "Error",
        description: "Failed to create rematch.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentGame, userId, playerColor, chess, toast]);

  return {
    currentGame,
    playerColor,
    boardPosition,
    selectedSquare,
    validMoves,
    lastMove,
    moveHistory,
    isConnecting,
    isSearching,
    isMyTurn: currentGame?.status === 'in_progress' && chess.turn() === playerColor,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isGameOver: chess.isGameOver(),
    findRandomGame,
    createFriendGame,
    joinFriendGame,
    joinGameById,
    selectSquare,
    resignGame,
    leaveGame,
    requestRematch,
  };
};

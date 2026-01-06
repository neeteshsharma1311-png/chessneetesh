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
  draw_offered_by: string | null;
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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [whiteTimeRemaining, setWhiteTimeRemaining] = useState<number>(600);
  const [blackTimeRemaining, setBlackTimeRemaining] = useState<number>(600);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const opponentJoinedSoundRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sound for opponent joining
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    opponentJoinedSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS4WHYaY0t23pGEaG2qJqNC7m2sZDCBmj7fOxJ11MBEjU4CswMSohDwbHD1vl6zAuZF/QyodNGWMqLy4pZZ3SiQeO2mRrLq0pZmBeEQcIkBxlKy4sKKYhX5IHiI9bZGruLKknot+RRohQHGUrLmwoZiEf0oeIz9xk6u4sKKZhX9KHiI+b5OsuLKknoqARxwgP2+VrLqyop2KgEccID5ulq26sqKdinBHHCE+cJWtubKinYuCSBsgPm6Wrrqyop2LgkgbID5tl626sqOdi4JIHCA+bZauubOjnouCSBwgPm2WrrqzoJ2LgEocID5tl626s6OdioFKHCI9bZauubSjnoqBSBwjPG2Xrrq0o56KgUgcIzxtl666tKSeioFIHCM8bZeuubSknop/SBwkO22Xrrq0pJ6KgEgcJDttl667taSei4BJHCM7bpeuurdQS01PU0gcJDpul667u3A8Oz1AR0gcJDlvl666uz8wLzE1PD9IHCU4b5iuu7xLMC0wND0/SRsjOHCYrrq8UDAsMDM8QUobIjhwmK66vFAwLDA0PEFLGiM3cZitubtSMCwwMzxBSxwiN3CYrLm8UjAsMDQ7QUwaIThwmKy5vFIwLDEzPD9MGyA4cZisub1RMC0wNDtATBogOHGYrLm8VDAtMDU6P00cHzhwma26ulYwLTA1Oj9OGx84cJqturpXMS0wNTk+ThsdN3GZrbu5WjAuLzY5PU8cHTdymbO6uF0wLi82OT1PHBw3cpm0ubleMS0wNjk9UBwcNnKatLq4XzEtMDY5PVAYHDZ0mbS7t2ExLTA2Oj1QFxs2dJq0u7ZjMS0wNzo9Txgb');
  }, []);

  const updateBoardFromFen = useCallback((fen: string) => {
    chess.load(fen);
    setBoardPosition(chess.board());
  }, [chess]);

  // End game due to timeout
  const endGameByTimeout = useCallback(async (losingColor: 'w' | 'b') => {
    if (!currentGame || currentGame.status !== 'in_progress') return;
    
    const winnerId = losingColor === 'w' ? currentGame.black_player_id : currentGame.white_player_id;
    
    try {
      await supabase
        .from('online_games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          result: 'timeout',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentGame.id);

      toast({
        title: "Time's up!",
        description: losingColor === playerColor ? "You ran out of time." : "Opponent ran out of time!",
      });
    } catch (error) {
      console.error('Error ending game by timeout:', error);
    }
  }, [currentGame, playerColor, toast]);

  // Timer countdown effect - runs only when game is in progress
  useEffect(() => {
    // Clear any existing interval first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!currentGame || currentGame.status !== 'in_progress' || !currentGame.time_control) {
      return;
    }

    // Start the countdown interval
    timerIntervalRef.current = setInterval(() => {
      const currentTurn = currentGame.current_turn;
      
      if (currentTurn === 'w') {
        setWhiteTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            endGameByTimeout('w');
          }
          return newTime;
        });
      } else {
        setBlackTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            endGameByTimeout('b');
          }
          return newTime;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentGame?.id, currentGame?.status, currentGame?.time_control, currentGame?.current_turn, endGameByTimeout]);

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
        
        // Initialize timers from database
        if (game.white_time_remaining != null) {
          setWhiteTimeRemaining(game.white_time_remaining);
        } else if (game.time_control) {
          setWhiteTimeRemaining(game.time_control);
        }
        if (game.black_time_remaining != null) {
          setBlackTimeRemaining(game.black_time_remaining);
        } else if (game.time_control) {
          setBlackTimeRemaining(game.time_control);
        }
      }
    };

    checkActiveGame();
  }, [userId, chess]);

  // Subscribe to updates for the current game specifically
  // This ensures both players get notified when the game state changes
  useEffect(() => {
    if (!currentGame?.id || !userId) {
      setIsRealtimeConnected(false);
      return;
    }

    console.log('useOnlineGame: Setting up game subscription for:', currentGame.id, 'status:', currentGame.status);

    // Create a unique channel name
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
            current_turn: updatedGame.current_turn,
            event: payload.eventType
          });
          
          // Check if opponent joined (game went from waiting to in_progress)
          if (currentGame.status === 'waiting' && updatedGame.status === 'in_progress' && updatedGame.black_player_id) {
            try {
              opponentJoinedSoundRef.current?.play();
            } catch (e) {
              console.log('Could not play sound:', e);
            }
            toast({
              title: "Opponent joined!",
              description: "The game is starting now!",
            });
          }
          
          // Always update game state
          setCurrentGame({...updatedGame});
          
          // Set player color based on updated game
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
          
          // Update timers
          if (updatedGame.white_time_remaining != null) {
            setWhiteTimeRemaining(updatedGame.white_time_remaining);
          }
          if (updatedGame.black_time_remaining != null) {
            setBlackTimeRemaining(updatedGame.black_time_remaining);
          }
        }
      )
      .subscribe((status) => {
        console.log('useOnlineGame: Game channel status:', status, 'for game:', currentGame.id);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Polling for waiting games
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollGameState = async () => {
      const { data: game, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', currentGame.id)
        .single();
      
      if (!error && game) {
        // Check for any changes
        const hasChanges = 
          game.status !== currentGame.status || 
          game.black_player_id !== currentGame.black_player_id ||
          game.fen !== currentGame.fen ||
          game.current_turn !== currentGame.current_turn;
          
        if (hasChanges) {
          console.log('useOnlineGame: Polling detected state change:', {
            status: game.status,
            black_player: game.black_player_id,
            current_turn: game.current_turn
          });
          
          // Play sound if opponent joined
          if (currentGame.status === 'waiting' && game.status === 'in_progress' && game.black_player_id) {
            try {
              opponentJoinedSoundRef.current?.play();
            } catch (e) {
              console.log('Could not play sound:', e);
            }
            toast({
              title: "Opponent joined!",
              description: "The game is starting now!",
            });
          }
          
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
          
          // Sync timers from opponent's move
          if (game.white_time_remaining != null) {
            setWhiteTimeRemaining(game.white_time_remaining);
          }
          if (game.black_time_remaining != null) {
            setBlackTimeRemaining(game.black_time_remaining);
          }
        }
      }
    };
    
    // Poll for all games (not just waiting) to catch state changes
    console.log('useOnlineGame: Starting polling for game:', currentGame.id);
    pollGameState();
    pollInterval = setInterval(pollGameState, 2000);

    return () => {
      console.log('useOnlineGame: Cleaning up game subscription');
      supabase.removeChannel(gameChannel);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentGame?.id, userId, chess, toast]);

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

      // Update game in database with timer sync
      const { error: gameError } = await supabase
        .from('online_games')
        .update({
          fen: newFen,
          current_turn: chess.turn(),
          white_time_remaining: whiteTimeRemaining,
          black_time_remaining: blackTimeRemaining,
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

  // Draw offer functionality
  const offerDraw = useCallback(async () => {
    if (!currentGame || !userId || currentGame.status !== 'in_progress') return;
    
    try {
      await supabase
        .from('online_games')
        .update({ draw_offered_by: userId })
        .eq('id', currentGame.id);
        
      toast({
        title: "Draw offered",
        description: "Waiting for opponent's response...",
      });
    } catch (error) {
      console.error('Error offering draw:', error);
    }
  }, [currentGame, userId, toast]);

  const acceptDraw = useCallback(async () => {
    if (!currentGame || currentGame.status !== 'in_progress') return;
    
    try {
      await supabase
        .from('online_games')
        .update({
          status: 'completed',
          result: 'draw',
          winner_id: null,
          draw_offered_by: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentGame.id);
        
      toast({
        title: "Game drawn",
        description: "Both players agreed to a draw.",
      });
    } catch (error) {
      console.error('Error accepting draw:', error);
    }
  }, [currentGame, toast]);

  const declineDraw = useCallback(async () => {
    if (!currentGame) return;
    
    try {
      await supabase
        .from('online_games')
        .update({ draw_offered_by: null })
        .eq('id', currentGame.id);
        
      toast({
        title: "Draw declined",
        description: "The game continues.",
      });
    } catch (error) {
      console.error('Error declining draw:', error);
    }
  }, [currentGame, toast]);

  const isDrawOffered = currentGame?.draw_offered_by === userId;
  const isDrawReceived = currentGame?.draw_offered_by !== null && currentGame?.draw_offered_by !== userId;

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
    isRealtimeConnected,
    whiteTimeRemaining,
    blackTimeRemaining,
    isMyTurn: currentGame?.status === 'in_progress' && chess.turn() === playerColor,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isGameOver: chess.isGameOver(),
    isDrawOffered,
    isDrawReceived,
    findRandomGame,
    createFriendGame,
    joinFriendGame,
    joinGameById,
    selectSquare,
    resignGame,
    leaveGame,
    requestRematch,
    offerDraw,
    acceptDraw,
    declineDraw,
  };
};

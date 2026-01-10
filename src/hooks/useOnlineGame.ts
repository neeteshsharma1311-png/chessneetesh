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

export interface RematchRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  original_game_id: string;
  new_game_id: string | null;
  status: string;
  created_at: string;
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
  const [rematchRequest, setRematchRequest] = useState<RematchRequest | null>(null);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const opponentJoinedSoundRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTurnRef = useRef<string>('w');

  // Keep current turn in ref for timer interval
  useEffect(() => {
    if (currentGame?.current_turn) {
      currentTurnRef.current = currentGame.current_turn;
    }
  }, [currentGame?.current_turn]);

  // Initialize sound for opponent joining
  useEffect(() => {
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

  // Timer countdown effect - uses ref to avoid stale closure and syncs with database
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!currentGame || currentGame.status !== 'in_progress' || !currentGame.time_control) {
      return;
    }

    // Initialize timers from game state if not already set
    if (currentGame.white_time_remaining != null && currentGame.black_time_remaining != null) {
      setWhiteTimeRemaining(currentGame.white_time_remaining);
      setBlackTimeRemaining(currentGame.black_time_remaining);
    }

    timerIntervalRef.current = setInterval(() => {
      const turn = currentTurnRef.current;
      
      if (turn === 'w') {
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
  }, [currentGame?.id, currentGame?.status, currentGame?.time_control, currentGame?.white_time_remaining, currentGame?.black_time_remaining, endGameByTimeout]);

  // Load existing move history when joining a game
  const loadMoveHistory = useCallback(async (gameId: string) => {
    const { data: moves, error } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    if (!error && moves) {
      const history: Move[] = moves.map(m => ({
        from: m.from_square as Square,
        to: m.to_square as Square,
        piece: 'p',
        san: m.san,
        flags: '',
      }));
      setMoveHistory(history);
      
      if (moves.length > 0) {
        const lastMoveData = moves[moves.length - 1];
        setLastMove({ from: lastMoveData.from_square as Square, to: lastMoveData.to_square as Square });
      }
    }
  }, []);

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

        // Load move history
        if (game.status === 'in_progress') {
          loadMoveHistory(game.id);
        }
      }
    };

    checkActiveGame();
  }, [userId, chess, loadMoveHistory]);

  // Subscribe to updates for the current game
  useEffect(() => {
    if (!currentGame?.id || !userId) {
      setIsRealtimeConnected(false);
      return;
    }

    console.log('useOnlineGame: Setting up game subscription for:', currentGame.id, 'status:', currentGame.status);

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
          
          // Check if opponent joined
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
          
          // Update current turn ref immediately
          currentTurnRef.current = updatedGame.current_turn;
          
          // Update game state
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
          
          // Sync timers
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

    // Aggressive polling for waiting games and turn changes - faster interval
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollGameState = async () => {
      const { data: game, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', currentGame.id)
        .single();
      
      if (!error && game) {
        const hasChanges = 
          game.status !== currentGame.status || 
          game.black_player_id !== currentGame.black_player_id ||
          game.fen !== currentGame.fen ||
          game.current_turn !== currentGame.current_turn ||
          game.white_time_remaining !== currentGame.white_time_remaining ||
          game.black_time_remaining !== currentGame.black_time_remaining;
          
        if (hasChanges) {
          console.log('useOnlineGame: Polling detected state change:', {
            status: game.status,
            black_player: game.black_player_id,
            current_turn: game.current_turn,
            white_time: game.white_time_remaining,
            black_time: game.black_time_remaining
          });
          
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
          
          // Update current turn ref
          currentTurnRef.current = game.current_turn;
          
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
          
          // Sync timers from database - only update if significantly different
          if (game.white_time_remaining != null) {
            setWhiteTimeRemaining(prev => {
              const diff = Math.abs(prev - game.white_time_remaining);
              // Only sync if difference is more than 2 seconds (to avoid flicker)
              return diff > 2 ? game.white_time_remaining : prev;
            });
          }
          if (game.black_time_remaining != null) {
            setBlackTimeRemaining(prev => {
              const diff = Math.abs(prev - game.black_time_remaining);
              return diff > 2 ? game.black_time_remaining : prev;
            });
          }
        }
      }
    };
    
    console.log('useOnlineGame: Starting polling for game:', currentGame.id);
    pollGameState();
    // More frequent polling (every second) for better sync
    pollInterval = setInterval(pollGameState, 1000);

    return () => {
      console.log('useOnlineGame: Cleaning up game subscription');
      supabase.removeChannel(gameChannel);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentGame?.id, userId, chess, toast]);

  // Subscribe to game moves
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

  // Join a game by ID
  const joinGameById = useCallback(async (gameId: string) => {
    if (!userId) return null;

    try {
      console.log('useOnlineGame: Joining game by ID:', gameId);
      
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

      // Load move history
      if (game.status === 'in_progress') {
        loadMoveHistory(game.id);
      }

      return game;
    } catch (error) {
      console.error('Error joining game by ID:', error);
      return null;
    }
  }, [userId, chess, loadMoveHistory]);

  const findRandomGame = useCallback(async (timeControl: number | null = 600) => {
    if (!userId) return null;
    setIsSearching(true);

    try {
      // Build query for matching games
      let query = supabase
        .from('online_games')
        .select('*')
        .eq('status', 'waiting')
        .eq('game_type', 'random')
        .is('black_player_id', null)
        .neq('white_player_id', userId);
      
      if (timeControl === null) {
        query = query.is('time_control', null);
      } else {
        query = query.eq('time_control', timeControl);
      }

      const { data: waitingGames, error: fetchError } = await query.limit(1);

      if (fetchError) throw fetchError;

      if (waitingGames && waitingGames.length > 0) {
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
        
        // Initialize timers only if timed game
        if (updatedGame.time_control) {
          setWhiteTimeRemaining(updatedGame.white_time_remaining ?? updatedGame.time_control);
          setBlackTimeRemaining(updatedGame.black_time_remaining ?? updatedGame.time_control);
        }
        
        toast({
          title: "Game found!",
          description: "You're playing as Black. Good luck!",
        });

        setIsSearching(false);
        return updatedGame;
      }

      // Create new game with selected time control
      const { data: newGame, error: createError } = await supabase
        .from('online_games')
        .insert({
          white_player_id: userId,
          status: 'waiting',
          game_type: 'random',
          fen: chess.fen(),
          time_control: timeControl,
          white_time_remaining: timeControl,
          black_time_remaining: timeControl,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentGame(newGame);
      setPlayerColor('w');
      if (timeControl) {
        setWhiteTimeRemaining(timeControl);
        setBlackTimeRemaining(timeControl);
      }
      
      const timeLabel = timeControl === null ? 'Untimed' : timeControl === 600 ? 'Rapid (10 min)' : timeControl === 900 ? 'Classical (15 min)' : 'Classical (30 min)';
      toast({
        title: "Searching for opponent...",
        description: `${timeLabel} game. Waiting for another player.`,
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

  const createFriendGame = useCallback(async (timeControl: number = 600) => {
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
          time_control: timeControl,
          white_time_remaining: timeControl,
          black_time_remaining: timeControl,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('useOnlineGame: Created friend game:', newGame.id);
      setCurrentGame(newGame);
      setPlayerColor('w');
      setWhiteTimeRemaining(timeControl);
      setBlackTimeRemaining(timeControl);

      const timeLabel = timeControl === 600 ? 'Rapid (10 min)' : timeControl === 900 ? 'Classical (15 min)' : 'Classical (30 min)';
      toast({
        title: "Game created!",
        description: `Share code: ${inviteCode} • ${timeLabel}`,
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
      
      // Initialize timers
      if (updatedGame.time_control) {
        setWhiteTimeRemaining(updatedGame.white_time_remaining ?? updatedGame.time_control);
        setBlackTimeRemaining(updatedGame.black_time_remaining ?? updatedGame.time_control);
      }

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
      const newTurn = chess.turn();
      
      // Update ref immediately
      currentTurnRef.current = newTurn;
      
      setBoardPosition(chess.board());
      setLastMove({ from, to });
      setSelectedSquare(null);
      setValidMoves([]);

      // Update game in database with timer sync
      const { error: gameError } = await supabase
        .from('online_games')
        .update({
          fen: newFen,
          current_turn: newTurn,
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
      chess.undo();
      setBoardPosition(chess.board());
      return false;
    }
  }, [currentGame, userId, playerColor, chess, moveHistory.length, whiteTimeRemaining, blackTimeRemaining]);

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
    setRematchRequest(null);
  }, [currentGame, chess]);

  // Request rematch - notifies opponent
  const requestRematch = useCallback(async () => {
    if (!currentGame || !userId) return null;

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

    try {
      // Create rematch request via game_invites table
      const { data: invite, error: inviteError } = await supabase
        .from('game_invites')
        .insert({
          from_user_id: userId,
          to_user_id: opponentId,
          game_id: currentGame.id,
          time_control: currentGame.time_control || 600,
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      toast({
        title: "Rematch requested!",
        description: "Waiting for opponent to accept...",
      });

      return invite;
    } catch (error) {
      console.error('Error requesting rematch:', error);
      toast({
        title: "Error",
        description: "Failed to request rematch.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentGame, userId, playerColor, toast]);

  // Accept rematch and start new game
  const acceptRematch = useCallback(async (inviteId: string) => {
    if (!userId || !currentGame) return null;

    try {
      // Get the invite details
      const { data: invite, error: fetchError } = await supabase
        .from('game_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (fetchError || !invite) throw fetchError || new Error('Invite not found');

      // Create new game with colors swapped
      const { data: newGame, error: gameError } = await supabase
        .from('online_games')
        .insert({
          white_player_id: invite.to_user_id,  // Swap colors
          black_player_id: invite.from_user_id,
          status: 'in_progress',
          game_type: 'rematch',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          time_control: invite.time_control || 600,
          white_time_remaining: invite.time_control || 600,
          black_time_remaining: invite.time_control || 600,
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Update invite
      await supabase
        .from('game_invites')
        .update({ 
          status: 'accepted',
          game_id: newGame.id,
        })
        .eq('id', inviteId);

      // Reset and start new game
      chess.reset();
      setBoardPosition(chess.board());
      setMoveHistory([]);
      setLastMove(null);
      setSelectedSquare(null);
      setValidMoves([]);
      
      setCurrentGame(newGame as OnlineGame);
      const newColor = newGame.white_player_id === userId ? 'w' : 'b';
      setPlayerColor(newColor);
      setWhiteTimeRemaining(newGame.time_control || 600);
      setBlackTimeRemaining(newGame.time_control || 600);

      toast({
        title: "Rematch started!",
        description: `You're now playing as ${newColor === 'w' ? 'White' : 'Black'}.`,
      });

      return newGame;
    } catch (error) {
      console.error('Error accepting rematch:', error);
      toast({
        title: "Error",
        description: "Failed to start rematch.",
        variant: "destructive",
      });
      return null;
    }
  }, [userId, currentGame, chess, toast]);

  // Listen for rematch invites
  useEffect(() => {
    if (!userId || !currentGame?.id) return;

    const channel = supabase
      .channel(`rematch-invites-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invites',
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          const invite = payload.new as any;
          // Check if this is a rematch for our current game
          if (invite.game_id === currentGame.id && invite.status === 'pending') {
            toast({
              title: "Rematch requested!",
              description: "Your opponent wants a rematch.",
              action: undefined,
            });
            setRematchRequest(invite);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invites',
          filter: `from_user_id=eq.${userId}`,
        },
        async (payload) => {
          const invite = payload.new as any;
          if (invite.status === 'accepted' && invite.game_id) {
            // Opponent accepted, join the new game
            const { data: game } = await supabase
              .from('online_games')
              .select('*')
              .eq('id', invite.game_id)
              .single();

            if (game) {
              chess.reset();
              setBoardPosition(chess.board());
              setMoveHistory([]);
              setLastMove(null);
              setSelectedSquare(null);
              setValidMoves([]);
              
              setCurrentGame(game as OnlineGame);
              const newColor = game.white_player_id === userId ? 'w' : 'b';
              setPlayerColor(newColor);
              setWhiteTimeRemaining(game.time_control || 600);
              setBlackTimeRemaining(game.time_control || 600);

              toast({
                title: "Rematch accepted!",
                description: `You're now playing as ${newColor === 'w' ? 'White' : 'Black'}.`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentGame?.id, chess, toast]);

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
    rematchRequest,
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
    acceptRematch,
    offerDraw,
    acceptDraw,
    declineDraw,
  };
};

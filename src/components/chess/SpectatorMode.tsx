import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Chess, Square } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import ChessBoard from './ChessBoard';
import PlayerInfo from './PlayerInfo';
import MoveHistory from './MoveHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Users, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import { Move } from '@/types/chess';

interface LiveGame {
  id: string;
  status: string;
  fen: string;
  current_turn: string;
  white_player_id: string | null;
  black_player_id: string | null;
  time_control: number | null;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  created_at: string;
  white_profile?: { username: string; display_name: string | null; rating: number };
  black_profile?: { username: string; display_name: string | null; rating: number };
}

interface SpectatorModeProps {
  onBack: () => void;
}

const SpectatorMode: React.FC<SpectatorModeProps> = ({ onBack }) => {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [chess] = useState(() => new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.board());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live games
  const fetchLiveGames = useCallback(async () => {
    const { data: games, error } = await supabase
      .from('online_games')
      .select('*')
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching live games:', error);
      return;
    }

    // Fetch player profiles
    const playerIds = new Set<string>();
    games?.forEach(game => {
      if (game.white_player_id) playerIds.add(game.white_player_id);
      if (game.black_player_id) playerIds.add(game.black_player_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, rating')
      .in('user_id', Array.from(playerIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const gamesWithProfiles = games?.map(game => ({
      ...game,
      white_profile: game.white_player_id ? profileMap.get(game.white_player_id) : undefined,
      black_profile: game.black_player_id ? profileMap.get(game.black_player_id) : undefined,
    })) || [];

    setLiveGames(gamesWithProfiles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLiveGames();
    const interval = setInterval(fetchLiveGames, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveGames]);

  // Subscribe to selected game updates
  useEffect(() => {
    if (!selectedGame) return;

    chess.load(selectedGame.fen);
    setBoardPosition(chess.board());

    // Fetch move history
    const fetchMoves = async () => {
      const { data: moves } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', selectedGame.id)
        .order('move_number', { ascending: true });

      if (moves && moves.length > 0) {
        const history: Move[] = moves.map(m => ({
          from: m.from_square,
          to: m.to_square,
          piece: 'p',
          san: m.san,
          flags: '',
        }));
        setMoveHistory(history);
        
        const lastMoveData = moves[moves.length - 1];
        setLastMove({ from: lastMoveData.from_square as Square, to: lastMoveData.to_square as Square });
      }
    };
    fetchMoves();

    const channel = supabase
      .channel(`spectate-${selectedGame.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_games',
          filter: `id=eq.${selectedGame.id}`,
        },
        (payload) => {
          const updatedGame = payload.new as LiveGame;
          setSelectedGame(prev => prev ? { ...prev, ...updatedGame } : null);
          chess.load(updatedGame.fen);
          setBoardPosition(chess.board());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${selectedGame.id}`,
        },
        (payload) => {
          const move = payload.new as any;
          setLastMove({ from: move.from_square, to: move.to_square });
          setMoveHistory(prev => [...prev, {
            from: move.from_square,
            to: move.to_square,
            piece: 'p',
            san: move.san,
            flags: '',
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGame?.id, chess]);

  if (selectedGame) {
    const whiteName = selectedGame.white_profile?.display_name || selectedGame.white_profile?.username || 'White';
    const blackName = selectedGame.black_profile?.display_name || selectedGame.black_profile?.username || 'Black';

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-7xl mx-auto"
      >
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedGame(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
          <Badge variant="outline" className="gap-1">
            <Eye className="w-3 h-3" />
            Spectating
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-8 items-start">
          {/* Left panel */}
          <div className="order-2 lg:order-1 space-y-4">
            <PlayerInfo
              name={blackName}
              color="b"
              isActive={selectedGame.current_turn === 'b'}
              timeRemaining={selectedGame.black_time_remaining || 0}
              showTimer={!!selectedGame.time_control}
            />
          </div>

          {/* Center - Chess board */}
          <div className="order-1 lg:order-2 flex flex-col items-center">
            <div className="w-full max-w-[min(90vw,500px)] lg:max-w-[500px]">
              <ChessBoard
                board={boardPosition}
                selectedSquare={null}
                validMoves={[]}
                lastMove={lastMove}
                isCheck={chess.isCheck()}
                currentTurn={selectedGame.current_turn as 'w' | 'b'}
                onSquareClick={() => {}}
                disabled={true}
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="order-3 space-y-4">
            <PlayerInfo
              name={whiteName}
              color="w"
              isActive={selectedGame.current_turn === 'w'}
              timeRemaining={selectedGame.white_time_remaining || 0}
              showTimer={!!selectedGame.time_control}
            />
            <MoveHistory moves={moveHistory} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="glass-panel border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Live Games
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchLiveGames}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : liveGames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No live games at the moment</p>
              <p className="text-sm">Check back later to spectate games!</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {liveGames.map((game) => {
                  const whiteName = game.white_profile?.display_name || game.white_profile?.username || 'White';
                  const blackName = game.black_profile?.display_name || game.black_profile?.username || 'Black';
                  const whiteRating = game.white_profile?.rating || 1200;
                  const blackRating = game.black_profile?.rating || 1200;

                  return (
                    <motion.div
                      key={game.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors border border-transparent hover:border-primary/30"
                      onClick={() => setSelectedGame(game)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-white border border-border" />
                          <div>
                            <p className="font-medium">{whiteName}</p>
                            <p className="text-xs text-muted-foreground">{whiteRating}</p>
                          </div>
                        </div>
                        <span className="text-muted-foreground font-bold">vs</span>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-right">{blackName}</p>
                            <p className="text-xs text-muted-foreground text-right">{blackRating}</p>
                          </div>
                          <div className="w-3 h-3 rounded-full bg-gray-800 border border-border" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {game.time_control && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {Math.floor(game.time_control / 60)}m
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {game.current_turn === 'w' ? "White's turn" : "Black's turn"}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SpectatorMode;
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Crown,
  Swords,
  Plus,
  Play,
  Medal,
  Star,
  Target,
  Loader2,
  ChevronRight,
  Gift
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  time_control: number;
  max_players: number;
  status: 'registration' | 'in_progress' | 'completed' | 'cancelled';
  current_round: number;
  total_rounds: number;
  prize_pool: {
    first: string;
    second: string;
    third: string;
  };
  created_by: string;
  winner_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  eliminated: boolean;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    rating: number;
  };
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  white_player_id: string | null;
  black_player_id: string | null;
  game_id: string | null;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
}

interface TournamentModeProps {
  onBack: () => void;
  onJoinGame?: (gameId: string) => void;
}

const TournamentMode: React.FC<TournamentModeProps> = ({ onBack, onJoinGame }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my'>('browse');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create tournament form state
  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    timeControl: 600,
    maxPlayers: 8
  });

  // Fetch tournaments
  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    
    const { data: allTournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['registration', 'in_progress'])
      .order('created_at', { ascending: false });

    if (!error && allTournaments) {
      setTournaments(allTournaments as unknown as Tournament[]);
    }

    if (user) {
      const { data: userTournaments } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .eq('user_id', user.id);

      if (userTournaments) {
        const tournamentIds = userTournaments.map(t => t.tournament_id);
        const { data: myT } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', tournamentIds)
          .order('created_at', { ascending: false });
        
        if (myT) {
          setMyTournaments(myT as unknown as Tournament[]);
        }
      }
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // Fetch tournament details
  const fetchTournamentDetails = useCallback(async (tournamentId: string) => {
    // Fetch participants with profiles
    const { data: participantsData } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('score', { ascending: false });

    if (participantsData) {
      // Fetch profiles for each participant
      const userIds = participantsData.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, rating')
        .in('user_id', userIds);

      const participantsWithProfiles = participantsData.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.user_id === p.user_id)
      }));

      setParticipants(participantsWithProfiles as Participant[]);
    }

    // Fetch matches
    const { data: matchesData } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true });

    if (matchesData) {
      setMatches(matchesData as TournamentMatch[]);
    }
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentDetails(selectedTournament.id);
    }
  }, [selectedTournament, fetchTournamentDetails]);

  // Create tournament
  const handleCreateTournament = async () => {
    if (!user || !newTournament.name.trim()) return;

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: newTournament.name.trim(),
          description: newTournament.description.trim() || null,
          time_control: newTournament.timeControl,
          max_players: newTournament.maxPlayers,
          created_by: user.id,
          total_rounds: Math.ceil(Math.log2(newTournament.maxPlayers))
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as creator
      await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: data.id,
          user_id: user.id,
          seed: 1
        });

      toast({
        title: "Tournament Created!",
        description: "Share the link to invite players."
      });

      setNewTournament({ name: '', description: '', timeControl: 600, maxPlayers: 8 });
      setActiveTab('browse');
      fetchTournaments();
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Join tournament
  const handleJoinTournament = async (tournament: Tournament) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join tournaments.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast({
          title: "Already Joined",
          description: "You're already in this tournament."
        });
        setSelectedTournament(tournament);
        setIsJoining(false);
        return;
      }

      // Get current participant count
      const { count } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);

      if (count && count >= tournament.max_players) {
        toast({
          title: "Tournament Full",
          description: "This tournament has reached maximum capacity.",
          variant: "destructive"
        });
        setIsJoining(false);
        return;
      }

      await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          seed: (count || 0) + 1
        });

      toast({
        title: "Joined Tournament!",
        description: `You've joined ${tournament.name}.`
      });

      setSelectedTournament(tournament);
      fetchTournaments();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({
        title: "Error",
        description: "Failed to join tournament.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Start tournament (for creator)
  const handleStartTournament = async () => {
    if (!selectedTournament || !user || selectedTournament.created_by !== user.id) return;

    if (participants.length < 2) {
      toast({
        title: "Not Enough Players",
        description: "Need at least 2 players to start.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate first round matches
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      const matchesToCreate = [];

      for (let i = 0; i < shuffledParticipants.length; i += 2) {
        const white = shuffledParticipants[i];
        const black = shuffledParticipants[i + 1];

        matchesToCreate.push({
          tournament_id: selectedTournament.id,
          round: 1,
          match_number: Math.floor(i / 2) + 1,
          white_player_id: white.user_id,
          black_player_id: black?.user_id || null,
          status: black ? 'pending' : 'bye'
        });
      }

      await supabase.from('tournament_matches').insert(matchesToCreate);

      await supabase
        .from('tournaments')
        .update({
          status: 'in_progress',
          current_round: 1,
          started_at: new Date().toISOString()
        })
        .eq('id', selectedTournament.id);

      toast({
        title: "Tournament Started!",
        description: "First round matches have been created."
      });

      // Refresh data
      const { data: updatedTournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', selectedTournament.id)
        .single();

      if (updatedTournament) {
        setSelectedTournament(updatedTournament as unknown as Tournament);
      }
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      console.error('Error starting tournament:', error);
    }
  };

  const getTimeControlLabel = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return <Badge className="bg-green-500/20 text-green-400">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500/20 text-yellow-400">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Tournament detail view
  if (selectedTournament) {
    const isCreator = user && selectedTournament.created_by === user.id;
    const isParticipant = participants.some(p => p.user_id === user?.id);

    return (
      <motion.div
        className="w-full max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTournament(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              {getStatusBadge(selectedTournament.status)}
            </div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {selectedTournament.name}
            </CardTitle>
            {selectedTournament.description && (
              <CardDescription>{selectedTournament.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tournament Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{participants.length}/{selectedTournament.max_players}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{getTimeControlLabel(selectedTournament.time_control)}</p>
                <p className="text-xs text-muted-foreground">Time Control</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{selectedTournament.current_round}/{selectedTournament.total_rounds}</p>
                <p className="text-xs text-muted-foreground">Round</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Gift className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-lg font-bold">{selectedTournament.prize_pool.first}</p>
                <p className="text-xs text-muted-foreground">1st Prize</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {selectedTournament.status === 'registration' && !isParticipant && (
                <Button onClick={() => handleJoinTournament(selectedTournament)} disabled={isJoining}>
                  {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Join Tournament
                </Button>
              )}
              {isCreator && selectedTournament.status === 'registration' && participants.length >= 2 && (
                <Button onClick={handleStartTournament} className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Tournament
                </Button>
              )}
            </div>

            {/* Participants */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants
              </h3>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {participants.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={p.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(p.profile?.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {p.profile?.display_name || p.profile?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rating: {p.profile?.rating || 1200}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{p.score}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.wins}W-{p.losses}L-{p.draws}D
                        </p>
                      </div>
                      {p.eliminated && (
                        <Badge variant="destructive" className="text-xs">Out</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Bracket / Matches */}
            {matches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Matches
                </h3>
                <div className="space-y-4">
                  {Array.from(new Set(matches.map(m => m.round))).map(round => (
                    <div key={round}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Round {round}
                      </h4>
                      <div className="grid gap-2">
                        {matches.filter(m => m.round === round).map(match => {
                          const whitePlayer = participants.find(p => p.user_id === match.white_player_id);
                          const blackPlayer = participants.find(p => p.user_id === match.black_player_id);
                          
                          return (
                            <Card key={match.id} className="border-border/50">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {whitePlayer?.profile?.username || 'TBD'}
                                    </span>
                                    <span className="text-muted-foreground">vs</span>
                                    <span className="text-sm">
                                      {blackPlayer?.profile?.username || 'BYE'}
                                    </span>
                                  </div>
                                  <Badge variant={
                                    match.status === 'completed' ? 'default' :
                                    match.status === 'in_progress' ? 'secondary' : 'outline'
                                  }>
                                    {match.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Tournament list view
  return (
    <motion.div
      className="glass-panel p-6 md:p-8 max-w-2xl w-full mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient">
          Tournaments
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="browse" className="flex-1">Browse</TabsTrigger>
          <TabsTrigger value="my" className="flex-1">My Tournaments</TabsTrigger>
          <TabsTrigger value="create" className="flex-1">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No active tournaments</p>
              <Button className="mt-4" onClick={() => setActiveTab('create')}>
                Create One
              </Button>
            </div>
          ) : (
            tournaments.map(tournament => (
              <Card
                key={tournament.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTournament(tournament)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-semibold">{tournament.name}</h3>
                        {getStatusBadge(tournament.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeControlLabel(tournament.time_control)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tournament.max_players} max
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          {myTournaments.length === 0 ? (
            <div className="text-center py-8">
              <Medal className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">You haven't joined any tournaments yet</p>
            </div>
          ) : (
            myTournaments.map(tournament => (
              <Card
                key={tournament.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTournament(tournament)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-semibold">{tournament.name}</h3>
                        {getStatusBadge(tournament.status)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          {!user ? (
            <div className="text-center py-8">
              <Crown className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Sign in to create tournaments</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Chess Tournament"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newTournament.description}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Friendly competition..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Control</Label>
                  <div className="flex flex-wrap gap-2">
                    {[180, 300, 600, 900].map(tc => (
                      <Button
                        key={tc}
                        type="button"
                        size="sm"
                        variant={newTournament.timeControl === tc ? 'default' : 'outline'}
                        onClick={() => setNewTournament(prev => ({ ...prev, timeControl: tc }))}
                      >
                        {getTimeControlLabel(tc)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Players</Label>
                  <div className="flex flex-wrap gap-2">
                    {[4, 8, 16].map(mp => (
                      <Button
                        key={mp}
                        type="button"
                        size="sm"
                        variant={newTournament.maxPlayers === mp ? 'default' : 'outline'}
                        onClick={() => setNewTournament(prev => ({ ...prev, maxPlayers: mp }))}
                      >
                        {mp}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCreateTournament}
                disabled={!newTournament.name.trim() || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Tournament
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default TournamentMode;
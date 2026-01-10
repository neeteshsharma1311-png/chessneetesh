import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Globe, 
  UserPlus, 
  Swords, 
  Copy, 
  Check, 
  Loader2,
  LogOut,
  Search,
  Clock,
  Trophy,
  UserCheck,
  UserX,
  Send,
  Eye
} from 'lucide-react';
import { useAuth, Profile } from '@/hooks/useAuth';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import { useFriends, Friendship } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import ConnectionStatus from './ConnectionStatus';
import Leaderboard from './Leaderboard';
import SpectatorMode from './SpectatorMode';

interface OnlineLobbyProps {
  onBack: () => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack }) => {
  const { user, profile, signOut } = useAuth();
  const { 
    currentGame, 
    isSearching, 
    isConnecting,
    isRealtimeConnected,
    findRandomGame, 
    createFriendGame, 
    joinFriendGame,
    joinGameById,
    leaveGame 
  } = useOnlineGame(user?.id);
  const { 
    friends, 
    pendingRequests, 
    sentRequests,
    gameInvites,
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    sendGameInvite,
    respondToGameInvite
  } = useFriends(user?.id);

  const [inviteCode, setInviteCode] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<Profile[]>([]);
  const [waitingGames, setWaitingGames] = useState<number>(0);
  const [selectedTimeControl, setSelectedTimeControl] = useState<number | null>(600);

  // Fetch online players and waiting games
  useEffect(() => {
    const fetchStats = async () => {
      const { data: players } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true)
        .limit(10);
      
      setOnlinePlayers(players as Profile[] || []);

      const { count } = await supabase
        .from('online_games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      
      setWaitingGames(count || 0);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Game start is handled by parent component watching currentGame state

  const handleCopyCode = () => {
    if (currentGame?.invite_code) {
      navigator.clipboard.writeText(currentGame.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinWithCode = async () => {
    if (inviteCode.trim()) {
      await joinFriendGame(inviteCode.trim());
    }
  };

  const handleSendFriendRequest = async () => {
    if (friendUsername.trim()) {
      const success = await sendFriendRequest(friendUsername.trim());
      if (success) {
        setFriendUsername('');
      }
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="glass-panel border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              Online Play
            </CardTitle>
            <CardDescription>
              Play against players worldwide or challenge your friends
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{profile.display_name || profile.username}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Rating: {profile.rating}
              </p>
            </div>
            <Avatar>
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats Bar */}
          <div className="flex flex-wrap gap-3 mb-6">
            <ConnectionStatus 
              isConnected={isRealtimeConnected} 
              isSearching={isSearching || isConnecting}
            />
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {onlinePlayers.length} Online
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {waitingGames} Waiting Games
            </Badge>
          </div>

          <Tabs defaultValue="play" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="play" className="flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Play
              </TabsTrigger>
              <TabsTrigger value="spectate" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Watch
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Ranks
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Friends
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Invites
                {gameInvites.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {gameInvites.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="play" className="space-y-6">
              {currentGame?.status === 'waiting' ? (
                <div className="text-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <h3 className="text-xl font-semibold">
                    {currentGame.game_type === 'random' 
                      ? 'Searching for opponent...' 
                      : 'Waiting for friend to join...'}
                  </h3>
                  
                  {currentGame.invite_code && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Share this code with your friend:</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-2xl font-mono bg-secondary px-4 py-2 rounded-lg">
                          {currentGame.invite_code}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyCode}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Button variant="outline" onClick={leaveGame}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Time Control Selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Select Time Control</p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { value: null, label: 'Untimed', sublabel: 'No limit', icon: '♾️' },
                        { value: 600, label: 'Rapid', sublabel: '10 min', icon: '⏱️' },
                        { value: 900, label: 'Classical', sublabel: '15 min', icon: '🎯' },
                        { value: 1800, label: 'Classical', sublabel: '30 min', icon: '♟️' },
                      ].map((preset) => (
                        <button
                          key={preset.value ?? 'untimed'}
                          type="button"
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedTimeControl === preset.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-secondary/50 hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTimeControl(preset.value)}
                        >
                          <span className="text-2xl mb-1 block">{preset.icon}</span>
                          <p className="font-medium text-sm">{preset.label}</p>
                          <p className="text-xs text-muted-foreground">{preset.sublabel}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Quick Match */}
                    <Card className="border-primary/20 hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => !isSearching && findRandomGame(selectedTimeControl)}>
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Globe className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Quick Match</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Play against a random opponent
                        </p>
                        <Button className="w-full" disabled={isSearching}>
                          {isSearching ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            'Find Match'
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Play with Friend */}
                    <Card className="border-primary/20">
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserPlus className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Play with Friend</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create a private game or join with code
                        </p>
                        
                        <div className="space-y-3">
                          <Button 
                            className="w-full" 
                            onClick={() => createFriendGame(selectedTimeControl)}
                            disabled={isConnecting}
                          >
                            Create Game
                          </Button>
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter code"
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                              className="text-center font-mono"
                              maxLength={6}
                            />
                            <Button 
                              onClick={handleJoinWithCode}
                              disabled={!inviteCode.trim() || isConnecting}
                            >
                              Join
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="spectate">
              <SpectatorMode onBack={onBack} />
            </TabsContent>

            <TabsContent value="leaderboard">
              <Leaderboard currentUserId={user?.id} />
            </TabsContent>

            <TabsContent value="friends" className="space-y-6">
              {/* Add Friend */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter username to add friend"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSendFriendRequest} disabled={!friendUsername.trim()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Friend Requests</h4>
                  <ScrollArea className="h-32">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {request.user_profile?.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{request.user_profile?.display_name || request.user_profile?.username}</p>
                            <p className="text-xs text-muted-foreground">@{request.user_profile?.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500"
                            onClick={() => acceptFriendRequest(request.id)}>
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500"
                            onClick={() => rejectFriendRequest(request.id)}>
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Friends List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Friends ({friends.length})
                </h4>
                <ScrollArea className="h-64">
                  {friends.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No friends yet. Add some!</p>
                    </div>
                  ) : (
                    friends.map((friendship) => {
                      const friend = friendship.friend_profile;
                      if (!friend) return null;
                      
                      const winRate = friend.games_played > 0 
                        ? Math.round((friend.games_won / friend.games_played) * 100) 
                        : 0;
                      
                      return (
                        <div key={friendship.id} className="p-3 rounded-lg hover:bg-secondary/50 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={friend.avatar_url || undefined} />
                                  <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {friend.is_online && (
                                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{friend.display_name || friend.username}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {friend.rating}
                                  </span>
                                  <span>•</span>
                                  <span>{friend.games_played} games</span>
                                  <span>•</span>
                                  <span className="text-green-500">{winRate}% wins</span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              disabled={!friend.is_online}
                              onClick={async () => {
                                const invite = await sendGameInvite(friend.user_id, selectedTimeControl);
                                if (invite?.game_id) {
                                  await joinGameById(invite.game_id);
                                }
                              }}
                            >
                              <Swords className="w-4 h-4 mr-1" />
                              Challenge
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="invites" className="space-y-4">
              {gameInvites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending game invites</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  {gameInvites.map((invite) => {
                    const fromProfile = invite.from_profile;
                    const winRate = fromProfile && fromProfile.games_played > 0 
                      ? Math.round((fromProfile.games_won / fromProfile.games_played) * 100) 
                      : 0;
                    const timePreset = invite.time_control === 60 ? 'Bullet' 
                      : invite.time_control === 300 ? 'Blitz' 
                      : invite.time_control === 600 ? 'Rapid' 
                      : `${Math.floor(invite.time_control / 60)}min`;
                    
                    return (
                      <div key={invite.id} className="p-4 rounded-lg bg-secondary/30 mb-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={fromProfile?.avatar_url || undefined} />
                              <AvatarFallback className="text-lg">
                                {fromProfile?.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-lg">
                                {fromProfile?.display_name || fromProfile?.username}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="gap-1">
                                  <Trophy className="w-3 h-3" />
                                  {fromProfile?.rating || 1200}
                                </Badge>
                                <Badge variant="outline">{timePreset}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Opponent Stats */}
                        <div className="grid grid-cols-4 gap-2 p-2 bg-background/50 rounded-lg text-center text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Games</p>
                            <p className="font-semibold">{fromProfile?.games_played || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Wins</p>
                            <p className="font-semibold text-green-500">{fromProfile?.games_won || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Losses</p>
                            <p className="font-semibold text-red-500">{fromProfile?.games_lost || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Win%</p>
                            <p className="font-semibold">{winRate}%</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1"
                            onClick={async () => {
                              const gameId = await respondToGameInvite(invite.id, true);
                              if (gameId) {
                                await new Promise(resolve => setTimeout(resolve, 300));
                                await joinGameById(gameId);
                              }
                            }}
                          >
                            Accept Challenge
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => respondToGameInvite(invite.id, false)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to Main Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OnlineLobby;

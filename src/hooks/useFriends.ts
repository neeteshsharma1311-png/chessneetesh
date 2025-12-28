import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from './useAuth';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend_profile?: Profile;
  user_profile?: Profile;
}

export interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  game_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  time_control: number;
  created_at: string;
  expires_at: string;
  from_profile?: Profile;
}

export const useFriends = (userId: string | undefined) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Fetch accepted friendships where user is either party
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      // Fetch profiles for friends
      const friendIds = friendships?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', friendIds);

        const enrichedFriends = friendships?.map(f => ({
          ...f,
          friend_profile: profiles?.find(p => 
            p.user_id === (f.user_id === userId ? f.friend_id : f.user_id)
          )
        })) || [];

        setFriends(enrichedFriends as Friendship[]);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return;

    try {
      // Requests received by user
      const { data: received, error: receivedError } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Fetch sender profiles
      const senderIds = received?.map(r => r.user_id) || [];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', senderIds);

        const enrichedRequests = received?.map(r => ({
          ...r,
          user_profile: profiles?.find(p => p.user_id === r.user_id)
        })) || [];

        setPendingRequests(enrichedRequests as Friendship[]);
      } else {
        setPendingRequests([]);
      }

      // Requests sent by user
      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      const recipientIds = sent?.map(s => s.friend_id) || [];
      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', recipientIds);

        const enrichedSent = sent?.map(s => ({
          ...s,
          friend_profile: profiles?.find(p => p.user_id === s.friend_id)
        })) || [];

        setSentRequests(enrichedSent as Friendship[]);
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [userId]);

  const fetchGameInvites = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('game_invites')
        .select('*')
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = data?.map(i => i.from_user_id) || [];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', senderIds);

        const enrichedInvites = data?.map(i => ({
          ...i,
          from_profile: profiles?.find(p => p.user_id === i.from_user_id)
        })) || [];

        setGameInvites(enrichedInvites as GameInvite[]);
      } else {
        setGameInvites([]);
      }
    } catch (error) {
      console.error('Error fetching game invites:', error);
    }
  }, [userId]);

  const sendFriendRequest = useCallback(async (friendUsername: string) => {
    if (!userId) return false;

    try {
      // Find user by username
      const { data: profiles, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', friendUsername)
        .limit(1);

      if (findError) throw findError;

      if (!profiles || profiles.length === 0) {
        toast({
          title: "User not found",
          description: `No user with username "${friendUsername}" exists.`,
          variant: "destructive",
        });
        return false;
      }

      const friend = profiles[0];

      if (friend.user_id === userId) {
        toast({
          title: "Cannot add yourself",
          description: "You cannot send a friend request to yourself.",
          variant: "destructive",
        });
        return false;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${userId},friend_id.eq.${friend.user_id}),and(user_id.eq.${friend.user_id},friend_id.eq.${userId})`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Request already exists",
          description: "A friend request already exists with this user.",
          variant: "destructive",
        });
        return false;
      }

      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: friend.user_id,
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: "Request sent!",
        description: `Friend request sent to ${friend.display_name || friend.username}.`,
      });

      fetchPendingRequests();
      return true;
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request.",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, toast, fetchPendingRequests]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "Friend added!",
        description: "You are now friends.",
      });

      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request.",
        variant: "destructive",
      });
    }
  }, [toast, fetchFriends, fetchPendingRequests]);

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "Request declined",
        description: "Friend request has been declined.",
      });

      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  }, [toast, fetchPendingRequests]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list.",
      });

      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }, [toast, fetchFriends]);

  const sendGameInvite = useCallback(async (friendUserId: string, timeControl: number = 600) => {
    if (!userId) return null;

    try {
      // Create the game first
      const { data: game, error: gameError } = await supabase
        .from('online_games')
        .insert({
          white_player_id: userId,
          black_player_id: friendUserId,
          status: 'waiting',
          game_type: 'friend',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          time_control: timeControl,
          white_time_remaining: timeControl,
          black_time_remaining: timeControl,
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Create the invite with game_id
      const { data, error } = await supabase
        .from('game_invites')
        .insert({
          from_user_id: userId,
          to_user_id: friendUserId,
          time_control: timeControl,
          game_id: game.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Invite sent!",
        description: "Waiting for your friend to accept...",
      });

      return data;
    } catch (error) {
      console.error('Error sending game invite:', error);
      toast({
        title: "Error",
        description: "Failed to send game invite.",
        variant: "destructive",
      });
      return null;
    }
  }, [userId, toast]);

  const respondToGameInvite = useCallback(async (inviteId: string, accept: boolean): Promise<string | null> => {
    if (!userId) return null;

    try {
      // Get the invite to find the game_id
      const { data: invite, error: fetchError } = await supabase
        .from('game_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (fetchError) throw fetchError;

      if (accept && invite.game_id) {
        // Start the game
        const { error: gameError } = await supabase
          .from('online_games')
          .update({ status: 'in_progress' })
          .eq('id', invite.game_id);

        if (gameError) throw gameError;
      } else if (!accept && invite.game_id) {
        // Cancel the game
        await supabase
          .from('online_games')
          .update({ status: 'abandoned' })
          .eq('id', invite.game_id);
      }

      // Update invite status
      const { error } = await supabase
        .from('game_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: accept ? "Game starting!" : "Invite declined",
        description: accept ? "Joining the game..." : "You declined the game invite.",
      });

      fetchGameInvites();
      return accept && invite.game_id ? invite.game_id : null;
    } catch (error) {
      console.error('Error responding to invite:', error);
      toast({
        title: "Error",
        description: "Failed to respond to invite.",
        variant: "destructive",
      });
      return null;
    }
  }, [userId, fetchGameInvites, toast]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('friends-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchFriends();
          fetchPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invites',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Game Invite!",
              description: "You have a new game invitation.",
            });
          }
          fetchGameInvites();
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
        (payload) => {
          const invite = payload.new as GameInvite;
          if (invite.status === 'accepted' && invite.game_id) {
            toast({
              title: "Invite accepted!",
              description: "Your friend accepted the game invite. Starting game...",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchFriends, fetchPendingRequests, fetchGameInvites, toast]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchFriends();
      fetchPendingRequests();
      fetchGameInvites();
    }
  }, [userId, fetchFriends, fetchPendingRequests, fetchGameInvites]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    gameInvites,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    sendGameInvite,
    respondToGameInvite,
    refreshFriends: fetchFriends,
  };
};

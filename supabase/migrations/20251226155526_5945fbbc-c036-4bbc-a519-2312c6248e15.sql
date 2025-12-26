-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  rating INT NOT NULL DEFAULT 1200,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  games_lost INT NOT NULL DEFAULT 0,
  games_drawn INT NOT NULL DEFAULT 0,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone (for matchmaking)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of
CREATE POLICY "Users can update their friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their friendships
CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create online games table
CREATE TABLE public.online_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  white_player_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  black_player_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
  game_type TEXT NOT NULL DEFAULT 'random' CHECK (game_type IN ('random', 'friend')),
  fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT,
  current_turn TEXT NOT NULL DEFAULT 'w',
  winner_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('checkmate', 'stalemate', 'draw', 'timeout', 'resignation', 'abandoned')),
  time_control INT DEFAULT 600,
  white_time_remaining INT,
  black_time_remaining INT,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on online_games
ALTER TABLE public.online_games ENABLE ROW LEVEL SECURITY;

-- Anyone can view games (for spectating/matchmaking)
CREATE POLICY "Games are viewable by everyone"
ON public.online_games FOR SELECT
USING (true);

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games"
ON public.online_games FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Players can update their games
CREATE POLICY "Players can update their games"
ON public.online_games FOR UPDATE
USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

-- Create game moves table for real-time sync
CREATE TABLE public.game_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.online_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  san TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on game_moves
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;

-- Anyone can view moves (for spectating)
CREATE POLICY "Moves are viewable by everyone"
ON public.game_moves FOR SELECT
USING (true);

-- Players can insert moves
CREATE POLICY "Players can insert moves"
ON public.game_moves FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Create game invites table
CREATE TABLE public.game_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  game_id UUID REFERENCES public.online_games(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  time_control INT DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on game_invites
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they sent or received
CREATE POLICY "Users can view their invites"
ON public.game_invites FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can create invites
CREATE POLICY "Users can create invites"
ON public.game_invites FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Users can update invites they received
CREATE POLICY "Users can update received invites"
ON public.game_invites FOR UPDATE
USING (auth.uid() = to_user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'player_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Chess Player'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_online_games_updated_at
  BEFORE UPDATE ON public.online_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for online games and moves
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_online_games_status ON public.online_games(status);
CREATE INDEX idx_online_games_white_player ON public.online_games(white_player_id);
CREATE INDEX idx_online_games_black_player ON public.online_games(black_player_id);
CREATE INDEX idx_game_moves_game_id ON public.game_moves(game_id);
CREATE INDEX idx_game_invites_to_user ON public.game_invites(to_user_id);
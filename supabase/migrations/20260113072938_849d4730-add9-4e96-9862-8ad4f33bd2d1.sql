-- Daily puzzles table
CREATE TABLE public.daily_puzzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  puzzle_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  fen TEXT NOT NULL,
  solution TEXT[] NOT NULL,
  player_color TEXT NOT NULL CHECK (player_color IN ('w', 'b')),
  theme TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User puzzle progress for daily puzzles
CREATE TABLE public.user_puzzle_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  puzzle_id UUID NOT NULL REFERENCES public.daily_puzzles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 1,
  hints_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, puzzle_id)
);

-- User puzzle streaks
CREATE TABLE public.user_puzzle_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  total_puzzles_solved INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  time_control INTEGER NOT NULL DEFAULT 600,
  max_players INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'in_progress', 'completed', 'cancelled')),
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 3,
  prize_pool JSONB DEFAULT '{"first": "100 points", "second": "50 points", "third": "25 points"}',
  created_by UUID NOT NULL,
  winner_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament participants
CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seed INTEGER,
  score NUMERIC NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  eliminated BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament matches
CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  white_player_id UUID,
  black_player_id UUID,
  game_id UUID REFERENCES public.online_games(id),
  winner_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'bye')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.daily_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_puzzle_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_puzzle_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_puzzles (public read)
CREATE POLICY "Daily puzzles are viewable by everyone"
ON public.daily_puzzles FOR SELECT
USING (true);

-- RLS Policies for user_puzzle_progress
CREATE POLICY "Users can view their own puzzle progress"
ON public.user_puzzle_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own puzzle progress"
ON public.user_puzzle_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own puzzle progress"
ON public.user_puzzle_progress FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for user_puzzle_streaks
CREATE POLICY "Users can view their own streaks"
ON public.user_puzzle_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
ON public.user_puzzle_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.user_puzzle_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- Public leaderboard view for streaks
CREATE POLICY "Streak leaderboard is viewable by everyone"
ON public.user_puzzle_streaks FOR SELECT
USING (true);

-- RLS Policies for tournaments (public read)
CREATE POLICY "Tournaments are viewable by everyone"
ON public.tournaments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tournaments"
ON public.tournaments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Tournament creators can update their tournaments"
ON public.tournaments FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for tournament_participants
CREATE POLICY "Tournament participants are viewable by everyone"
ON public.tournament_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join tournaments"
ON public.tournament_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tournament participants can be updated by tournament creator"
ON public.tournament_participants FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tournaments 
  WHERE id = tournament_id AND created_by = auth.uid()
));

-- RLS Policies for tournament_matches
CREATE POLICY "Tournament matches are viewable by everyone"
ON public.tournament_matches FOR SELECT
USING (true);

CREATE POLICY "Tournament creator can manage matches"
ON public.tournament_matches FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tournaments 
  WHERE id = tournament_id AND created_by = auth.uid()
));

CREATE POLICY "Tournament creator can update matches"
ON public.tournament_matches FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tournaments 
  WHERE id = tournament_id AND created_by = auth.uid()
) OR auth.uid() = white_player_id OR auth.uid() = black_player_id);

-- Insert sample daily puzzles for the next 7 days
INSERT INTO public.daily_puzzles (puzzle_date, name, description, difficulty, fen, solution, player_color, theme) VALUES
(CURRENT_DATE, 'Knight Fork', 'Use the knight to attack two pieces at once!', 'easy', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ARRAY['h5f7'], 'w', 'Fork'),
(CURRENT_DATE + 1, 'Back Rank Mate', 'Deliver checkmate on the back rank!', 'easy', '6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1', ARRAY['a1a8'], 'w', 'Checkmate'),
(CURRENT_DATE + 2, 'Smothered Mate', 'A classic smothered mate pattern!', 'medium', 'r1b2rk1/ppp2ppp/2n5/3qN3/8/8/PPPP1PPP/R1BQK2R w KQ - 0 1', ARRAY['e5f7'], 'w', 'Checkmate Pattern'),
(CURRENT_DATE + 3, 'Greek Gift', 'Sacrifice the bishop on h7!', 'medium', 'r1bq1rk1/pppn1ppp/3bpn2/3p4/2PP4/2N1PN2/PPB2PPP/R1BQ1RK1 w - - 0 1', ARRAY['c2h7'], 'w', 'Sacrifice'),
(CURRENT_DATE + 4, 'Queen Sacrifice', 'Sacrifice the queen for a winning attack!', 'hard', 'r1b1kb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ARRAY['h5f7'], 'w', 'Sacrifice'),
(CURRENT_DATE + 5, 'Discovered Attack', 'Move one piece to reveal an attack from another!', 'medium', 'r2qkb1r/ppp2ppp/2n1bn2/3Np3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1', ARRAY['d5f6'], 'w', 'Discovered Attack'),
(CURRENT_DATE + 6, 'The Immortal Game', 'Adolf Anderssen''s brilliant finish!', 'hard', '1r3kr1/pbpBBp1p/1b3P2/8/8/2P2q2/P4PPP/3R2K1 w - - 0 1', ARRAY['d7e8'], 'w', 'Famous Game');

-- Enable realtime for tournaments
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
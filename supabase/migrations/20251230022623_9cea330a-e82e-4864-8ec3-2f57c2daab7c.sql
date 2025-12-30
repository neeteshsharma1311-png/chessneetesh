-- Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE public.online_games REPLICA IDENTITY FULL;
ALTER TABLE public.game_moves REPLICA IDENTITY FULL;
ALTER TABLE public.game_invites REPLICA IDENTITY FULL;
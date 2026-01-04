-- Drop the existing update policy
DROP POLICY IF EXISTS "Players can update their games" ON public.online_games;

-- Create a more permissive update policy that allows:
-- 1. Players who are already in the game (white or black)
-- 2. Any authenticated user to join a waiting game (update black_player_id from null to their id)
CREATE POLICY "Players can update their games" 
ON public.online_games 
FOR UPDATE 
USING (
  auth.uid() = white_player_id 
  OR auth.uid() = black_player_id
  OR (status = 'waiting' AND black_player_id IS NULL)
)
WITH CHECK (
  auth.uid() = white_player_id 
  OR auth.uid() = black_player_id
  OR (black_player_id = auth.uid())
);
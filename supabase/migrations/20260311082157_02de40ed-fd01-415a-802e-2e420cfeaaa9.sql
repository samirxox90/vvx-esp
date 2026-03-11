-- Make player roster publicly readable for homepage
DROP POLICY IF EXISTS "Admins can view player stats" ON public.player_stats;

CREATE POLICY "Anyone can view player stats"
ON public.player_stats
FOR SELECT
USING (true);
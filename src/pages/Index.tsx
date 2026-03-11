import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teamLogo from "@/assets/velocity-vortex-x-logo.jpg";

interface SiteContent {
  hero_title: string;
  hero_tagline: string;
  team_description: string;
}

interface Player {
  id: string;
  player_id: string;
  codename: string;
  real_name: string | null;
  role: string | null;
  country: string | null;
  age: number | null;
  bio: string | null;
  image_url: string | null;
  stats: Record<string, number>;
}

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>({
    hero_title: "VELOCITY VORTEX X",
    hero_tagline: "Precision. Speed. Dominance.",
    team_description: "Elite esports performance powered by data and discipline.",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
    loadPlayers();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase.from("site_content").select("key, content");
      if (error) throw error;
      if (data) {
        const contentMap = data.reduce(
          (acc, item) => ({ ...acc, [item.key]: item.content }),
          {} as SiteContent,
        );
        setContent((prev) => ({ ...prev, ...contentMap }));
      }
    } catch (error) {
      console.error("Error loading content:", error);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .order("codename");
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed right-0 top-0 z-50 flex items-center gap-3 p-6">
        {user ? (
          <>
            {isAdmin && (
              <Button variant="hero" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="cathedral" size="sm" onClick={() => navigate("/login")}>
            <LogIn className="h-4 w-4" />
          </Button>
        )}
      </header>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center border-b border-border px-6 py-20">
        <img
          src={teamLogo}
          alt="Velocity Vortex X"
          className="mb-8 h-32 w-32 rounded border border-border object-cover shadow-cathedral md:h-48 md:w-48"
        />
        <h1 className="mb-4 text-center font-display text-5xl md:text-8xl">{content.hero_title}</h1>
        <p className="mb-8 text-center text-lg text-highlight md:text-2xl">{content.hero_tagline}</p>
        <p className="max-w-2xl text-center text-muted-foreground">{content.team_description}</p>
      </section>

      {/* Players Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-12 text-center font-display text-4xl md:text-6xl">ROSTER</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {players.map((player) => (
            <div key={player.id} className="group border border-border bg-card/40 transition-all hover:border-highlight">
              {player.image_url ? (
                <img
                  src={player.image_url}
                  alt={player.codename}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-muted" />
              )}
              <div className="border-t border-border p-4">
                <h3 className="mb-1 font-display text-2xl">{player.codename}</h3>
                {player.role && <p className="text-xs text-muted-foreground">{player.role}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;

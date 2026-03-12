import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  LogIn,
  Settings,
  Trophy,
  Medal,
  Star,
  Flame,
  Swords,
  Shield,
  Zap,
  Crown,
  TrendingUp,
  TrendingDown,
  Facebook,
  MessageCircle,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teamLogo from "@/assets/velocity-vortex-x-logo.jpg";

interface SiteContent {
  hero_title: string;
  hero_tagline: string;
  team_description: string;
  player_of_match: string;
  player_of_month: string;
  player_of_season: string;
  player_of_tournament: string;
  tournament_date: string;
  last_tournament_stats: string;
  about_title: string;
  about_description: string;
  facebook_url: string;
  discord_url: string;
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
  updated_at: string;
}

const clampRating = (value: number) => {
  if (Number.isNaN(value)) return 1;
  return Math.min(10, Math.max(1, Number(value.toFixed(2))));
};

const getPlayerRating = (player: Player) => clampRating(Number(player.stats?.rating ?? 1));

const formatUpdatedDate = (updatedAt: string) => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
};

const getRatingToneClass = (rating: number) => {
  if (rating < 3) return "text-destructive";
  if (rating < 7) return "text-highlight";
  return "text-primary";
};

const getRatingDirection = (rating: number) => {
  if (rating >= 7) {
    return {
      label: "Up",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      badgeClass: "border-primary/40 bg-primary/15 text-primary",
    };
  }

  return {
    label: "Down",
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    badgeClass: "border-destructive/40 bg-destructive/10 text-destructive",
  };
};

const getRoleBadges = (role: string | null) => {
  const value = (role ?? "").toLowerCase();
  const badges: Array<{ key: string; label: string; icon: ReactNode; className: string }> = [];

  if (value.includes("rusher") || value.includes("entry")) {
    badges.push({
      key: "rusher",
      label: "Rusher",
      icon: <Flame className="h-3.5 w-3.5" />,
      className: "border-primary/40 bg-primary/15 text-primary",
    });
  }
  if (value.includes("assaulter") || value.includes("assault")) {
    badges.push({
      key: "assaulter",
      label: "Assaulter",
      icon: <Swords className="h-3.5 w-3.5" />,
      className: "border-accent/50 bg-accent/20 text-accent-foreground",
    });
  }
  if (value.includes("support") || value.includes("supporter")) {
    badges.push({
      key: "supporter",
      label: "Supporter",
      icon: <Shield className="h-3.5 w-3.5" />,
      className: "border-secondary/60 bg-secondary/50 text-secondary-foreground",
    });
  }
  if (value.includes("boomber") || value.includes("bomber")) {
    badges.push({
      key: "boomber",
      label: "Boomber",
      icon: <Zap className="h-3.5 w-3.5" />,
      className: "border-destructive/40 bg-destructive/10 text-destructive",
    });
  }
  if (value.includes("igl") || value.includes("leader")) {
    badges.push({
      key: "leader",
      label: "IGL / Leader",
      icon: <Crown className="h-3.5 w-3.5" />,
      className: "border-highlight/40 bg-highlight/15 text-highlight",
    });
  }

  return badges;
};

const getRolePriority = (role: string | null) => {
  const value = (role ?? "").toLowerCase();

  if (value.includes("igl") || value.includes("leader")) return 0;
  if (value.includes("rusher") || value.includes("entry")) return 1;
  if (value.includes("assaulter") || value.includes("assault")) return 2;
  if (value.includes("support") || value.includes("supporter")) return 3;
  if (value.includes("boomber") || value.includes("bomber")) return 4;
  return 5;
};

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>({
    hero_title: "VELOCITY VORTEX X",
    hero_tagline: "Precision. Speed. Dominance.",
    team_description: "Elite esports performance powered by data and discipline.",
    player_of_match: "",
    player_of_month: "",
    player_of_season: "",
    player_of_tournament: "",
    tournament_date: "",
    last_tournament_stats: "Latest tournament stats will appear here.",
    about_title: "About Velocity Vortex",
    about_description: "Velocity Vortex is a high-performance roster built for tactical precision, relentless pressure, and championship consistency.",
    facebook_url: "",
    discord_url: "",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const initializePage = async () => {
      setLoading(true);
      await Promise.all([loadContent(isActive), loadPlayers(isActive)]);
      if (isActive) setLoading(false);
    };

    void initializePage();

    return () => {
      isActive = false;
    };
  }, []);

  const ratedPlayers = useMemo(() => players.map((player) => ({ ...player, rating: getPlayerRating(player) })), [players]);

  useEffect(() => {
    if (ratedPlayers.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(ratedPlayers[0].id);
    }
  }, [ratedPlayers, selectedPlayerId]);

  const sortedPlayers = useMemo(() => {
    return [...ratedPlayers].sort((a, b) => {
      const priorityDiff = getRolePriority(a.role) - getRolePriority(b.role);
      if (priorityDiff !== 0) return priorityDiff;
      return a.codename.localeCompare(b.codename);
    });
  }, [ratedPlayers]);

  const selectedPlayer = useMemo(
    () => sortedPlayers.find((player) => player.id === selectedPlayerId) ?? sortedPlayers[0] ?? null,
    [sortedPlayers, selectedPlayerId],
  );

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setPlayerMenuOpen(false);
  };

  const findPlayerByManualValue = (manualValue: string) => {
    const normalized = manualValue.trim().toLowerCase();
    if (!normalized) return null;
    return (
      ratedPlayers.find(
        (player) =>
          player.codename.toLowerCase() === normalized ||
          player.player_id.toLowerCase() === normalized ||
          (player.real_name ?? "").toLowerCase() === normalized,
      ) ?? null
    );
  };

  const playerAwards = useMemo(() => {
    if (ratedPlayers.length === 0) return null;

    return {
      playerOfMatch: findPlayerByManualValue(content.player_of_match),
      playerOfMonth: findPlayerByManualValue(content.player_of_month),
      playerOfSeason: findPlayerByManualValue(content.player_of_season),
      playerOfTournament: findPlayerByManualValue(content.player_of_tournament),
      tournamentDate: content.tournament_date,
    };
  }, [ratedPlayers, content]);

  const loadContent = async (isActive = true) => {
    try {
      const { data, error } = await supabase.from("site_content").select("key, content");
      if (error) throw error;
      if (data && isActive) {
        const contentMap = data.reduce((acc, item) => ({ ...acc, [item.key]: item.content }), {} as Partial<SiteContent>);
        setContent((prev) => ({ ...prev, ...contentMap }));
      }
    } catch (error) {
      console.error("Error loading content:", error);
    }
  };

  const loadPlayers = async (isActive = true) => {
    try {
      const { data, error } = await supabase.from("player_stats").select("*").order("codename");
      if (error) throw error;
      if (isActive) {
        setPlayers((data || []) as Player[]);
      }
    } catch (error) {
      console.error("Error loading players:", error);
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

      <section className="relative flex min-h-screen flex-col items-center justify-center border-b border-border bg-cathedral-slice px-6 py-20">
        <img
          src={teamLogo}
          alt="Velocity Vortex X"
          className="mb-8 h-32 w-32 rounded border border-border object-cover shadow-cathedral md:h-48 md:w-48"
        />
        <h1 className="mb-4 text-center font-display text-5xl md:text-8xl">{content.hero_title}</h1>
        <p className="mb-8 text-center text-lg text-highlight md:text-2xl">{content.hero_tagline}</p>
        <p className="max-w-3xl text-center text-muted-foreground">{content.team_description}</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-4 text-center font-display text-4xl md:text-6xl">ROSTER</h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">Swipe horizontally to explore the full roster cards.</p>
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2">
          {sortedPlayers.map((player) => {
            const roleBadges = getRoleBadges(player.role);
            const ratingDirection = getRatingDirection(player.rating);

            return (
              <article
                key={player.id}
                className="group min-w-[270px] snap-start border border-border bg-card/40 transition-all hover:border-highlight md:min-w-[320px]"
              >
                {player.image_url ? (
                  <img src={player.image_url} alt={`${player.codename} player portrait`} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="aspect-square w-full bg-muted" />
                )}
                <div className="border-t border-border p-4">
                  <h3 className="mb-1 font-display text-2xl">{player.codename}</h3>
                  {roleBadges.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roleBadges.map((badge) => (
                        <span
                          key={`${player.id}-${badge.key}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${badge.className}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    player.role && <p className="text-xs text-muted-foreground">{player.role}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${ratingDirection.badgeClass}`}
                    >
                      {ratingDirection.icon}
                      {ratingDirection.label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(player.rating)}`}>Rating: {player.rating.toFixed(2)} / 10.00</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Updated: {formatUpdatedDate(player.updated_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedPlayer && (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <h2 className="mb-4 text-center font-display text-4xl md:text-5xl">PLAYER INFORMATION CENTER</h2>
          <p className="mb-8 text-center text-sm text-muted-foreground">Choose a player to view complete profile details.</p>
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
            {sortedPlayers.map((player) => (
              <Button
                key={player.id}
                type="button"
                variant={selectedPlayer.id === player.id ? "hero" : "cathedral"}
                onClick={() => setSelectedPlayerId(player.id)}
              >
                {player.codename}
              </Button>
            ))}
          </div>

          <Card className="bg-card/40">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
              {selectedPlayer.image_url ? (
                <img
                  src={selectedPlayer.image_url}
                  alt={`${selectedPlayer.codename} full profile`}
                  className="h-56 w-full border border-border object-cover md:h-full"
                  loading="lazy"
                />
              ) : (
                <div className="h-56 w-full border border-border bg-muted md:h-full" />
              )}

              <div className="space-y-4">
                <h3 className="font-display text-3xl">{selectedPlayer.codename}</h3>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">In-Game UID:</span> {selectedPlayer.player_id}</p>
                  <p><span className="text-muted-foreground">Real Name:</span> {selectedPlayer.real_name || "-"}</p>
                  <p><span className="text-muted-foreground">Role:</span> {selectedPlayer.role || "-"}</p>
                  <p><span className="text-muted-foreground">Country:</span> {selectedPlayer.country || "-"}</p>
                  <p><span className="text-muted-foreground">Age:</span> {selectedPlayer.age ?? "-"}</p>
                  <p><span className="text-muted-foreground">Rating:</span> {selectedPlayer.rating.toFixed(2)} / 10.00</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedPlayer.bio || "No bio available."}</p>
                <p className="text-xs text-muted-foreground">Last updated: {formatUpdatedDate(selectedPlayer.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {playerAwards && (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <h2 className="mb-8 text-center font-display text-4xl md:text-5xl">PLAYER AWARDS</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5" /> Player of the Match</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfMatch?.codename ?? "Not selected"}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5" /> Player of the Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfMonth?.codename ?? "Not selected"}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Medal className="h-5 w-5" /> Player of the Season</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfSeason?.codename ?? "Not selected"}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5" /> Player of the Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfTournament?.codename ?? "Not selected"}</p>
                <p className="text-sm text-muted-foreground">Date: {playerAwards.tournamentDate || "Not set"}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg">Last Tournament Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{content.last_tournament_stats || "No stats added yet."}</p>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Card className="bg-card/40">
          <CardHeader>
            <CardTitle className="text-3xl">{content.about_title || "About"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-muted-foreground">{content.about_description || "No description added yet."}</p>
            <div className="flex flex-wrap gap-3">
              {content.facebook_url && (
                <a href={content.facebook_url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="cathedral" type="button">
                    <Facebook className="mr-2 h-4 w-4" /> Facebook
                  </Button>
                </a>
              )}
              {content.discord_url && (
                <a href={content.discord_url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="cathedral" type="button">
                    <MessageCircle className="mr-2 h-4 w-4" /> Discord
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Index;

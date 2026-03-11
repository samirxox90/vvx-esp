import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn, Settings, Trophy, Medal, Star, Flame, Swords, Shield, Zap, Crown, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  });
  const [players, setPlayers] = useState<Player[]>([]);
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

  const ratedPlayers = useMemo(
    () => players.map((player) => ({ ...player, rating: getPlayerRating(player) })),
    [players],
  );

  const sortedPlayers = useMemo(() => {
    return [...ratedPlayers].sort((a, b) => {
      const priorityDiff = getRolePriority(a.role) - getRolePriority(b.role);
      if (priorityDiff !== 0) return priorityDiff;
      return a.codename.localeCompare(b.codename);
    });
  }, [ratedPlayers]);

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

  const loadPlayers = async (isActive = true) => {
    try {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .order("codename");
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

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-12 text-center font-display text-4xl md:text-6xl">ROSTER</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sortedPlayers.map((player) => {
            const roleBadges = getRoleBadges(player.role);
            const ratingDirection = getRatingDirection(player.rating);

            return (
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
                    <p className={`text-sm ${getRatingToneClass(player.rating)}`}>
                      Rating: {player.rating.toFixed(2)} / 10.00
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Updated: {formatUpdatedDate(player.updated_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
                {playerAwards.playerOfMatch ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${getRatingDirection(playerAwards.playerOfMatch.rating).badgeClass}`}
                    >
                      {getRatingDirection(playerAwards.playerOfMatch.rating).icon}
                      {getRatingDirection(playerAwards.playerOfMatch.rating).label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(playerAwards.playerOfMatch.rating)}`}>
                      Rating: {playerAwards.playerOfMatch.rating.toFixed(2)} / 10.00
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Rating: -</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5" /> Player of the Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfMonth?.codename ?? "Not selected"}</p>
                {playerAwards.playerOfMonth ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${getRatingDirection(playerAwards.playerOfMonth.rating).badgeClass}`}
                    >
                      {getRatingDirection(playerAwards.playerOfMonth.rating).icon}
                      {getRatingDirection(playerAwards.playerOfMonth.rating).label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(playerAwards.playerOfMonth.rating)}`}>
                      Rating: {playerAwards.playerOfMonth.rating.toFixed(2)} / 10.00
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Rating: -</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Medal className="h-5 w-5" /> Player of the Season</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfSeason?.codename ?? "Not selected"}</p>
                {playerAwards.playerOfSeason ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${getRatingDirection(playerAwards.playerOfSeason.rating).badgeClass}`}
                    >
                      {getRatingDirection(playerAwards.playerOfSeason.rating).icon}
                      {getRatingDirection(playerAwards.playerOfSeason.rating).label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(playerAwards.playerOfSeason.rating)}`}>
                      Rating: {playerAwards.playerOfSeason.rating.toFixed(2)} / 10.00
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Rating: -</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5" /> Player of the Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl">{playerAwards.playerOfTournament?.codename ?? "Not selected"}</p>
                <p className="text-sm text-muted-foreground">Date: {playerAwards.tournamentDate || "Not set"}</p>
                {playerAwards.playerOfTournament ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${getRatingDirection(playerAwards.playerOfTournament.rating).badgeClass}`}
                    >
                      {getRatingDirection(playerAwards.playerOfTournament.rating).icon}
                      {getRatingDirection(playerAwards.playerOfTournament.rating).label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(playerAwards.playerOfTournament.rating)}`}>
                      Rating: {playerAwards.playerOfTournament.rating.toFixed(2)} / 10.00
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Rating: -</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </main>
  );
};

export default Index;

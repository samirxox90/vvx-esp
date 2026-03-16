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
  UserPlus,
  FileWarning,
  Bell,
  CirclePlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teamLogo from "@/assets/velocity-vortex-x-logo.jpg";

interface SiteContent {
  hero_title: string;
  hero_tagline: string;
  team_description: string;
  featured_video_title: string;
  featured_video_url: string;
  featured_video_thumbnail_url: string;
  player_of_match: string;
  player_of_month: string;
  player_of_season: string;
  player_of_tournament: string;
  tournament_date: string;
  last_tournament_stats: string;
  leaderboard_photo_url: string;
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

const normalizeRole = (value: string | null) => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("igl") || normalized.includes("leader")) return "IGL/Leader";
  if (normalized.includes("rusher") || normalized.includes("entry")) return normalized.includes("entry") ? "Entry Fragger" : "Rusher";
  if (normalized.includes("assaulter") || normalized.includes("assault")) return "Assaulter";
  if (normalized.includes("support") || normalized.includes("supporter")) return "Supporter";
  if (normalized.includes("boomber") || normalized.includes("bomber")) return "Boomber";

  return value.trim();
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

const awardFieldConfig = [
  { key: "player_of_match", label: "Player of the Match", icon: Trophy },
  { key: "player_of_month", label: "Player of the Month", icon: Star },
  { key: "player_of_season", label: "Player of the Season", icon: Medal },
] as const;

type AwardFieldKey = (typeof awardFieldConfig)[number]["key"];

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>({
    hero_title: "VELOCITY VORTEX X",
    hero_tagline: "Precision. Speed. Dominance.",
    team_description: "Elite esports performance powered by data and discipline.",
    featured_video_title: "",
    featured_video_url: "",
    featured_video_thumbnail_url: "",
    player_of_match: "",
    player_of_month: "",
    player_of_season: "",
    player_of_tournament: "",
    tournament_date: "",
    last_tournament_stats: "Latest tournament stats will appear here.",
    leaderboard_photo_url: "",
    about_title: "About Velocity Vortex",
    about_description: "Velocity Vortex is a high-performance roster built for tactical precision, relentless pressure, and championship consistency.",
    facebook_url: "",
    discord_url: "",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
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
    () => players.map((player) => ({ ...player, role: normalizeRole(player.role), rating: getPlayerRating(player) })),
    [players],
  );

  const sortedPlayers = useMemo(() => {
    return [...ratedPlayers].sort((a, b) => {
      const priorityDiff = getRolePriority(a.role) - getRolePriority(b.role);
      if (priorityDiff !== 0) return priorityDiff;
      return a.codename.localeCompare(b.codename);
    });
  }, [ratedPlayers]);

  useEffect(() => {
    if (sortedPlayers.length > 0 && !selectedPlayerId) {
      const iglLeaderPlayer = sortedPlayers.find((player) => {
        const value = (player.role ?? "").toLowerCase();
        return value.includes("igl") || value.includes("leader");
      });
      setSelectedPlayerId((iglLeaderPlayer ?? sortedPlayers[0]).id);
    }
  }, [sortedPlayers, selectedPlayerId]);

  const selectedPlayer = useMemo(
    () => sortedPlayers.find((player) => player.id === selectedPlayerId) ?? sortedPlayers[0] ?? null,
    [sortedPlayers, selectedPlayerId],
  );

  const defaultMenuPlayer = useMemo(() => {
    return (
      sortedPlayers.find((player) => {
        const value = (player.role ?? "").toLowerCase();
        return value.includes("igl") || value.includes("leader");
      }) ?? sortedPlayers[0] ?? null
    );
  }, [sortedPlayers]);

  const handlePlayerMenuOpenChange = (open: boolean) => {
    setPlayerMenuOpen(open);
    if (open && defaultMenuPlayer) {
      setSelectedPlayerId(defaultMenuPlayer.id);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
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

  const awardEntries = useMemo(() => {
    if (ratedPlayers.length === 0) return [];

    return awardFieldConfig.map((award) => {
      const manualValue = content[award.key as AwardFieldKey];
      return {
        ...award,
        manualValue,
        player: findPlayerByManualValue(manualValue),
      };
    });
  }, [ratedPlayers, content]);

  const tournamentAwardEntry = useMemo(() => {
    const manualValue = content.player_of_tournament;
    return {
      manualValue,
      player: findPlayerByManualValue(manualValue),
    };
  }, [ratedPlayers, content.player_of_tournament]);

  const tournamentStatsLines = useMemo(
    () =>
      content.last_tournament_stats
        .split(/\n|\|/)
        .map((line) => line.trim())
        .filter(Boolean),
    [content.last_tournament_stats],
  );

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

  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let pollInterval = 4000;

    const schedulePoll = () => {
      timeoutId = setTimeout(async () => {
        await Promise.all([loadContent(isActive), loadPlayers(isActive)]);
        pollInterval = Math.min(Math.round(pollInterval * 1.5), 30000);
        if (isActive) schedulePoll();
      }, pollInterval);
    };

    const handleRealtimeUpdate = async () => {
      pollInterval = 4000;
      await Promise.all([loadContent(isActive), loadPlayers(isActive)]);
    };

    const contentChannel = supabase
      .channel("site-content-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => {
        void handleRealtimeUpdate();
      })
      .subscribe();

    const playersChannel = supabase
      .channel("player-stats-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "player_stats" }, () => {
        void handleRealtimeUpdate();
      })
      .subscribe();

    schedulePoll();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(contentChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setLogoutConfirmOpen(false);
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
      <header className="fixed left-0 top-0 z-50 p-6">
        <Sheet open={playerMenuOpen} onOpenChange={handlePlayerMenuOpenChange}>
          <SheetTrigger asChild>
            <Button variant="cathedral" size="sm" type="button" aria-label="Open player menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] overflow-y-auto sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>All Players</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {sortedPlayers.map((player) => (
                <Button
                  key={`menu-${player.id}`}
                  type="button"
                  variant={selectedPlayer?.id === player.id ? "hero" : "cathedral"}
                  className="h-auto w-full justify-start px-3 py-3 text-left"
                  onClick={() => handlePlayerSelect(player.id)}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-display text-base">{player.codename}</span>
                    <span className="text-xs text-muted-foreground">UID: {player.player_id || "Not set"}</span>
                  </span>
                </Button>
              ))}
            </div>

            {selectedPlayer && (
              <Card className="mt-6 bg-card/40">
                <CardContent className="space-y-4 p-4">
                  {selectedPlayer.image_url ? (
                    <img
                      src={selectedPlayer.image_url}
                      alt={`${selectedPlayer.codename} full profile`}
                      className="h-52 w-full rounded object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-52 w-full rounded bg-muted/40" />
                  )}

                  <div>
                    <h3 className="font-display text-2xl">{selectedPlayer.codename}</h3>
                    <p className="text-xs text-muted-foreground">Last updated: {formatUpdatedDate(selectedPlayer.updated_at)}</p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <p><span className="text-muted-foreground">In-Game UID:</span> {selectedPlayer.player_id || "-"}</p>
                    <p><span className="text-muted-foreground">Real Name:</span> {selectedPlayer.real_name || "-"}</p>
                    <p><span className="text-muted-foreground">Role:</span> {selectedPlayer.role || "-"}</p>
                    <p><span className="text-muted-foreground">Country:</span> {selectedPlayer.country || "-"}</p>
                    <p><span className="text-muted-foreground">Age:</span> {selectedPlayer.age ?? "-"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${getRatingDirection(selectedPlayer.rating).badgeClass}`}
                    >
                      {getRatingDirection(selectedPlayer.rating).icon}
                      {getRatingDirection(selectedPlayer.rating).label}
                    </span>
                    <p className={`text-sm ${getRatingToneClass(selectedPlayer.rating)}`}>
                      Rating: {selectedPlayer.rating.toFixed(2)} / 10.00
                    </p>
                  </div>

                  {getRoleBadges(selectedPlayer.role).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getRoleBadges(selectedPlayer.role).map((badge) => (
                        <span
                          key={`${selectedPlayer.id}-${badge.key}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${badge.className}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{selectedPlayer.bio || "No bio available."}</p>
                </CardContent>
              </Card>
            )}
          </SheetContent>
        </Sheet>
      </header>

      <header className="fixed right-2 top-2 z-50 flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-end gap-2 rounded-md border border-border bg-background/70 p-2 backdrop-blur-sm md:right-6 md:top-6 md:max-w-none md:flex-nowrap md:border-0 md:bg-transparent md:p-0">
        {user ? (
          <>
            <Button variant="cathedral" size="icon" onClick={() => navigate("/apply")} aria-label="Apply to join team">
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button variant="cathedral" size="icon" onClick={() => navigate("/report")} aria-label="Report a player">
              <FileWarning className="h-4 w-4" />
            </Button>
            <Button variant="cathedral" size="icon" onClick={() => navigate("/inbox")} aria-label="Open inbox notifications">
              <Bell className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button variant="hero" size="icon" onClick={() => navigate("/admin")} aria-label="Open admin panel">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleSignOut()}>Log out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Button variant="cathedral" size="icon" onClick={() => navigate("/login")} aria-label="Login">
            <LogIn className="h-4 w-4" />
          </Button>
        )}
      </header>

      {content.featured_video_thumbnail_url && (
        <section className="border-b border-border bg-card/20 px-6 pb-8 pt-20 md:px-10 md:pb-10 md:pt-24">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{content.featured_video_title || "Featured Video"}</p>
            {content.featured_video_url ? (
              <a
                href={content.featured_video_url}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded border border-border"
                aria-label="Open featured team video"
              >
                <img
                  src={content.featured_video_thumbnail_url}
                  alt="Featured team video thumbnail"
                  className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] md:h-72"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground">
                    <CirclePlay className="h-4 w-4" /> Play Video
                  </span>
                </div>
              </a>
            ) : (
              <img
                src={content.featured_video_thumbnail_url}
                alt="Featured team video thumbnail"
                className="h-52 w-full rounded border border-border object-cover md:h-72"
                loading="lazy"
              />
            )}
          </div>
        </section>
      )}

      <section className="relative flex min-h-screen flex-col items-center justify-center border-b border-border bg-cathedral-slice px-6 pb-20 pt-32 md:px-10 md:pt-28">
        <img
          src={teamLogo}
          alt="Velocity Vortex X"
          className="mb-8 h-32 w-32 rounded border border-border object-cover shadow-cathedral md:h-48 md:w-48"
        />
        <h1 className="mb-4 text-center font-display text-5xl md:text-8xl">{content.hero_title}</h1>
        <p className="mb-8 text-center text-lg text-highlight md:text-2xl">{content.hero_tagline}</p>
        <p className="max-w-3xl text-center text-muted-foreground">{content.team_description}</p>
      </section>

      {awardEntries.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pt-20">
          <Card className="mb-8 bg-card/40">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl md:text-2xl">Last Tournament Stats</CardTitle>
              <p className="text-sm text-muted-foreground">Date: {content.tournament_date || "Not set"}</p>
              <div className="rounded border border-border/60 bg-background/40 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Player of the Tournament</p>
                <p className="mt-1 font-display text-xl">
                  {tournamentAwardEntry.player?.codename ?? (tournamentAwardEntry.manualValue || "Not selected")}
                </p>
                {tournamentAwardEntry.player && (
                  <p className="text-xs text-muted-foreground">UID: {tournamentAwardEntry.player.player_id || "-"}</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.leaderboard_photo_url && (
                <img
                  src={content.leaderboard_photo_url}
                  alt="Tournament leaderboard"
                  className="h-64 w-full rounded object-contain"
                  loading="lazy"
                />
              )}
              {tournamentStatsLines.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tournamentStatsLines.map((line, index) => (
                    <li key={`stats-line-${index}`} className="rounded border border-border/60 bg-background/40 px-3 py-2">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No stats added yet.</p>
              )}
            </CardContent>
          </Card>

          <h2 className="mb-8 text-center font-display text-4xl md:text-5xl">PLAYER AWARDS</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {awardEntries.map((award) => {
              const AwardIcon = award.icon;
              return (
                <Card key={award.key} className="bg-card/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AwardIcon className="h-5 w-5" />
                      {award.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-display text-2xl">{award.player?.codename ?? (award.manualValue || "Not selected")}</p>
                    {award.player && (
                      <>
                        <p className="text-xs text-muted-foreground">UID: {award.player.player_id || "-"}</p>
                        <p className="text-xs text-muted-foreground">Role: {award.player.role || "-"}</p>
                        <p className={`text-sm ${getRatingToneClass(award.player.rating)}`}>
                          Rating: {award.player.rating.toFixed(2)} / 10.00
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
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

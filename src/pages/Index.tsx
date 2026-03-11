import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Settings2, LogOut, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatGraph } from "@/components/esports/StatGraph";
import { calculateRating, initialPlayers, statConfig, type StatKey } from "@/data/esports";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import heroImage from "@/assets/esports-hero.jpg";
import nyxImage from "@/assets/player-nyx.jpg";
import riftImage from "@/assets/player-rift.jpg";
import voltImage from "@/assets/player-volt.jpg";
import aeroImage from "@/assets/player-aero.jpg";
import teamLogo from "@/assets/velocity-vortex-x-logo.jpg";

const playBassHit = () => {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const context = new AudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = "triangle";
  osc.frequency.value = 62;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.18);
};

const Index = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [players, setPlayers] = useState(() =>
    initialPlayers({ nyx: nyxImage, rift: riftImage, volt: voltImage, aero: aeroImage }),
  );

  const [activePlayerId, setActivePlayerId] = useState(players[0].id);
  const [hoveredPlayerId, setHoveredPlayerId] = useState(players[0].id);
  const [focusedStat, setFocusedStat] = useState<StatKey>("headshot");
  const [flashStat, setFlashStat] = useState(false);
  const [saving, setSaving] = useState(false);

  const activePlayer = useMemo(
    () => players.find((player) => player.id === activePlayerId) ?? players[0],
    [players, activePlayerId],
  );

  const hoveredPlayer = players.find((player) => player.id === hoveredPlayerId) ?? players[0];

  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => calculateRating(b.stats) - calculateRating(a.stats)),
    [players],
  );

  const updateStat = (playerId: string, key: StatKey, value: number) => {
    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== playerId) return player;
        return {
          ...player,
          stats: { ...player.stats, [key]: value },
          trends: {
            ...player.trends,
            [key]: [...player.trends[key].slice(1), value],
          },
        };
      }),
    );
  };

  const saveToDatabase = async () => {
    if (!isAdmin) {
      toast.error("Only admins can save player stats");
      return;
    }

    setSaving(true);
    try {
      for (const player of players) {
        const { error } = await supabase.from("player_stats").upsert(
          {
            player_id: player.id,
            codename: player.codename,
            stats: player.stats,
            trends: player.trends,
          },
          { onConflict: "player_id" },
        );
        if (error) throw error;
      }
      toast.success("Player stats saved successfully");
    } catch (error: unknown) {
      console.error("Error saving stats:", error);
      const message = error instanceof Error ? error.message : "Failed to save stats";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const triggerStatFocus = (stat: StatKey) => {
    setFocusedStat(stat);
    setFlashStat(true);
    playBassHit();
    window.setTimeout(() => setFlashStat(false), 220);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      toast.error(message);
    }
  };

  return (
    <main className="bg-background text-foreground">
      {flashStat && <div className="stat-flash animate-flash" aria-hidden="true" />}

      {/* Auth Header */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-3">
        {user ? (
          <>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            {isAdmin && <span className="border border-highlight/40 bg-highlight/10 px-2 py-1 text-xs text-highlight">ADMIN</span>}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="cathedral" size="sm" onClick={() => navigate("/login")}>
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>

      <section className="relative min-h-screen overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="Velocity Vortex X esports squad"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-cathedral-slice opacity-80" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-end px-6 pb-20 md:px-12">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-4 border border-border bg-background/65 px-3 py-2 backdrop-blur-sm">
              <img src={teamLogo} alt="Velocity Vortex X team logo" className="h-14 w-14 rounded-sm border border-border object-cover" loading="lazy" />
              <div>
                <p className="text-xs tracking-[0.25em] text-muted-foreground">OFFICIAL TEAM IDENTITY</p>
                <p className="font-display text-lg text-highlight">VELOCITY VORTEX X</p>
              </div>
            </div>

            <h1 className="text-4xl leading-tight md:text-7xl">VELOCITY VORTEX X ESPORTS HQ</h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Dark-cyan arena visuals, full player breakdowns, and a live rating system that your admin panel can tune in
              real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="hero"
                size="lg"
                onClick={() => document.getElementById("players")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Roster <ArrowUpRight />
              </Button>
              {isAdmin && (
                <Button
                  variant="cathedral"
                  size="lg"
                  onClick={() => document.getElementById("admin")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Open VVX Admin <Settings2 />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-20 text-surface-foreground">
        <div className="mx-auto grid w-full max-w-4xl gap-10 px-6 md:px-12">
          <h2 className="text-3xl md:text-5xl">TEAM MANDATE</h2>
          <p className="max-w-3xl text-sm leading-relaxed md:text-base">
            Velocity Vortex X runs on discipline and speed. Fans get transparent stats and ranking logic, while staff can
            calibrate every player metric from one focused control panel.
          </p>
        </div>
      </section>

      <section id="players" className="border-b border-border py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 md:grid-cols-12 md:px-12">
          <div className="space-y-5 md:col-span-5">
            <h2 className="text-3xl md:text-5xl">PLAYER ROSTER</h2>
            <p className="text-sm text-muted-foreground">Hover a codename to summon their portrait. Click to open full details.</p>

            <div className="space-y-2 border-l border-border pl-4">
              {rankedPlayers.map((player, index) => {
                const isActive = player.id === activePlayer.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onMouseEnter={() => setHoveredPlayerId(player.id)}
                    onFocus={() => setHoveredPlayerId(player.id)}
                    onClick={() => setActivePlayerId(player.id)}
                    className={`group flex w-full items-end justify-between gap-2 border-b border-border/60 py-3 text-left transition-all duration-200 ${
                      isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="font-display text-2xl uppercase tracking-[0.12em] md:text-4xl">{player.codename}</span>
                    <span className="text-xs text-muted-foreground">
                      RATING #{index + 1} · {calculateRating(player.stats)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[26rem] md:col-span-7">
            <img
              src={hoveredPlayer.image}
              alt={`${hoveredPlayer.codename} esports portrait`}
              className="h-full w-full rounded-sm border border-border object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background/75 px-4 py-3 backdrop-blur-sm">
              <p className="font-display text-2xl">{hoveredPlayer.codename}</p>
              <p className="text-xs text-muted-foreground">
                {hoveredPlayer.role} · {hoveredPlayer.country}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 md:grid-cols-12 md:px-12">
          <div className="space-y-5 md:col-span-5">
            <h2 className="text-3xl md:text-5xl">{activePlayer.codename}</h2>
            <p className="text-sm text-muted-foreground">
              {activePlayer.realName} · {activePlayer.age} · {activePlayer.country}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{activePlayer.bio}</p>
            <div className="inline-flex items-center gap-2 border border-highlight/30 bg-highlight/10 px-4 py-2 text-sm">
              Team Rating: <span className="font-display text-xl text-highlight">{calculateRating(activePlayer.stats)}</span>
            </div>
          </div>

          <div className="space-y-5 md:col-span-7">
            <p className="text-xs tracking-[0.2em] text-muted-foreground">STAT FOCUS MODE</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {statConfig.map((stat) => {
                const isFocused = focusedStat === stat.key;
                return (
                  <button
                    key={stat.key}
                    type="button"
                    onClick={() => triggerStatFocus(stat.key)}
                    className={`border px-3 py-2 text-left transition-all duration-200 ${
                      isFocused ? "border-highlight bg-highlight/10 opacity-100" : "border-border opacity-40 hover:opacity-100"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-display text-xl">
                      {activePlayer.stats[stat.key]}
                      {stat.unit}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="border border-border bg-card/50 p-4">
              <p className="mb-3 text-xs text-muted-foreground">Focused Trend · {statConfig.find((s) => s.key === focusedStat)?.label}</p>
              <StatGraph values={activePlayer.trends[focusedStat]} />
            </div>
          </div>
        </div>
      </section>

      {isAdmin && (
        <section id="admin" className="py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 md:grid-cols-12 md:px-12">
            <div className="space-y-5 md:col-span-4">
              <h2 className="text-3xl md:text-5xl">ADMIN PANEL</h2>
              <p className="text-sm text-muted-foreground">Adjust player stats below. Ratings and trend graph update live.</p>
              <div className="space-y-2">
                {players.map((player) => (
                  <Button
                    key={player.id}
                    variant={activePlayerId === player.id ? "hero" : "cathedral"}
                    className="w-full justify-between"
                    onClick={() => setActivePlayerId(player.id)}
                  >
                    <span>{player.codename}</span>
                    <span>{calculateRating(player.stats)}</span>
                  </Button>
                ))}
              </div>
              <Button variant="hero" className="w-full" onClick={saveToDatabase} disabled={saving}>
                {saving ? "Saving..." : "Save to Database"}
              </Button>
            </div>

            <div className="space-y-4 border border-border bg-card/40 p-6 md:col-span-8">
              {statConfig.map((stat) => (
                <label key={stat.key} className="grid gap-2 border-b border-border/60 pb-4 last:border-none">
                  <div className="flex items-center justify-between text-sm">
                    <span>{stat.label}</span>
                    <span className="font-display text-lg">
                      {activePlayer.stats[stat.key]}
                      {stat.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={stat.max}
                    step={stat.step}
                    value={activePlayer.stats[stat.key]}
                    onChange={(event) => updateStat(activePlayer.id, stat.key, Number(event.target.value))}
                    className="h-2 w-full cursor-pointer accent-highlight"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default Index;

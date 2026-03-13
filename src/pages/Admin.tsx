import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  leaderboard_photo_url: string;
  about_title: string;
  about_description: string;
  facebook_url: string;
  discord_url: string;
}

type SiteContentKey = keyof SiteContent;

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
  trends: Record<string, number[]>;
  updated_at: string;
}

const roleOptions = ["Rusher", "Assaulter", "Supporter", "Boomber", "IGL/Leader", "Entry Fragger"];

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

const createNewPlayer = (): Player => ({
  id: crypto.randomUUID(),
  player_id: "",
  codename: "New Member",
  real_name: null,
  role: null,
  country: null,
  age: null,
  bio: null,
  image_url: null,
  stats: { rating: 1 },
  trends: {},
  updated_at: new Date().toISOString(),
});

const awardFields = [
  { key: "player_of_match", label: "Player of the Match" },
  { key: "player_of_month", label: "Player of the Month" },
  { key: "player_of_season", label: "Player of the Season" },
  { key: "player_of_tournament", label: "Player of the Tournament" },
] as const;

type AwardFieldKey = (typeof awardFields)[number]["key"];

const getPlayerRatingValue = (stats: Record<string, number>) => {
  const parsed = Number(stats?.rating ?? 1);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(10, Math.max(1, Number(parsed.toFixed(2))));
};

const clampRating = (value: number) => Math.min(10, Math.max(1, Number(value.toFixed(2))));

const normalizeRatingInput = (value: string) => value.replace(",", ".").trim();

const formatUpdatedDate = (updatedAt: string) => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
};

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>({
    hero_title: "",
    hero_tagline: "",
    team_description: "",
    player_of_match: "",
    player_of_month: "",
    player_of_season: "",
    player_of_tournament: "",
    tournament_date: "",
    last_tournament_stats: "",
    leaderboard_photo_url: "",
    about_title: "",
    about_description: "",
    facebook_url: "",
    discord_url: "",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [ratingInput, setRatingInput] = useState("1.00");
  const [uploadingPlayerImage, setUploadingPlayerImage] = useState(false);
  const [uploadingLeaderboardImage, setUploadingLeaderboardImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      void loadContent();
      void loadPlayers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedPlayer) return;
    setRatingInput(getPlayerRatingValue(selectedPlayer.stats).toFixed(2));
  }, [selectedPlayer?.id]);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase.from("site_content").select("key, content");
      if (error) throw error;

      if (data) {
        const contentMap = data.reduce((acc, item) => ({ ...acc, [item.key]: item.content }), {} as Partial<SiteContent>);
        setContent((prev) => ({ ...prev, ...contentMap }));
      }
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content");
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase.from("player_stats").select("*").order("codename");
      if (error) throw error;

      const nextPlayers = ((data || []) as Player[]).map((player) => ({
        ...player,
        role: normalizeRole(player.role),
      }));
      setPlayers(nextPlayers);
      setSelectedPlayer((prevSelected) => {
        if (nextPlayers.length === 0) return null;
        if (!prevSelected) return nextPlayers[0];
        return nextPlayers.find((player) => player.id === prevSelected.id) ?? nextPlayers[0];
      });
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("Failed to load players");
    }
  };

  const setAwardValue = (field: AwardFieldKey, value: string) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  const setAwardFromSelectedPlayer = (field: AwardFieldKey) => {
    if (!selectedPlayer) return;
    setAwardValue(field, selectedPlayer.codename);
  };

  const clearAwardValue = (field: AwardFieldKey) => {
    setAwardValue(field, "");
  };

  const addNewPlayer = () => {
    const newPlayer = createNewPlayer();
    setPlayers((prev) => [...prev, newPlayer]);
    setSelectedPlayer(newPlayer);
    setRatingInput("1.00");
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const contentPayload = Object.entries(content).map(([key, value]) => ({ key, content: value }));
      const { error } = await supabase.from("site_content").upsert(contentPayload, { onConflict: "key" });
      if (error) throw error;
      await loadContent();
      toast.success("Content saved");
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const savePlayer = async () => {
    if (!selectedPlayer) return;

    if (!selectedPlayer.codename.trim()) {
      toast.error("Codename is required");
      return;
    }

    if (!selectedPlayer.player_id.trim()) {
      toast.error("In-Game UID is required");
      return;
    }

    const parsedInput = Number(normalizeRatingInput(ratingInput));
    if (Number.isNaN(parsedInput)) {
      toast.error("Rating must be a valid number between 1.00 and 10.00");
      return;
    }

    const rating = clampRating(parsedInput);

    setSaving(true);
    try {
      const playerToSave = {
        ...selectedPlayer,
        role: normalizeRole(selectedPlayer.role),
        updated_at: new Date().toISOString(),
        stats: {
          ...selectedPlayer.stats,
          rating,
        },
      };

      const { error } = await supabase.from("player_stats").upsert(playerToSave, { onConflict: "id" });
      if (error) throw error;
      toast.success("Player saved");
      await loadPlayers();
    } catch (error) {
      console.error("Error saving player:", error);
      toast.error("Failed to save player");
    } finally {
      setSaving(false);
    }
  };

  const uploadPlayerImage = async (file: File) => {
    if (!selectedPlayer) return;
    setUploadingPlayerImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const safePlayerId = selectedPlayer.player_id.trim() || selectedPlayer.id;
      const fileName = `${safePlayerId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(`players/${fileName}`, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("site-assets").getPublicUrl(`players/${fileName}`);

      setSelectedPlayer((prev) => (prev && prev.id === selectedPlayer.id ? { ...prev, image_url: publicUrl } : prev));
      setPlayers((prev) => prev.map((player) => (player.id === selectedPlayer.id ? { ...player, image_url: publicUrl } : player)));
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Error uploading player image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingPlayerImage(false);
    }
  };

  const uploadLeaderboardImage = async (file: File) => {
    setUploadingLeaderboardImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `leaderboard-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(`tournaments/${fileName}`, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("site-assets").getPublicUrl(`tournaments/${fileName}`);

      setContent((prev) => ({ ...prev, leaderboard_photo_url: publicUrl }));
      toast.success("Leaderboard photo uploaded");
    } catch (error) {
      console.error("Error uploading leaderboard image:", error);
      toast.error("Failed to upload leaderboard photo");
    } finally {
      setUploadingLeaderboardImage(false);
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Site
          </Button>
          <h1 className="font-display text-4xl">ADMIN PANEL</h1>
        </div>

        <section className="mb-12 border border-border bg-card/40 p-6">
          <h2 className="mb-6 font-display text-2xl">Site Content</h2>
          <div className="space-y-4">
            <div>
              <Label>Hero Title</Label>
              <Input value={content.hero_title} onChange={(e) => setContent({ ...content, hero_title: e.target.value })} />
            </div>
            <div>
              <Label>Hero Tagline</Label>
              <Input value={content.hero_tagline} onChange={(e) => setContent({ ...content, hero_tagline: e.target.value })} />
            </div>
            <div>
              <Label>Team Description</Label>
              <Textarea value={content.team_description} onChange={(e) => setContent({ ...content, team_description: e.target.value })} />
            </div>

            <div className="space-y-4 border border-border bg-background/40 p-4">
              <h3 className="font-display text-xl">Player Awards (Add / Delete)</h3>
              {awardFields.map((award) => (
                <div key={award.key} className="space-y-2">
                  <Label>{award.label} (Leader choice)</Label>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                    <Select
                      value={content[award.key] ? content[award.key] : "__none__"}
                      onValueChange={(value) => setAwardValue(award.key, value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {players.map((player) => (
                          <SelectItem key={`${award.key}-${player.id}`} value={player.codename}>
                            {player.codename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="cathedral" onClick={() => setAwardFromSelectedPlayer(award.key)} disabled={!selectedPlayer}>
                      Add
                    </Button>
                    <Button type="button" variant="outline" onClick={() => clearAwardValue(award.key)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Label>Tournament Date</Label>
                <Input
                  type="date"
                  value={content.tournament_date}
                  onChange={(e) => setContent({ ...content, tournament_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Tournament Stats</Label>
                <Textarea
                  value={content.last_tournament_stats}
                  onChange={(e) => setContent({ ...content, last_tournament_stats: e.target.value })}
                  placeholder="Example: Maps Won: 4 | Kills: 289 | MVP: NYX"
                />
              </div>
              <div>
                <Label>Leaderboard Photo (Optional)</Label>
                {content.leaderboard_photo_url && (
                  <img
                    src={content.leaderboard_photo_url}
                    alt="Last tournament leaderboard"
                    className="mb-2 h-56 w-full rounded bg-muted object-contain"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && uploadLeaderboardImage(e.target.files[0])}
                  disabled={uploadingLeaderboardImage}
                />
              </div>
            </div>

            <div className="space-y-4 border border-border bg-background/40 p-4">
              <h3 className="font-display text-xl">About Section + Socials</h3>
              <div>
                <Label>About Title</Label>
                <Input value={content.about_title} onChange={(e) => setContent({ ...content, about_title: e.target.value })} />
              </div>
              <div>
                <Label>About Description</Label>
                <Textarea
                  value={content.about_description}
                  onChange={(e) => setContent({ ...content, about_description: e.target.value })}
                />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input
                  value={content.facebook_url}
                  onChange={(e) => setContent({ ...content, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <Label>Discord URL</Label>
                <Input
                  value={content.discord_url}
                  onChange={(e) => setContent({ ...content, discord_url: e.target.value })}
                  placeholder="https://discord.gg/yourserver"
                />
              </div>
            </div>

            <Button variant="hero" onClick={saveContent} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> Save Content
            </Button>
          </div>
        </section>

        <section className="border border-border bg-card/40 p-6">
          <h2 className="mb-6 font-display text-2xl">Player Editor</h2>
          <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
            <Button type="button" variant="outline" onClick={addNewPlayer}>
              Add Player/Member
            </Button>
            {players.map((player) => (
              <Button key={player.id} variant={selectedPlayer?.id === player.id ? "hero" : "cathedral"} onClick={() => setSelectedPlayer(player)}>
                {player.codename}
              </Button>
            ))}
          </div>

          {selectedPlayer && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Player Image</Label>
                  {selectedPlayer.image_url && (
                    <img
                      src={selectedPlayer.image_url}
                      alt={selectedPlayer.codename}
                      className="mb-2 h-48 w-48 rounded border border-border bg-muted object-contain"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadPlayerImage(e.target.files[0])}
                    disabled={uploadingPlayerImage}
                  />
                </div>
                <div>
                  <Label>Codename</Label>
                  <Input value={selectedPlayer.codename} onChange={(e) => setSelectedPlayer({ ...selectedPlayer, codename: e.target.value })} />
                </div>
                <div>
                  <Label>In-Game UID</Label>
                  <Input
                    value={selectedPlayer.player_id}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, player_id: e.target.value })}
                    placeholder="Player UID"
                  />
                </div>
                <div>
                  <Label>Real Name</Label>
                  <Input
                    value={selectedPlayer.real_name || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, real_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={selectedPlayer.role || "__none__"}
                    onValueChange={(value) =>
                      setSelectedPlayer({ ...selectedPlayer, role: value === "__none__" ? null : normalizeRole(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={selectedPlayer.country || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, country: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={selectedPlayer.age || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, age: parseInt(e.target.value) || null })}
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={selectedPlayer.bio || ""} onChange={(e) => setSelectedPlayer({ ...selectedPlayer, bio: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-xl">Rating</h3>
                <div>
                  <Label htmlFor="player-rating">Direct Rating (1.00 - 10.00)</Label>
                  <Input
                    id="player-rating"
                    type="number"
                    min={1}
                    max={10}
                    step={0.01}
                    required
                    value={ratingInput}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setRatingInput(rawValue);
                      const parsed = Number(normalizeRatingInput(rawValue));
                      if (!Number.isNaN(parsed)) {
                        setSelectedPlayer({
                          ...selectedPlayer,
                          stats: {
                            ...selectedPlayer.stats,
                            rating: parsed,
                          },
                        });
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number(normalizeRatingInput(ratingInput));
                      if (Number.isNaN(parsed)) {
                        setRatingInput(getPlayerRatingValue(selectedPlayer.stats).toFixed(2));
                        return;
                      }
                      const clamped = clampRating(parsed);
                      setRatingInput(clamped.toFixed(2));
                      setSelectedPlayer({
                        ...selectedPlayer,
                        stats: {
                          ...selectedPlayer.stats,
                          rating: clamped,
                        },
                      });
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Required range: 1.00 to 10.00</p>
                </div>
                <div className="rounded border border-border bg-background/40 p-3 text-sm text-muted-foreground">
                  Last updated date: {formatUpdatedDate(selectedPlayer.updated_at)}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="hero" onClick={savePlayer} disabled={saving || !selectedPlayer}>
              <Save className="mr-2 h-4 w-4" /> Save Player
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;

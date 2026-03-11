import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { statConfig } from "@/data/esports";

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
  trends: Record<string, number[]>;
}

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>({
    hero_title: "",
    hero_tagline: "",
    team_description: "",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadContent();
      loadPlayers();
    }
  }, [isAdmin]);

  const loadContent = async () => {
    const { data } = await supabase.from("site_content").select("key, content");
    if (data) {
      const contentMap = data.reduce((acc, item) => ({ ...acc, [item.key]: item.content }), {} as SiteContent);
      setContent((prev) => ({ ...prev, ...contentMap }));
    }
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from("player_stats").select("*").order("codename");
    setPlayers(data || []);
    if (data && data.length > 0) setSelectedPlayer(data[0]);
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(content)) {
        const { error } = await supabase
          .from("site_content")
          .upsert({ key, content: value }, { onConflict: "key" });
        if (error) throw error;
      }
      toast.success("Content saved");
    } catch (error) {
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const savePlayer = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_stats")
        .upsert(selectedPlayer, { onConflict: "player_id" });
      if (error) throw error;
      toast.success("Player saved");
      loadPlayers();
    } catch (error) {
      toast.error("Failed to save player");
    } finally {
      setSaving(false);
    }
  };

  const uploadPlayerImage = async (file: File) => {
    if (!selectedPlayer) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedPlayer.player_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(`players/${fileName}`, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(`players/${fileName}`);

      setSelectedPlayer({ ...selectedPlayer, image_url: publicUrl });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
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

        {/* Site Content */}
        <section className="mb-12 border border-border bg-card/40 p-6">
          <h2 className="mb-6 font-display text-2xl">Site Content</h2>
          <div className="space-y-4">
            <div>
              <Label>Hero Title</Label>
              <Input
                value={content.hero_title}
                onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
              />
            </div>
            <div>
              <Label>Hero Tagline</Label>
              <Input
                value={content.hero_tagline}
                onChange={(e) => setContent({ ...content, hero_tagline: e.target.value })}
              />
            </div>
            <div>
              <Label>Team Description</Label>
              <Textarea
                value={content.team_description}
                onChange={(e) => setContent({ ...content, team_description: e.target.value })}
              />
            </div>
            <Button variant="hero" onClick={saveContent} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> Save Content
            </Button>
          </div>
        </section>

        {/* Player Editor */}
        <section className="border border-border bg-card/40 p-6">
          <h2 className="mb-6 font-display text-2xl">Player Editor</h2>
          <div className="mb-6 flex gap-2">
            {players.map((player) => (
              <Button
                key={player.id}
                variant={selectedPlayer?.id === player.id ? "hero" : "cathedral"}
                onClick={() => setSelectedPlayer(player)}
              >
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
                      className="mb-2 h-48 w-48 rounded border border-border object-cover"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadPlayerImage(e.target.files[0])}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <Label>Codename</Label>
                  <Input
                    value={selectedPlayer.codename}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, codename: e.target.value })}
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
                  <Input
                    value={selectedPlayer.role || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, role: e.target.value })}
                  />
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
                  <Textarea
                    value={selectedPlayer.bio || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, bio: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-xl">Stats</h3>
                {statConfig.map((stat) => (
                  <div key={stat.key}>
                    <Label>{stat.label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={stat.max}
                        step={stat.step}
                        value={selectedPlayer.stats[stat.key] || 0}
                        onChange={(e) =>
                          setSelectedPlayer({
                            ...selectedPlayer,
                            stats: { ...selectedPlayer.stats, [stat.key]: Number(e.target.value) },
                          })
                        }
                        className="h-2 flex-1 cursor-pointer accent-highlight"
                      />
                      <span className="w-16 text-sm">
                        {selectedPlayer.stats[stat.key] || 0}
                        {stat.unit}
                      </span>
                    </div>
                  </div>
                ))}
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface PlayerOption {
  id: string;
  codename: string;
  player_id: string;
  role: string | null;
}

const reportSchema = z.object({
  playerId: z.string().uuid("Please select a player"),
  description: z.string().trim().min(8, "Please describe the problem").max(1000, "Report is too long"),
});

const Report = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerId, setPlayerId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      void loadPlayers();
    }
  }, [loading, user, navigate]);

  const loadPlayers = async () => {
    setPageLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from("player_stats")
        .select("id, codename, player_id, role")
        .order("codename", { ascending: true });

      if (error) throw error;
      setPlayers((data ?? []) as PlayerOption[]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load players");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const parsed = reportSchema.safeParse({ playerId, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("player_reports").insert({
        reporter_user_id: user.id,
        player_id: parsed.data.playerId,
        description: parsed.data.description,
      });

      if (error) throw error;

      setPlayerId("");
      setDescription("");
      toast.success("Report sent to admin");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || pageLoading) return null;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-card/40">
          <CardHeader>
            <CardTitle className="text-3xl">Report a Player</CardTitle>
            <p className="text-sm text-muted-foreground">Select Player + describe the issue. Admin will review and can forward via inbox.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Select Player</Label>
                <Select value={playerId || "__none__"} onValueChange={(value) => setPlayerId(value === "__none__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select player</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.codename} ({player.player_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe the Problem</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write details about the issue..."
                  disabled={submitting}
                  required
                />
              </div>

              <Button type="submit" variant="hero" disabled={submitting || players.length === 0}>
                <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending..." : "Send Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Report;

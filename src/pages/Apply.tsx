import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const applySchema = z.object({
  real_name: z.string().trim().min(2, "Real name is required").max(80, "Too long"),
  in_game_name: z.string().trim().min(2, "In-Game name is required").max(40, "Too long"),
  game_uid: z.string().trim().min(3, "Game UID is required").max(60, "Too long"),
  gameplay_clip: z.string().trim().url("Gameplay clip must be a valid URL"),
  playing_role: z.string().trim().min(2, "Playing role is required").max(40, "Too long"),
  whatsapp: z
    .string()
    .trim()
    .min(7, "WhatsApp number is required")
    .max(30, "Too long")
    .regex(/^[+0-9\s()-]+$/, "WhatsApp number format is invalid"),
});

type ApplyFormData = z.infer<typeof applySchema>;

const initialForm: ApplyFormData = {
  real_name: "",
  in_game_name: "",
  game_uid: "",
  gameplay_clip: "",
  playing_role: "",
  whatsapp: "",
};

const Apply = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ApplyFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const handleChange = (key: keyof ApplyFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const parsed = applySchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your form");
      return;
    }

    setSubmitting(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("join_applications").insert({
        user_id: user.id,
        ...parsed.data,
      });

      if (error) throw error;
      setForm(initialForm);
      toast.success("Application sent to admin inbox");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-card/40">
          <CardHeader>
            <CardTitle className="text-3xl">Wanna Join Our Team?</CardTitle>
            <p className="text-sm text-muted-foreground">Fill Information</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="real_name">Real Name</Label>
                  <Input
                    id="real_name"
                    value={form.real_name}
                    onChange={(e) => handleChange("real_name", e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in_game_name">In-Game Name</Label>
                  <Input
                    id="in_game_name"
                    value={form.in_game_name}
                    onChange={(e) => handleChange("in_game_name", e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="game_uid">Game UID</Label>
                  <Input
                    id="game_uid"
                    value={form.game_uid}
                    onChange={(e) => handleChange("game_uid", e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playing_role">Playing Role</Label>
                  <Input
                    id="playing_role"
                    value={form.playing_role}
                    onChange={(e) => handleChange("playing_role", e.target.value)}
                    disabled={submitting}
                    placeholder="Rusher / IGL / Support"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameplay_clip">Gameplay Clip (URL)</Label>
                <Input
                  id="gameplay_clip"
                  type="url"
                  value={form.gameplay_clip}
                  onChange={(e) => handleChange("gameplay_clip", e.target.value)}
                  placeholder="https://..."
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                  placeholder="+880..."
                  disabled={submitting}
                  required
                />
              </div>

              <Button type="submit" variant="hero" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" /> {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Apply;

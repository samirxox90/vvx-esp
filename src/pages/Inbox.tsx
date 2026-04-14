import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Forward, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface InboxNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_report_id: string | null;
}

interface ReportItem {
  id: string;
  description: string;
  status: string;
  created_at: string;
  player_stats: {
    codename: string;
    player_id: string;
  } | null;
}

interface Tournament {
  id: string;
  title: string;
  schedule_at: string;
  status: "pending" | "running" | "completed";
  squad_main: string[];
  squad_extra: string | null;
  notes: string | null;
}

interface TournamentParticipation {
  id: string;
  tournament_id: string;
  user_id: string;
  response: "pending" | "accepted" | "rejected";
  reject_reason: string | null;
  responded_at: string | null;
  tournament: Tournament | null;
}

const notificationSchema = z.object({
  audience: z.enum(["single", "all_verified_users", "team_members_only"]),
  recipientEmail: z.string().trim().optional(),
  title: z.string().trim().min(2, "Title is required").max(120, "Title is too long"),
  message: z.string().trim().min(4, "Message is required").max(2000, "Message is too long"),
}).superRefine((data, ctx) => {
  if (data.audience === "single") {
    const emailValidation = z.string().trim().email("Recipient email is invalid").safeParse(data.recipientEmail ?? "");
    if (!emailValidation.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient email is invalid",
        path: ["recipientEmail"],
      });
    }
  }
});

type NotificationAudience = "single" | "all_verified_users" | "team_members_only";

const forwardSchema = z.object({
  reportId: z.string().uuid("Select a report first"),
  recipientEmail: z.string().trim().email("Recipient email is invalid"),
  message: z.string().trim().min(4, "Forward message is required").max(2000, "Message is too long"),
});

const allowlistSchema = z.object({
  email: z.string().trim().email("Email is invalid"),
});

const participationRejectSchema = z.object({
  reason: z.string().trim().min(4, "Reject reason is required").max(300, "Reason is too long"),
});

const Inbox = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [allowlistEmails, setAllowlistEmails] = useState<string[]>([]);
  const [tournamentParticipations, setTournamentParticipations] = useState<TournamentParticipation[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const [recipientEmail, setRecipientEmail] = useState("");
  const [notificationAudience, setNotificationAudience] = useState<NotificationAudience>("single");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  const [forwardReportId, setForwardReportId] = useState("");
  const [forwardRecipientEmail, setForwardRecipientEmail] = useState("");
  const [forwardMessage, setForwardMessage] = useState("");

  const [allowlistInput, setAllowlistInput] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      void loadData();
    }
  }, [loading, user, isAdmin, navigate]);

  const loadData = async (withSpinner = true) => {
    if (withSpinner) setPageLoading(true);
    try {
      const db = supabase as any;

      const notificationQuery = db.from("inbox_notifications").select("*").order("created_at", { ascending: false });
      const participationQuery = db
        .from("tournament_participations")
        .select("id, tournament_id, user_id, response, reject_reason, responded_at, tournaments(id, title, schedule_at, status, squad_main, squad_extra, notes)")
        .eq("user_id", user.id)
        .order("invited_at", { ascending: false });

      const adminQueries = isAdmin
        ? [
            db.from("notification_allowlist").select("email").order("email", { ascending: true }),
            db
              .from("player_reports")
              .select("id, description, status, created_at, player_stats(codename, player_id)")
              .order("created_at", { ascending: false }),
          ]
        : [];

      const results = await Promise.all([notificationQuery, participationQuery, ...adminQueries]);
      const notificationResult = results[0];
      const participationResult = results[1];
      if (notificationResult.error) throw notificationResult.error;
      if (participationResult.error) throw participationResult.error;
      setNotifications((notificationResult.data ?? []) as InboxNotification[]);

      const normalizedParticipations = ((participationResult.data ?? []) as any[]).map((item) => ({
        ...item,
        tournament: Array.isArray(item.tournaments) ? item.tournaments[0] ?? null : item.tournaments ?? null,
      }));
      setTournamentParticipations(normalizedParticipations as TournamentParticipation[]);

      if (isAdmin) {
        const allowlistResult = results[2];
        const reportsResult = results[3];

        if (allowlistResult?.error) throw allowlistResult.error;
        if (reportsResult?.error) throw reportsResult.error;

        setAllowlistEmails(((allowlistResult?.data ?? []) as Array<{ email: string }>).map((item) => item.email));

        const normalizedReports = ((reportsResult?.data ?? []) as any[]).map((report) => ({
          ...report,
          player_stats: Array.isArray(report.player_stats) ? report.player_stats[0] ?? null : report.player_stats,
        }));
        setReports(normalizedReports as ReportItem[]);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load inbox");
    } finally {
      if (withSpinner) setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const notificationChannel = supabase
      .channel(`inbox-live-${user.id}-${isAdmin ? "admin" : "user"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_notifications" }, () => {
        void loadData(false);
      })
      .subscribe();

    const participationChannel = supabase
      .channel(`inbox-participation-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participations", filter: `user_id=eq.${user.id}` }, () => {
        void loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(participationChannel);
    };
  }, [user?.id, isAdmin]);

  const markAsRead = async (id: string) => {
    try {
      const db = supabase as any;
      const { error } = await db.from("inbox_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update notification");
    }
  };

  const sendNotification = async () => {
    const parsed = notificationSchema.safeParse({
      audience: notificationAudience,
      recipientEmail,
      title: notificationTitle,
      message: notificationMessage,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid notification data");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;

      if (parsed.data.audience === "single") {
        const { error } = await db.rpc("send_inbox_notification_to_email", {
          _recipient_email: parsed.data.recipientEmail,
          _title: parsed.data.title,
          _message: parsed.data.message,
          _related_report_id: null,
        });
        if (error) throw error;
        toast.success("Notification sent");
      } else {
        const { data, error } = await db.rpc("send_inbox_notification_by_audience", {
          _audience: parsed.data.audience,
          _title: parsed.data.title,
          _message: parsed.data.message,
        });
        if (error) throw error;
        toast.success(`Notification sent to ${Number(data ?? 0)} user(s)`);
      }

      setRecipientEmail("");
      setNotificationTitle("");
      setNotificationMessage("");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send notification");
    } finally {
      setSaving(false);
    }
  };

  const forwardReport = async () => {
    const parsed = forwardSchema.safeParse({
      reportId: forwardReportId,
      recipientEmail: forwardRecipientEmail,
      message: forwardMessage,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid forward data");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.rpc("forward_report_to_player", {
        _report_id: parsed.data.reportId,
        _recipient_email: parsed.data.recipientEmail,
        _message: parsed.data.message,
      });
      if (error) throw error;

      setForwardReportId("");
      setForwardRecipientEmail("");
      setForwardMessage("");
      toast.success("Report forwarded to player inbox");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to forward report");
    } finally {
      setSaving(false);
    }
  };

  const addAllowlistEmail = async () => {
    const parsed = allowlistSchema.safeParse({ email: allowlistInput });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("notification_allowlist").upsert({ email: parsed.data.email.toLowerCase() });
      if (error) throw error;
      setAllowlistInput("");
      toast.success("Email allowlisted");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to allowlist email");
    } finally {
      setSaving(false);
    }
  };

  const removeAllowlistEmail = async (email: string) => {
    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("notification_allowlist").delete().eq("email", email);
      if (error) throw error;
      toast.success("Email removed from allowlist");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove email");
    } finally {
      setSaving(false);
    }
  };

  const respondToTournamentInvite = async (participationId: string, response: "accepted" | "rejected") => {
    const participation = tournamentParticipations.find((item) => item.id === participationId);
    if (!participation) return;

    let rejectReason: string | null = null;

    if (response === "rejected") {
      const parsed = participationRejectSchema.safeParse({ reason: rejectReasons[participationId] ?? "" });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please provide a reject reason");
        return;
      }
      rejectReason = parsed.data.reason;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db
        .from("tournament_participations")
        .update({
          response,
          reject_reason: rejectReason,
        })
        .eq("id", participationId)
        .eq("user_id", user?.id ?? "");

      if (error) throw error;

      if (response === "accepted") {
        toast.success("You accepted tournament participation");
      } else {
        toast.success("You rejected tournament participation");
      }

      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update participation");
    } finally {
      setSaving(false);
    }
  };

  if (loading || pageLoading) return null;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" type="button" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>{unreadCount} unread</Badge>
        </div>

        <Card className="bg-card/40">
          <CardHeader>
            <CardTitle className="text-2xl">Inbox Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournamentParticipations.length > 0 && (
              <div className="mb-4 space-y-3 rounded border border-border bg-background/40 p-3">
                <p className="font-display text-lg">Tournament Invites</p>
                {tournamentParticipations.map((participation) => {
                  const tournament = participation.tournament;
                  if (!tournament) return null;

                  return (
                    <div key={participation.id} className="rounded border border-border bg-background/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold">{tournament.title}</p>
                        <Badge variant={participation.response === "accepted" ? "secondary" : participation.response === "rejected" ? "destructive" : "outline"}>
                          {participation.response}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">Time: {new Date(tournament.schedule_at).toLocaleString()}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Status: {tournament.status}</p>

                      {(participation.response === "accepted" || tournament.status === "running") && (
                        <div className="mt-2 rounded border border-border/70 bg-background/40 p-2 text-xs text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground">Squad List</p>
                          <ul className="space-y-1">
                            {tournament.squad_main.map((member, index) => (
                              <li key={`${participation.id}-main-${index}`}>Main {index + 1}: {member}</li>
                            ))}
                            {tournament.squad_extra && <li>Extra: {tournament.squad_extra}</li>}
                          </ul>
                        </div>
                      )}

                      {participation.response === "pending" && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="Reason if you reject"
                            value={rejectReasons[participation.id] ?? ""}
                            onChange={(event) =>
                              setRejectReasons((prev) => ({
                                ...prev,
                                [participation.id]: event.target.value,
                              }))
                            }
                            disabled={saving}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="hero" size="sm" onClick={() => respondToTournamentInvite(participation.id, "accepted")} disabled={saving}>
                              Accept
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => respondToTournamentInvite(participation.id, "rejected")}
                              disabled={saving}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {participation.response === "rejected" && participation.reject_reason && (
                        <p className="mt-2 text-xs text-muted-foreground">Your reason: {participation.reject_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="rounded border border-border bg-background/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg">{item.title}</p>
                    <Badge variant={item.is_read ? "secondary" : "destructive"}>{item.is_read ? "Read" : "Unread"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    {!item.is_read && (
                      <Button type="button" variant="cathedral" size="sm" onClick={() => markAsRead(item.id)}>
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="text-xl">Allowed Emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={allowlistInput}
                    onChange={(e) => setAllowlistInput(e.target.value)}
                    placeholder="verifieduser@gmail.com"
                    disabled={saving}
                  />
                  <Button type="button" variant="hero" onClick={addAllowlistEmail} disabled={saving}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {allowlistEmails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No emails allowlisted yet.</p>
                  ) : (
                    allowlistEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between gap-3 rounded border border-border bg-background/40 px-3 py-2">
                        <span className="text-sm">{email}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeAllowlistEmail(email)} disabled={saving}>
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40">
              <CardHeader>
                <CardTitle className="text-xl">Send Inbox Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={notificationAudience}
                    onValueChange={(value) => {
                      setNotificationAudience(value as NotificationAudience);
                      setRecipientEmail("");
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single verified + allowlisted user</SelectItem>
                      <SelectItem value="all_verified_users">All verified website users</SelectItem>
                      <SelectItem value="team_members_only">Team members only (accepted)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {notificationAudience === "single" && (
                  <div className="space-y-2">
                    <Label>Recipient Email (must be verified + allowlisted)</Label>
                    <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={saving} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} disabled={saving} />
                </div>
                <Button type="button" variant="hero" onClick={sendNotification} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/40 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Forward Player Reports to Inbox</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Select Report</Label>
                  <Select value={forwardReportId || "__none__"} onValueChange={(value) => setForwardReportId(value === "__none__" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select report</SelectItem>
                      {reports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {(report.player_stats?.codename ?? "Unknown Player") + " - " + report.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {forwardReportId && (
                    <div className="rounded border border-border bg-background/40 p-3 text-sm text-muted-foreground">
                      {
                        reports.find((report) => report.id === forwardReportId)?.description
                      }
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Player Email (verified + allowlisted)</Label>
                    <Input value={forwardRecipientEmail} onChange={(e) => setForwardRecipientEmail(e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <Label>Forward Message</Label>
                    <Textarea value={forwardMessage} onChange={(e) => setForwardMessage(e.target.value)} disabled={saving} />
                  </div>
                  <Button type="button" variant="hero" onClick={forwardReport} disabled={saving}>
                    <Forward className="mr-2 h-4 w-4" /> Forward to Player Inbox
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
};

export default Inbox;

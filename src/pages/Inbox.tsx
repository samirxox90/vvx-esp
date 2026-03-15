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

const notificationSchema = z.object({
  recipientEmail: z.string().trim().email("Recipient email is invalid"),
  title: z.string().trim().min(2, "Title is required").max(120, "Title is too long"),
  message: z.string().trim().min(4, "Message is required").max(2000, "Message is too long"),
});

const forwardSchema = z.object({
  reportId: z.string().uuid("Select a report first"),
  recipientEmail: z.string().trim().email("Recipient email is invalid"),
  message: z.string().trim().min(4, "Forward message is required").max(2000, "Message is too long"),
});

const allowlistSchema = z.object({
  email: z.string().trim().email("Email is invalid"),
});

const Inbox = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [allowlistEmails, setAllowlistEmails] = useState<string[]>([]);

  const [recipientEmail, setRecipientEmail] = useState("");
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

      const adminQueries = isAdmin
        ? [
            db.from("notification_allowlist").select("email").order("email", { ascending: true }),
            db
              .from("player_reports")
              .select("id, description, status, created_at, player_stats(codename, player_id)")
              .order("created_at", { ascending: false }),
          ]
        : [];

      const results = await Promise.all([notificationQuery, ...adminQueries]);
      const notificationResult = results[0];
      if (notificationResult.error) throw notificationResult.error;
      setNotifications((notificationResult.data ?? []) as InboxNotification[]);

      if (isAdmin) {
        const allowlistResult = results[1];
        const reportsResult = results[2];

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

    const channel = supabase
      .channel(`inbox-live-${user.id}-${isAdmin ? "admin" : "user"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_notifications" }, () => {
        void loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { error } = await db.rpc("send_inbox_notification_to_email", {
        _recipient_email: parsed.data.recipientEmail,
        _title: parsed.data.title,
        _message: parsed.data.message,
        _related_report_id: null,
      });
      if (error) throw error;
      setRecipientEmail("");
      setNotificationTitle("");
      setNotificationMessage("");
      toast.success("Notification sent");
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
                  <Label>Recipient Email (must be verified + allowlisted)</Label>
                  <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={saving} />
                </div>
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

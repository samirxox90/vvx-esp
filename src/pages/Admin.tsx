import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, Megaphone, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

type SiteContentKey = keyof SiteContent;

const initialContent: SiteContent = {
  hero_title: "",
  hero_tagline: "",
  team_description: "",
  featured_video_title: "",
  featured_video_url: "",
  featured_video_thumbnail_url: "",
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
};

const heroSectionFields: SiteContentKey[] = [
  "hero_title",
  "hero_tagline",
  "team_description",
  "featured_video_title",
  "featured_video_url",
  "featured_video_thumbnail_url",
];
const awardsSectionFields: SiteContentKey[] = [
  "player_of_match",
  "player_of_month",
  "player_of_season",
  "player_of_tournament",
  "tournament_date",
  "last_tournament_stats",
  "leaderboard_photo_url",
];
const aboutSectionFields: SiteContentKey[] = ["about_title", "about_description", "facebook_url", "discord_url"];

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
  banned_matches: number;
  ban_reason: string | null;
  stats: Record<string, number>;
  trends: Record<string, number[]>;
  updated_at: string;
}

interface JoinApplication {
  id: string;
  user_id: string;
  real_name: string;
  in_game_name: string;
  game_uid: string;
  gameplay_clip: string;
  playing_role: string;
  whatsapp: string;
  status: string;
  created_at: string;
}

interface RegisteredUser {
  user_id: string;
  email: string | null;
  created_at: string;
  email_confirmed_at: string | null;
}

interface Tournament {
  id: string;
  title: string;
  schedule_at: string;
  status: "pending" | "running" | "completed";
  squad_main: string[];
  squad_extra: string | null;
  notes: string | null;
  created_at: string;
}

interface TournamentFormState {
  id: string | null;
  title: string;
  schedule_at: string;
  status: "pending" | "running" | "completed";
  squad_main_1: string;
  squad_main_2: string;
  squad_main_3: string;
  squad_main_4: string;
  squad_extra: string;
  notes: string;
}

interface TournamentParticipationResult {
  tournament_id: string;
  tournament_title: string;
  schedule_at: string;
  user_id: string;
  user_email: string | null;
  invited_at: string;
  response: "pending" | "accepted" | "rejected";
  reject_reason: string | null;
  responded_at: string | null;
  is_allowlisted: boolean;
  is_team_member: boolean;
}

type InviteTarget = "all_team_members" | "selected_emails";

const roleOptions = ["Rusher", "Supporter", "Sniper", "Assaulter", "Boomber", "IGL/Leader", "Entry Fragger"];

const createEmptyTournamentForm = (): TournamentFormState => ({
  id: null,
  title: "",
  schedule_at: "",
  status: "pending",
  squad_main_1: "",
  squad_main_2: "",
  squad_main_3: "",
  squad_main_4: "",
  squad_extra: "",
  notes: "",
});

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const normalizeRole = (value: string | null) => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("igl") || normalized.includes("leader")) return "IGL/Leader";
  if (normalized.includes("rusher") || normalized.includes("entry")) return normalized.includes("entry") ? "Entry Fragger" : "Rusher";
  if (normalized.includes("support") || normalized.includes("supporter")) return "Supporter";
  if (normalized.includes("sniper") || normalized.includes("awp")) return "Sniper";
  if (normalized.includes("assaulter") || normalized.includes("assault")) return "Assaulter";
  if (normalized.includes("boomber") || normalized.includes("bomber")) return "Boomber";

  return value.trim();
};

const hasUnsavedSectionChanges = (current: SiteContent, saved: SiteContent, fields: SiteContentKey[]) =>
  fields.some((field) => (current[field] ?? "") !== (saved[field] ?? ""));

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
  banned_matches: 0,
  ban_reason: null,
  stats: { rating: 1 },
  trends: {},
  updated_at: new Date().toISOString(),
});

const normalizePlayerForComparison = (player: Player) => ({
  player_id: player.player_id?.trim() ?? "",
  codename: player.codename?.trim() ?? "",
  real_name: player.real_name?.trim() ?? "",
  role: normalizeRole(player.role),
  country: player.country?.trim() ?? "",
  age: player.age ?? null,
  bio: player.bio?.trim() ?? "",
  image_url: player.image_url ?? "",
  banned_matches: Math.max(0, Number(player.banned_matches ?? 0)),
  ban_reason: player.ban_reason?.trim() ?? "",
  rating: getPlayerRatingValue(player.stats),
  trends: player.trends ?? {},
});

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [savedContent, setSavedContent] = useState<SiteContent>(initialContent);
  const [players, setPlayers] = useState<Player[]>([]);
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("__new__");
  const [tournamentForm, setTournamentForm] = useState<TournamentFormState>(createEmptyTournamentForm());
  const [inviteTitle, setInviteTitle] = useState("Tournament Invite");
  const [inviteMessage, setInviteMessage] = useState("Do you want to play our next tournament?");
  const [inviteTarget, setInviteTarget] = useState<InviteTarget>("all_team_members");
  const [allowlistEmails, setAllowlistEmails] = useState<string[]>([]);
  const [selectedInviteEmails, setSelectedInviteEmails] = useState<string[]>([]);
  const [selectedAllowlistCandidateEmails, setSelectedAllowlistCandidateEmails] = useState<string[]>([]);
  const [manualAllowlistEmail, setManualAllowlistEmail] = useState("");
  const [participationResults, setParticipationResults] = useState<TournamentParticipationResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [ratingInput, setRatingInput] = useState("1.00");
  const [uploadingPlayerImage, setUploadingPlayerImage] = useState(false);
  const [uploadingLeaderboardImage, setUploadingLeaderboardImage] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [participationResultsLoading, setParticipationResultsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTournamentForResults = selectedTournamentId === "__new__" ? null : selectedTournamentId;

  const eligibleInviteEmails = useMemo(() => {
    const allowlisted = new Set(allowlistEmails.map((email) => email.toLowerCase()));

    return registeredUsers
      .filter((item) => item.email)
      .map((item) => item.email!.toLowerCase())
      .filter((email) => allowlisted.has(email))
      .sort((a, b) => a.localeCompare(b));
  }, [allowlistEmails, registeredUsers]);

  const registeredEmails = useMemo(
    () =>
      registeredUsers
        .filter((item) => item.email)
        .map((item) => item.email!.toLowerCase())
        .sort((a, b) => a.localeCompare(b)),
    [registeredUsers],
  );

  const addableRegisteredEmails = useMemo(
    () => registeredEmails.filter((email) => !allowlistEmails.some((allowedEmail) => allowedEmail.toLowerCase() === email)),
    [allowlistEmails, registeredEmails],
  );

  const heroHasUnsavedChanges = hasUnsavedSectionChanges(content, savedContent, heroSectionFields);
  const awardsHasUnsavedChanges = hasUnsavedSectionChanges(content, savedContent, awardsSectionFields);
  const aboutHasUnsavedChanges = hasUnsavedSectionChanges(content, savedContent, aboutSectionFields);
  const hasAnyContentUnsavedChanges = heroHasUnsavedChanges || awardsHasUnsavedChanges || aboutHasUnsavedChanges;

  const selectedPlayerSnapshot = selectedPlayer ? normalizePlayerForComparison(selectedPlayer) : null;
  const persistedSelectedPlayer = selectedPlayer ? players.find((player) => player.id === selectedPlayer.id) : null;
  const persistedSelectedPlayerSnapshot = persistedSelectedPlayer ? normalizePlayerForComparison(persistedSelectedPlayer) : null;
  const selectedPlayerHasUnsavedChanges = selectedPlayer
    ? !persistedSelectedPlayerSnapshot || JSON.stringify(selectedPlayerSnapshot) !== JSON.stringify(persistedSelectedPlayerSnapshot)
    : false;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      void Promise.all([loadContent(), loadPlayers(), loadApplications(), loadRegisteredUsers(), loadAllowlistEmails(), loadTournaments()]);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadParticipationResults(selectedTournamentForResults);
  }, [isAdmin, selectedTournamentForResults]);

  useEffect(() => {
    setSelectedInviteEmails((prev) => prev.filter((email) => eligibleInviteEmails.includes(email)));
  }, [eligibleInviteEmails]);

  useEffect(() => {
    setSelectedAllowlistCandidateEmails((prev) => prev.filter((email) => addableRegisteredEmails.includes(email)));
  }, [addableRegisteredEmails]);

  useEffect(() => {
    if (selectedTournamentId === "__new__") {
      setTournamentForm(createEmptyTournamentForm());
      return;
    }

    const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId);
    if (!selectedTournament) {
      setTournamentForm(createEmptyTournamentForm());
      return;
    }

    const [squad1 = "", squad2 = "", squad3 = "", squad4 = ""] = selectedTournament.squad_main ?? [];
    setTournamentForm({
      id: selectedTournament.id,
      title: selectedTournament.title,
      schedule_at: toDateTimeLocal(selectedTournament.schedule_at),
      status: selectedTournament.status,
      squad_main_1: squad1,
      squad_main_2: squad2,
      squad_main_3: squad3,
      squad_main_4: squad4,
      squad_extra: selectedTournament.squad_extra ?? "",
      notes: selectedTournament.notes ?? "",
    });
  }, [selectedTournamentId, tournaments]);

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
        const nextContent = { ...initialContent, ...contentMap };
        setContent(nextContent);
        setSavedContent(nextContent);
      }
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content");
    }
  };

  const loadPlayers = async () => {
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from("player_stats")
        .select("id, player_id, codename, real_name, role, country, age, bio, image_url, banned_matches, ban_reason, stats, trends, updated_at")
        .order("codename", { ascending: true });
      if (error) throw error;

      const nextPlayers = ((data || []) as Player[]).map((player) => ({
        ...player,
        role: normalizeRole(player.role),
        banned_matches: Math.max(0, Number(player.banned_matches ?? 0)),
        ban_reason: player.ban_reason ?? null,
        stats: player.stats ?? {},
        trends: player.trends ?? {},
      }));
      setPlayers(nextPlayers);
      setSelectedPlayer((prevSelected) => {
        if (nextPlayers.length === 0) return null;
        if (!prevSelected) return nextPlayers[0];
        return nextPlayers.find((player) => player.id === prevSelected.id) ?? nextPlayers[0];
      });
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error(error instanceof Error ? `Failed to load players: ${error.message}` : "Failed to load players");
    }
  };

  const removePlayer = async (playerToRemove: Player) => {
    const confirmed = window.confirm(`Remove ${playerToRemove.codename}? This cannot be undone.`);
    if (!confirmed) return;

    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("player_stats").delete().eq("id", playerToRemove.id);
      if (error) throw error;

      setPlayers((prev) => prev.filter((player) => player.id !== playerToRemove.id));
      setSelectedPlayer((prevSelected) => {
        if (!prevSelected || prevSelected.id !== playerToRemove.id) return prevSelected;
        const remaining = players.filter((player) => player.id !== playerToRemove.id);
        return remaining[0] ?? null;
      });

      toast.success("Player removed");
    } catch (error) {
      console.error("Error removing player:", error);
      toast.error(error instanceof Error ? `Failed to remove player: ${error.message}` : "Failed to remove player");
    } finally {
      setSaving(false);
    }
  };

  const loadApplications = async () => {
    try {
      const db = supabase as any;
      const { data, error } = await db.from("join_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setApplications((data ?? []) as JoinApplication[]);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load applications");
    }
  };

  const loadRegisteredUsers = async () => {
    setUsersLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db.rpc("admin_list_registered_users");
      if (error) throw error;
      setRegisteredUsers((data ?? []) as RegisteredUser[]);
    } catch (error) {
      console.error("Error loading registered users:", error);
      toast.error("Failed to load registered users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAllowlistEmails = async () => {
    try {
      const db = supabase as any;
      const { data, error } = await db.from("notification_allowlist").select("email").order("email", { ascending: true });
      if (error) throw error;
      setAllowlistEmails(((data ?? []) as Array<{ email: string }>).map((item) => item.email));
    } catch (error) {
      console.error("Error loading allowlist:", error);
      toast.error("Failed to load allowlisted emails");
    }
  };

  const loadParticipationResults = async (tournamentId: string | null) => {
    setParticipationResultsLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db.rpc("admin_get_tournament_participation_results", {
        _tournament_id: tournamentId,
      });
      if (error) throw error;
      setParticipationResults((data ?? []) as TournamentParticipationResult[]);
    } catch (error) {
      console.error("Error loading participation results:", error);
      toast.error(error instanceof Error ? `Failed to load participation results: ${error.message}` : "Failed to load participation results");
    } finally {
      setParticipationResultsLoading(false);
    }
  };

  const loadTournaments = async () => {
    setTournamentsLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db.from("tournaments").select("*").order("schedule_at", { ascending: true });
      if (error) throw error;
      setTournaments((data ?? []) as Tournament[]);
    } catch (error) {
      console.error("Error loading tournaments:", error);
      toast.error(error instanceof Error ? `Failed to load tournaments: ${error.message}` : "Failed to load tournaments");
    } finally {
      setTournamentsLoading(false);
    }
  };

  const saveTournament = async () => {
    if (!tournamentForm.title.trim()) {
      toast.error("Tournament title is required");
      return;
    }

    if (!tournamentForm.schedule_at) {
      toast.error("Tournament schedule is required");
      return;
    }

    const squadMain = [
      tournamentForm.squad_main_1,
      tournamentForm.squad_main_2,
      tournamentForm.squad_main_3,
      tournamentForm.squad_main_4,
    ].map((item) => item.trim());

    if (squadMain.some((item) => !item)) {
      toast.error("Please fill all 4 main squad players");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const payload = {
        title: tournamentForm.title.trim(),
        schedule_at: new Date(tournamentForm.schedule_at).toISOString(),
        status: tournamentForm.status,
        squad_main: squadMain,
        squad_extra: tournamentForm.squad_extra.trim() || null,
        notes: tournamentForm.notes.trim() || null,
        created_by: user?.id ?? null,
      };

      if (tournamentForm.id) {
        const { error } = await db.from("tournaments").update(payload).eq("id", tournamentForm.id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("tournaments").insert(payload).select("id").single();
        if (error) throw error;
        if (data?.id) setSelectedTournamentId(data.id);
      }

      await loadTournaments();
      toast.success("Tournament saved");
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast.error(error instanceof Error ? `Failed to save tournament: ${error.message}` : "Failed to save tournament");
    } finally {
      setSaving(false);
    }
  };

  const deleteTournament = async () => {
    if (!tournamentForm.id) {
      toast.error("Select a saved tournament first");
      return;
    }

    const selectedTournament = tournaments.find((item) => item.id === tournamentForm.id);
    const confirmed = window.confirm(`Delete tournament \"${selectedTournament?.title ?? "this tournament"}\"?`);
    if (!confirmed) return;

    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("tournaments").delete().eq("id", tournamentForm.id);
      if (error) throw error;

      setSelectedTournamentId("__new__");
      setTournamentForm(createEmptyTournamentForm());
      await loadTournaments();
      toast.success("Tournament removed");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error(error instanceof Error ? `Failed to delete tournament: ${error.message}` : "Failed to delete tournament");
    } finally {
      setSaving(false);
    }
  };

  const sendTournamentInvites = async () => {
    const tournamentId = tournamentForm.id;
    if (!tournamentId) {
      toast.error("Select a saved tournament first");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const selectedTournament = tournaments.find((item) => item.id === tournamentId) ?? null;
      const scheduleText = selectedTournament ? new Date(selectedTournament.schedule_at).toLocaleString() : "Not set";
      const mainSquadText = selectedTournament?.squad_main?.filter(Boolean).join(", ") || "Not set";
      const extraSquadText = selectedTournament?.squad_extra?.trim() || "Not set";
      const defaultMessage = "Do you want to play our next tournament?";
      const baseMessage = inviteMessage.trim() || defaultMessage;
      const finalMessage = `${baseMessage}\n\nTournament: \"${selectedTournament?.title ?? "Tournament"}\"\nSchedule: ${scheduleText}\nMain Squad: ${mainSquadText}\nExtra: ${extraSquadText}`;

      if (inviteTarget === "selected_emails") {
        if (selectedInviteEmails.length === 0) {
          toast.error("Select at least one allowlisted registered email");
          return;
        }

        const { data, error } = await db.rpc("admin_send_tournament_invites_to_selected_emails", {
          _tournament_id: tournamentId,
          _emails: selectedInviteEmails,
          _title: inviteTitle,
          _message: finalMessage,
        });
        if (error) throw error;
        const sentCount = Number(data ?? 0);
        if (sentCount === 0) {
          toast.error("No selected recipients received invite");
          return;
        }
        toast.success(`Invites sent to ${sentCount} selected recipient(s)`);
      } else {
        const acceptedTeamMemberUserIds = new Set(
          applications.filter((item) => item.status === "accepted").map((item) => item.user_id),
        );
        const teamMemberEmails = registeredUsers
          .filter((item) => item.email && acceptedTeamMemberUserIds.has(item.user_id))
          .map((item) => item.email!.toLowerCase());

        if (teamMemberEmails.length === 0) {
          toast.error("No accepted team members found for invite");
          return;
        }

        const { data, error } = await db.rpc("admin_send_tournament_invites_to_selected_emails", {
          _tournament_id: tournamentId,
          _emails: teamMemberEmails,
          _title: inviteTitle,
          _message: finalMessage,
        });
        if (error) throw error;
        const sentCount = Number(data ?? 0);
        if (sentCount === 0) {
          toast.error("No team members received invite");
          return;
        }
        toast.success(`Invites sent to ${sentCount} team member(s)`);
      }

      await loadParticipationResults(tournamentId);
    } catch (error) {
      console.error("Error sending tournament invites:", error);
      toast.error(error instanceof Error ? `Failed to send invites: ${error.message}` : "Failed to send invites");
    } finally {
      setSaving(false);
    }
  };

  const addRegisteredEmailsToAllowlist = async () => {
    const normalizedManualEmail = manualAllowlistEmail.trim().toLowerCase();
    const selectedSet = new Set(selectedAllowlistCandidateEmails);

    if (normalizedManualEmail) {
      selectedSet.add(normalizedManualEmail);
    }

    const selectedEmails = Array.from(selectedSet).filter((email) => registeredEmails.includes(email));

    if (selectedEmails.length === 0) {
      toast.error("Select at least one registered email");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const alreadyAllowed = new Set(allowlistEmails.map((email) => email.toLowerCase()));
      const emailsToInsert = selectedEmails.filter((email) => !alreadyAllowed.has(email));

      if (emailsToInsert.length === 0) {
        toast.error("Selected emails are already in allowed list");
        return;
      }

      const { error } = await db.from("notification_allowlist").insert(
        emailsToInsert.map((email) => ({
          email,
          added_by: user?.id ?? null,
        })),
      );
      if (error) throw error;

      setManualAllowlistEmail("");
      setSelectedAllowlistCandidateEmails([]);
      await loadAllowlistEmails();
      toast.success(`Added ${emailsToInsert.length} email(s) to allowed list`);
    } catch (error) {
      console.error("Error adding allowlist emails:", error);
      toast.error(error instanceof Error ? `Failed to add emails: ${error.message}` : "Failed to add emails");
    } finally {
      setSaving(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: "accepted" | "rejected") => {
    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("join_applications").update({ status }).eq("id", applicationId);
      if (error) throw error;
      setApplications((prev) => prev.map((application) => (application.id === applicationId ? { ...application, status } : application)));
      toast.success(`Application ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setSaving(false);
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

  const saveContentFields = async (fields: SiteContentKey[], successMessage = "Content saved") => {
    setSaving(true);
    try {
      const contentPayload = fields.map((key) => ({ key, content: content[key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(contentPayload, { onConflict: "key" });
      if (error) throw error;
      await loadContent();
      toast.success(successMessage);
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const saveContent = async () => {
    await saveContentFields(Object.keys(content) as SiteContentKey[]);
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
        banned_matches: Math.max(0, Number(selectedPlayer.banned_matches ?? 0)),
        ban_reason: (selectedPlayer.ban_reason ?? "").trim() || null,
        updated_at: new Date().toISOString(),
        stats: {
          ...selectedPlayer.stats,
          rating,
        },
      };

      const db = supabase as any;
      const { error } = await db.from("player_stats").upsert(playerToSave, { onConflict: "id" });
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
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Site Content</h2>
            <Badge variant={hasAnyContentUnsavedChanges ? "destructive" : "secondary"}>
              {hasAnyContentUnsavedChanges ? "Unsaved changes" : "All changes saved"}
            </Badge>
          </div>
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
            <div>
              <Label>Featured Video Title</Label>
              <Input
                value={content.featured_video_title}
                onChange={(e) => setContent({ ...content, featured_video_title: e.target.value })}
                placeholder="Grand Finals Highlights"
              />
            </div>
            <div>
              <Label>Featured Video URL</Label>
              <Input
                value={content.featured_video_url}
                onChange={(e) => setContent({ ...content, featured_video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div>
              <Label>Featured Video Thumbnail URL (Top of Website)</Label>
              <Input
                value={content.featured_video_thumbnail_url}
                onChange={(e) => setContent({ ...content, featured_video_thumbnail_url: e.target.value })}
                placeholder="https://.../thumbnail.jpg"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="hero"
                onClick={() => saveContentFields(heroSectionFields, "Hero section saved")}
                disabled={saving || !heroHasUnsavedChanges}
              >
                <Save className="mr-2 h-4 w-4" /> Save Hero Section
              </Button>
              <Badge variant={heroHasUnsavedChanges ? "destructive" : "secondary"}>
                {heroHasUnsavedChanges ? "Unsaved" : "Saved"}
              </Badge>
            </div>

            <div className="space-y-4 border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl">Player Awards (Add / Delete)</h3>
                <Badge variant={awardsHasUnsavedChanges ? "destructive" : "secondary"}>
                  {awardsHasUnsavedChanges ? "Unsaved" : "Saved"}
                </Badge>
              </div>
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

              <Button
                type="button"
                variant="hero"
                onClick={() => saveContentFields(awardsSectionFields, "Awards and tournament settings saved")}
                disabled={saving || !awardsHasUnsavedChanges}
              >
                <Save className="mr-2 h-4 w-4" /> Save Awards & Tournament
              </Button>
            </div>

            <div className="space-y-4 border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl">About Section + Socials</h3>
                <Badge variant={aboutHasUnsavedChanges ? "destructive" : "secondary"}>
                  {aboutHasUnsavedChanges ? "Unsaved" : "Saved"}
                </Badge>
              </div>
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

              <Button
                type="button"
                variant="hero"
                onClick={() => saveContentFields(aboutSectionFields, "About and socials saved")}
                disabled={saving || !aboutHasUnsavedChanges}
              >
                <Save className="mr-2 h-4 w-4" /> Save About & Socials
              </Button>
            </div>

            <Button type="button" variant="hero" onClick={saveContent} disabled={saving || !hasAnyContentUnsavedChanges}>
              <Save className="mr-2 h-4 w-4" /> Save All Site Content
            </Button>
          </div>
        </section>

        <section className="mb-12 border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Tournament Control Center</h2>
            <Badge variant="secondary">{tournaments.length} total</Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded border border-border bg-background/40 p-4">
              <div className="space-y-2">
                <Label>Choose Tournament</Label>
                <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ New Tournament</SelectItem>
                    {tournaments.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title} ({item.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tournament Title</Label>
                <Input value={tournamentForm.title} onChange={(e) => setTournamentForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Schedule Time</Label>
                  <Input
                    type="datetime-local"
                    value={tournamentForm.schedule_at}
                    onChange={(e) => setTournamentForm((prev) => ({ ...prev, schedule_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={tournamentForm.status}
                    onValueChange={(value) =>
                      setTournamentForm((prev) => ({ ...prev, status: value as TournamentFormState["status"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Squad Main Players (4 Required)</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Main Player 1"
                    value={tournamentForm.squad_main_1}
                    onChange={(e) => setTournamentForm((prev) => ({ ...prev, squad_main_1: e.target.value }))}
                  />
                  <Input
                    placeholder="Main Player 2"
                    value={tournamentForm.squad_main_2}
                    onChange={(e) => setTournamentForm((prev) => ({ ...prev, squad_main_2: e.target.value }))}
                  />
                  <Input
                    placeholder="Main Player 3"
                    value={tournamentForm.squad_main_3}
                    onChange={(e) => setTournamentForm((prev) => ({ ...prev, squad_main_3: e.target.value }))}
                  />
                  <Input
                    placeholder="Main Player 4"
                    value={tournamentForm.squad_main_4}
                    onChange={(e) => setTournamentForm((prev) => ({ ...prev, squad_main_4: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Extra Player (1)</Label>
                <Input
                  placeholder="Extra player"
                  value={tournamentForm.squad_extra}
                  onChange={(e) => setTournamentForm((prev) => ({ ...prev, squad_extra: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={tournamentForm.notes} onChange={(e) => setTournamentForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="hero" onClick={saveTournament} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Save Tournament
                </Button>
                <Button type="button" variant="destructive" onClick={deleteTournament} disabled={saving || !tournamentForm.id}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove Tournament
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded border border-border bg-background/40 p-4">
              <h3 className="font-display text-xl">Send Participation Invite</h3>
              <p className="text-xs text-muted-foreground">Add registered emails, quote scheduled tournament details, and send participation invites.</p>

              <div className="space-y-2 rounded border border-border bg-background/30 p-3">
                <Label className="text-xs">Add Registered User Email To Allowed List</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={manualAllowlistEmail}
                    onChange={(e) => setManualAllowlistEmail(e.target.value)}
                    placeholder="Enter registered email"
                  />
                  <Button type="button" variant="outline" onClick={addRegisteredEmailsToAllowlist} disabled={saving}>
                    Add Email
                  </Button>
                </div>

                {addableRegisteredEmails.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All verified registered users are already in allowed list.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Select registered users ({selectedAllowlistCandidateEmails.length}/{addableRegisteredEmails.length})
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedAllowlistCandidateEmails((prev) =>
                            prev.length === addableRegisteredEmails.length ? [] : addableRegisteredEmails,
                          )
                        }
                      >
                        {selectedAllowlistCandidateEmails.length === addableRegisteredEmails.length ? "Clear All" : "Select All"}
                      </Button>
                    </div>

                    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                      {addableRegisteredEmails.map((email) => {
                        const isChecked = selectedAllowlistCandidateEmails.includes(email);
                        return (
                          <label key={`allowlist-${email}`} className="flex cursor-pointer items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-xs">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                setSelectedAllowlistCandidateEmails((prev) => {
                                  if (checked) return [...prev, email];
                                  return prev.filter((item) => item !== email);
                                })
                              }
                            />
                            <span>{email}</span>
                          </label>
                        );
                      })}
                    </div>

                    <Button type="button" variant="hero" onClick={addRegisteredEmailsToAllowlist} disabled={saving}>
                      Add Selected To Allowed List
                    </Button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notification Title</Label>
                <Input value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Invite Target</Label>
                <Select value={inviteTarget} onValueChange={(value) => setInviteTarget(value as InviteTarget)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_team_members">All Team Members</SelectItem>
                    <SelectItem value="selected_emails">Selected Allowed Emails</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteTarget === "selected_emails" && (
                <div className="space-y-2 rounded border border-border bg-background/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Allowed team member emails ({selectedInviteEmails.length}/{eligibleInviteEmails.length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedInviteEmails((prev) =>
                          prev.length === eligibleInviteEmails.length ? [] : eligibleInviteEmails,
                        )
                      }
                    >
                      {selectedInviteEmails.length === eligibleInviteEmails.length ? "Clear All" : "Select All"}
                    </Button>
                  </div>
                  {eligibleInviteEmails.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No allowlisted registered emails found.</p>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {eligibleInviteEmails.map((email) => {
                        const isChecked = selectedInviteEmails.includes(email);
                        return (
                          <label key={email} className="flex cursor-pointer items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-xs">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                setSelectedInviteEmails((prev) => {
                                  if (checked) return [...prev, email];
                                  return prev.filter((item) => item !== email);
                                })
                              }
                            />
                            <span>{email}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notification Message</Label>
                <Textarea value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} />
              </div>

              <Button type="button" variant="hero" onClick={sendTournamentInvites} disabled={saving || !tournamentForm.id}>
                <Megaphone className="mr-2 h-4 w-4" /> Send To Team Members
              </Button>

              <div className="space-y-2 pt-3">
                <h4 className="font-display text-lg">Upcoming + Running</h4>
                {tournamentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading tournaments...</p>
                ) : tournaments.filter((item) => item.status !== "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending or running tournaments.</p>
                ) : (
                  tournaments
                    .filter((item) => item.status !== "completed")
                    .map((item) => (
                      <div key={item.id} className="rounded border border-border px-3 py-2 text-sm">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                          {new Date(item.schedule_at).toLocaleString()} • {item.status}
                        </p>
                      </div>
                    ))
                )}
              </div>

              <div className="space-y-2 pt-3">
                <h4 className="font-display text-lg">Participation Results</h4>
                <p className="text-xs text-muted-foreground">Detailed invite outcomes for {selectedTournamentForResults ? "selected tournament" : "all tournaments"}.</p>
                {participationResultsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading participation results...</p>
                ) : participationResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No participation records yet.</p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {participationResults.map((item) => (
                      <div key={`${item.tournament_id}-${item.user_id}-${item.invited_at}`} className="rounded border border-border px-3 py-2 text-xs">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="font-medium">{item.user_email ?? "Unknown email"}</p>
                          <Badge
                            variant={
                              item.response === "accepted" ? "secondary" : item.response === "rejected" ? "destructive" : "outline"
                            }
                          >
                            {item.response}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">Tournament: {item.tournament_title}</p>
                        <p className="text-muted-foreground">Schedule: {new Date(item.schedule_at).toLocaleString()}</p>
                        <p className="text-muted-foreground">Invited: {new Date(item.invited_at).toLocaleString()}</p>
                        <p className="text-muted-foreground">Responded: {item.responded_at ? new Date(item.responded_at).toLocaleString() : "Pending"}</p>
                        <p className="text-muted-foreground">Allowlisted: {item.is_allowlisted ? "Yes" : "No"} • Team Member: {item.is_team_member ? "Yes" : "No"}</p>
                        {item.reject_reason && <p className="text-muted-foreground">Reject Reason: {item.reject_reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12 border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Applications</h2>
            <Badge variant="secondary">{applications.length} total</Badge>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => {
                const statusVariant: "secondary" | "destructive" | "outline" =
                  application.status === "accepted"
                    ? "secondary"
                    : application.status === "rejected"
                      ? "destructive"
                      : "outline";

                return (
                  <div key={application.id} className="rounded border border-border bg-background/40 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-lg">{application.in_game_name}</p>
                        <p className="text-xs text-muted-foreground">Real Name: {application.real_name}</p>
                      </div>
                      <Badge variant={statusVariant}>{application.status}</Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>Game UID: {application.game_uid}</p>
                      <p>Playing Role: {application.playing_role}</p>
                      <p>WhatsApp: {application.whatsapp}</p>
                      <p>Submitted: {new Date(application.created_at).toLocaleString()}</p>
                      <p className="md:col-span-2">
                        Gameplay Clip:{" "}
                        <a href={application.gameplay_clip} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                          Open Clip
                        </a>
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="hero"
                        onClick={() => updateApplicationStatus(application.id, "accepted")}
                        disabled={saving || application.status === "accepted"}
                      >
                        <Check className="mr-2 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => updateApplicationStatus(application.id, "rejected")}
                        disabled={saving || application.status === "rejected"}
                      >
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-12 border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">System Users</h2>
            <Badge variant="secondary">{registeredUsers.length} total</Badge>
          </div>

          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : registeredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered users found.</p>
          ) : (
            <div className="space-y-3">
              {registeredUsers.map((user) => (
                <div key={user.user_id} className="rounded border border-border bg-background/40 p-4">
                  <p className="text-sm">
                    <span className="font-semibold">Email:</span> {user.email ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">User ID: {user.user_id}</p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(user.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Email Verified: {user.email_confirmed_at ? new Date(user.email_confirmed_at).toLocaleString() : "Not verified"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Player Editor</h2>
            <Badge variant={selectedPlayerHasUnsavedChanges ? "destructive" : "secondary"}>
              {selectedPlayerHasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
            </Badge>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
            <Button type="button" variant="outline" onClick={addNewPlayer}>
              Add Player/Member
            </Button>
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-2">
                <Button variant={selectedPlayer?.id === player.id ? "hero" : "cathedral"} onClick={() => setSelectedPlayer(player)}>
                  {player.codename}
                </Button>
                <Button type="button" variant="destructive" size="icon" onClick={() => removePlayer(player)} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mb-6 space-y-3">
            {players.map((player) => (
              <div key={`details-${player.id}`} className="rounded border border-border bg-background/40 p-4 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <p>
                    <span className="font-semibold">Codename:</span> {player.codename}
                  </p>
                  <p>
                    <span className="font-semibold">In-Game UID:</span> {player.player_id}
                  </p>
                  <p>
                    <span className="font-semibold">Real Name:</span> {player.real_name || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Role:</span> {player.role || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Country:</span> {player.country || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Age:</span> {player.age ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Rating:</span> {getPlayerRatingValue(player.stats).toFixed(2)}
                  </p>
                  <p>
                    <span className="font-semibold">Banned Matches:</span> {Math.max(0, Number(player.banned_matches ?? 0))}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold">Ban Reason:</span> {player.ban_reason || "-"}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold">Bio:</span> {player.bio || "-"}
                  </p>
                  <p className="md:col-span-2 text-xs text-muted-foreground">Last Updated: {new Date(player.updated_at).toLocaleString()}</p>
                </div>
              </div>
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
                <div>
                  <Label>Banned for Matches</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={selectedPlayer.banned_matches ?? 0}
                    onChange={(e) =>
                      setSelectedPlayer({
                        ...selectedPlayer,
                        banned_matches: Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Ban Reason</Label>
                  <Textarea
                    value={selectedPlayer.ban_reason || ""}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, ban_reason: e.target.value })}
                    placeholder="Reason for ban (optional)"
                  />
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
            <Button variant="hero" onClick={savePlayer} disabled={saving || !selectedPlayer || !selectedPlayerHasUnsavedChanges}>
              <Save className="mr-2 h-4 w-4" /> Save Player
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;

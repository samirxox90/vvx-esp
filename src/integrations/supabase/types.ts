export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          added_at: string
          email: string
        }
        Insert: {
          added_at?: string
          email: string
        }
        Update: {
          added_at?: string
          email?: string
        }
        Relationships: []
      }
      inbox_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_user_id: string
          related_report_id: string | null
          sender_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_user_id: string
          related_report_id?: string | null
          sender_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_user_id?: string
          related_report_id?: string | null
          sender_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_notifications_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "player_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      join_applications: {
        Row: {
          created_at: string
          game_uid: string
          gameplay_clip: string
          id: string
          in_game_name: string
          playing_role: string
          real_name: string
          status: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          game_uid: string
          gameplay_clip: string
          id?: string
          in_game_name: string
          playing_role: string
          real_name: string
          status?: string
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          game_uid?: string
          gameplay_clip?: string
          id?: string
          in_game_name?: string
          playing_role?: string
          real_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      notification_allowlist: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
        }
        Relationships: []
      }
      player_reports: {
        Row: {
          created_at: string
          description: string
          forwarded_at: string | null
          forwarded_to_user_id: string | null
          id: string
          player_id: string
          reporter_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          forwarded_at?: string | null
          forwarded_to_user_id?: string | null
          id?: string
          player_id: string
          reporter_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          forwarded_at?: string | null
          forwarded_to_user_id?: string | null
          id?: string
          player_id?: string
          reporter_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          age: number | null
          ban_reason: string | null
          banned_matches: number
          bio: string | null
          codename: string
          country: string | null
          id: string
          image_url: string | null
          player_id: string
          real_name: string | null
          role: string | null
          stats: Json
          trends: Json
          updated_at: string
        }
        Insert: {
          age?: number | null
          ban_reason?: string | null
          banned_matches?: number
          bio?: string | null
          codename: string
          country?: string | null
          id?: string
          image_url?: string | null
          player_id: string
          real_name?: string | null
          role?: string | null
          stats?: Json
          trends?: Json
          updated_at?: string
        }
        Update: {
          age?: number | null
          ban_reason?: string | null
          banned_matches?: number
          bio?: string | null
          codename?: string
          country?: string | null
          id?: string
          image_url?: string | null
          player_id?: string
          real_name?: string | null
          role?: string | null
          stats?: Json
          trends?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          content: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_participations: {
        Row: {
          id: string
          invited_at: string
          reject_reason: string | null
          responded_at: string | null
          response: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          reject_reason?: string | null
          responded_at?: string | null
          response?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          reject_reason?: string | null
          responded_at?: string | null
          response?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          schedule_at: string
          squad_extra: string | null
          squad_main: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          schedule_at: string
          squad_extra?: string | null
          squad_main?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          schedule_at?: string
          squad_extra?: string | null
          squad_main?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_tournament_participation_results: {
        Args: { _tournament_id?: string }
        Returns: {
          invited_at: string
          is_allowlisted: boolean
          is_team_member: boolean
          reject_reason: string
          responded_at: string
          response: string
          schedule_at: string
          tournament_id: string
          tournament_title: string
          user_email: string
          user_id: string
        }[]
      }
      admin_list_registered_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          user_id: string
        }[]
      }
      admin_send_tournament_invites: {
        Args: { _message?: string; _title?: string; _tournament_id: string }
        Returns: number
      }
      admin_send_tournament_invites_to_selected_emails: {
        Args: {
          _emails: string[]
          _message?: string
          _title?: string
          _tournament_id: string
        }
        Returns: number
      }
      forward_report_to_player: {
        Args: { _message: string; _recipient_email: string; _report_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      send_inbox_notification_by_audience: {
        Args: { _audience: string; _message: string; _title: string }
        Returns: number
      }
      send_inbox_notification_to_email: {
        Args: {
          _message: string
          _recipient_email: string
          _related_report_id?: string
          _title: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

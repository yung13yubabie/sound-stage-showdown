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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      competition_rounds: {
        Row: {
          advancement_count: number | null
          advancement_rule: Database["public"]["Enums"]["advancement_rule"]
          allow_self_vote: boolean
          author_visibility_mode: Database["public"]["Enums"]["author_visibility_mode"]
          competition_id: string
          created_at: string
          description: string | null
          id: string
          judge_score_weight: number
          max_votes_per_user: number
          public_vote_weight: number
          reset_votes_from_previous_round: boolean
          results_publish_at: string | null
          reveal_at: string | null
          round_number: number
          status: Database["public"]["Enums"]["round_status"]
          submission_end_at: string | null
          submission_start_at: string | null
          title: string
          updated_at: string
          vote_count_visibility: Database["public"]["Enums"]["vote_count_visibility"]
          vote_phase_counting_mode: Database["public"]["Enums"]["vote_phase_counting_mode"]
          voter_visibility_mode: Database["public"]["Enums"]["voter_visibility_mode"]
          voting_end_at: string | null
          voting_start_at: string | null
        }
        Insert: {
          advancement_count?: number | null
          advancement_rule?: Database["public"]["Enums"]["advancement_rule"]
          allow_self_vote?: boolean
          author_visibility_mode?: Database["public"]["Enums"]["author_visibility_mode"]
          competition_id: string
          created_at?: string
          description?: string | null
          id?: string
          judge_score_weight?: number
          max_votes_per_user?: number
          public_vote_weight?: number
          reset_votes_from_previous_round?: boolean
          results_publish_at?: string | null
          reveal_at?: string | null
          round_number: number
          status?: Database["public"]["Enums"]["round_status"]
          submission_end_at?: string | null
          submission_start_at?: string | null
          title: string
          updated_at?: string
          vote_count_visibility?: Database["public"]["Enums"]["vote_count_visibility"]
          vote_phase_counting_mode?: Database["public"]["Enums"]["vote_phase_counting_mode"]
          voter_visibility_mode?: Database["public"]["Enums"]["voter_visibility_mode"]
          voting_end_at?: string | null
          voting_start_at?: string | null
        }
        Update: {
          advancement_count?: number | null
          advancement_rule?: Database["public"]["Enums"]["advancement_rule"]
          allow_self_vote?: boolean
          author_visibility_mode?: Database["public"]["Enums"]["author_visibility_mode"]
          competition_id?: string
          created_at?: string
          description?: string | null
          id?: string
          judge_score_weight?: number
          max_votes_per_user?: number
          public_vote_weight?: number
          reset_votes_from_previous_round?: boolean
          results_publish_at?: string | null
          reveal_at?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["round_status"]
          submission_end_at?: string | null
          submission_start_at?: string | null
          title?: string
          updated_at?: string
          vote_count_visibility?: Database["public"]["Enums"]["vote_count_visibility"]
          vote_phase_counting_mode?: Database["public"]["Enums"]["vote_phase_counting_mode"]
          voter_visibility_mode?: Database["public"]["Enums"]["voter_visibility_mode"]
          voting_end_at?: string | null
          voting_start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          allow_early_submission: boolean
          cover_url: string | null
          created_at: string
          description: string | null
          enable_warmup: boolean
          event_id: string | null
          host_id: string
          id: string
          rules: string | null
          show_warmup_countdown: boolean
          slug: string
          status: Database["public"]["Enums"]["competition_status"]
          theme: string | null
          title: string
          updated_at: string
          warmup_countdown_at: string | null
          warmup_description: string | null
          warmup_label: string | null
        }
        Insert: {
          allow_early_submission?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          enable_warmup?: boolean
          event_id?: string | null
          host_id: string
          id?: string
          rules?: string | null
          show_warmup_countdown?: boolean
          slug: string
          status?: Database["public"]["Enums"]["competition_status"]
          theme?: string | null
          title: string
          updated_at?: string
          warmup_countdown_at?: string | null
          warmup_description?: string | null
          warmup_label?: string | null
        }
        Update: {
          allow_early_submission?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          enable_warmup?: boolean
          event_id?: string | null
          host_id?: string
          id?: string
          rules?: string | null
          show_warmup_countdown?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["competition_status"]
          theme?: string | null
          title?: string
          updated_at?: string
          warmup_countdown_at?: string | null
          warmup_description?: string | null
          warmup_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_submissions: {
        Row: {
          creator_id: string
          event_id: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          track_id: string
        }
        Insert: {
          creator_id: string
          event_id: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          track_id: string
        }
        Update: {
          creator_id?: string
          event_id?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_submissions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_follow_before_start: boolean
          allow_reminder_before_start: boolean
          allow_song_submission: boolean
          cover_url: string | null
          created_at: string
          description: string | null
          embed_url: string | null
          enable_warmup: boolean
          ends_at: string | null
          host_id: string
          id: string
          related_competition_id: string | null
          show_warmup_countdown: boolean
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          warmup_countdown_at: string | null
          warmup_description: string | null
          warmup_label: string | null
          youtube_url: string | null
        }
        Insert: {
          allow_follow_before_start?: boolean
          allow_reminder_before_start?: boolean
          allow_song_submission?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          embed_url?: string | null
          enable_warmup?: boolean
          ends_at?: string | null
          host_id: string
          id?: string
          related_competition_id?: string | null
          show_warmup_countdown?: boolean
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          warmup_countdown_at?: string | null
          warmup_description?: string | null
          warmup_label?: string | null
          youtube_url?: string | null
        }
        Update: {
          allow_follow_before_start?: boolean
          allow_reminder_before_start?: boolean
          allow_song_submission?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          embed_url?: string | null
          enable_warmup?: boolean
          ends_at?: string | null
          host_id?: string
          id?: string
          related_competition_id?: string | null
          show_warmup_countdown?: boolean
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          warmup_countdown_at?: string | null
          warmup_description?: string | null
          warmup_label?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_related_competition_fk"
            columns: ["related_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          target_id: string | null
          target_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          target_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          instagram_url: string | null
          updated_at: string
          user_id: string
          username: string
          website_url: string | null
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          instagram_url?: string | null
          updated_at?: string
          user_id: string
          username: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          instagram_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          remind_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          remind_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          remind_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      round_entries: {
        Row: {
          anonymous_code: string | null
          competition_id: string
          created_at: string
          creator_id: string
          final_score: number | null
          id: string
          judge_average_score: number | null
          public_vote_count: number
          rank: number | null
          round_id: string
          seed_number: number | null
          source_entry_id: string | null
          status: Database["public"]["Enums"]["round_entry_status"]
          track_id: string
          updated_at: string
        }
        Insert: {
          anonymous_code?: string | null
          competition_id: string
          created_at?: string
          creator_id: string
          final_score?: number | null
          id?: string
          judge_average_score?: number | null
          public_vote_count?: number
          rank?: number | null
          round_id: string
          seed_number?: number | null
          source_entry_id?: string | null
          status?: Database["public"]["Enums"]["round_entry_status"]
          track_id: string
          updated_at?: string
        }
        Update: {
          anonymous_code?: string | null
          competition_id?: string
          created_at?: string
          creator_id?: string
          final_score?: number | null
          id?: string
          judge_average_score?: number | null
          public_vote_count?: number
          rank?: number | null
          round_id?: string
          seed_number?: number | null
          source_entry_id?: string | null
          status?: Database["public"]["Enums"]["round_entry_status"]
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_entries_source_entry_id_fkey"
            columns: ["source_entry_id"]
            isOneToOne: false
            referencedRelation: "round_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_entries_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          ai_disclosure: string | null
          audio_file_url: string | null
          bpm: number | null
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          embed_url: string | null
          genre: string | null
          id: string
          lyrics: string | null
          rights_statement: string | null
          slug: string
          source_type: Database["public"]["Enums"]["track_source"]
          source_url: string | null
          status: Database["public"]["Enums"]["track_status"]
          title: string
          tools_used: string | null
          updated_at: string
        }
        Insert: {
          ai_disclosure?: string | null
          audio_file_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          embed_url?: string | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          rights_statement?: string | null
          slug: string
          source_type: Database["public"]["Enums"]["track_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["track_status"]
          title: string
          tools_used?: string | null
          updated_at?: string
        }
        Update: {
          ai_disclosure?: string | null
          audio_file_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          embed_url?: string | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          rights_statement?: string | null
          slug?: string
          source_type?: Database["public"]["Enums"]["track_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["track_status"]
          title?: string
          tools_used?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          round_entry_id: string
          round_id: string
          visibility_mode: Database["public"]["Enums"]["voter_visibility_mode"]
          vote_weight: number
          voter_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          round_entry_id: string
          round_id: string
          visibility_mode?: Database["public"]["Enums"]["voter_visibility_mode"]
          vote_weight?: number
          voter_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          round_entry_id?: string
          round_id?: string
          visibility_mode?: Database["public"]["Enums"]["voter_visibility_mode"]
          vote_weight?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_round_entry_id_fkey"
            columns: ["round_entry_id"]
            isOneToOne: false
            referencedRelation: "round_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cast_vote: {
        Args: { _entry_id: string }
        Returns: {
          action: string
          vote_id: string
        }[]
      }
      get_round_entries: {
        Args: { _round_id: string }
        Returns: {
          anonymous_code: string
          competition_id: string
          creator_avatar_url: string
          creator_display_name: string
          creator_id: string
          creator_username: string
          final_score: number
          id: string
          public_vote_count: number
          rank: number
          round_id: string
          seed_number: number
          status: Database["public"]["Enums"]["round_entry_status"]
          track_cover_url: string
          track_embed_url: string
          track_id: string
          track_slug: string
          track_source: Database["public"]["Enums"]["track_source"]
          track_source_url: string
          track_title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      settle_round: { Args: { _round_id: string }; Returns: undefined }
    }
    Enums: {
      advancement_rule:
        | "top_n"
        | "score_threshold"
        | "judge_pick"
        | "host_manual"
        | "mixed"
      app_role: "admin" | "host" | "user"
      author_visibility_mode:
        | "public_all_the_time"
        | "anonymous_until_round_end"
        | "anonymous_until_competition_end"
        | "anonymous_then_public_voting"
      competition_status:
        | "draft"
        | "warmup"
        | "active"
        | "final_tallying"
        | "final_results_published"
        | "archived"
      event_status:
        | "draft"
        | "scheduled"
        | "warmup"
        | "live"
        | "ended"
        | "replay"
        | "archived"
      event_type:
        | "live_listening_session"
        | "song_competition"
        | "community_meetup"
        | "battle_night"
        | "final_reveal_live"
        | "radio_show"
        | "challenge"
      round_entry_status:
        | "pending"
        | "approved"
        | "rejected"
        | "advanced"
        | "eliminated"
        | "withdrawn"
      round_status:
        | "draft"
        | "warmup"
        | "submission_open"
        | "submission_closed"
        | "reviewing"
        | "voting_anonymous"
        | "identity_reveal"
        | "voting_public"
        | "tallying"
        | "round_results_published"
        | "completed"
      submission_status: "pending" | "approved" | "rejected" | "needs_revision"
      track_source:
        | "youtube"
        | "youtube_live"
        | "suno"
        | "udio"
        | "soundcloud"
        | "upload"
        | "external"
      track_status: "draft" | "published" | "removed"
      vote_count_visibility:
        | "hidden_until_round_end"
        | "live_count"
        | "percentage_only"
        | "hidden_until_final_results"
      vote_phase_counting_mode:
        | "continuous_votes"
        | "reset_after_reveal"
        | "separate_phase_scores"
      voter_visibility_mode:
        | "private_vote"
        | "public_voter_name"
        | "anonymous_to_public"
        | "admin_only"
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
    Enums: {
      advancement_rule: [
        "top_n",
        "score_threshold",
        "judge_pick",
        "host_manual",
        "mixed",
      ],
      app_role: ["admin", "host", "user"],
      author_visibility_mode: [
        "public_all_the_time",
        "anonymous_until_round_end",
        "anonymous_until_competition_end",
        "anonymous_then_public_voting",
      ],
      competition_status: [
        "draft",
        "warmup",
        "active",
        "final_tallying",
        "final_results_published",
        "archived",
      ],
      event_status: [
        "draft",
        "scheduled",
        "warmup",
        "live",
        "ended",
        "replay",
        "archived",
      ],
      event_type: [
        "live_listening_session",
        "song_competition",
        "community_meetup",
        "battle_night",
        "final_reveal_live",
        "radio_show",
        "challenge",
      ],
      round_entry_status: [
        "pending",
        "approved",
        "rejected",
        "advanced",
        "eliminated",
        "withdrawn",
      ],
      round_status: [
        "draft",
        "warmup",
        "submission_open",
        "submission_closed",
        "reviewing",
        "voting_anonymous",
        "identity_reveal",
        "voting_public",
        "tallying",
        "round_results_published",
        "completed",
      ],
      submission_status: ["pending", "approved", "rejected", "needs_revision"],
      track_source: [
        "youtube",
        "youtube_live",
        "suno",
        "udio",
        "soundcloud",
        "upload",
        "external",
      ],
      track_status: ["draft", "published", "removed"],
      vote_count_visibility: [
        "hidden_until_round_end",
        "live_count",
        "percentage_only",
        "hidden_until_final_results",
      ],
      vote_phase_counting_mode: [
        "continuous_votes",
        "reset_after_reveal",
        "separate_phase_scores",
      ],
      voter_visibility_mode: [
        "private_vote",
        "public_voter_name",
        "anonymous_to_public",
        "admin_only",
      ],
    },
  },
} as const

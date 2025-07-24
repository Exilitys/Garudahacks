export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          agreed_rate: number | null;
          application_priority: string | null;
          created_at: string;
          event_id: string;
          id: string;
          message: string | null;
          notification_sent: boolean | null;
          organizer_id: string;
          reminder_sent: boolean | null;
          responded_at: string | null;
          reviewer_notes: string | null;
          speaker_id: string;
          status: string;
          status_reason: string | null;
          updated_at: string;
        };
        Insert: {
          agreed_rate?: number | null;
          application_priority?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          message?: string | null;
          notification_sent?: boolean | null;
          organizer_id: string;
          reminder_sent?: boolean | null;
          responded_at?: string | null;
          reviewer_notes?: string | null;
          speaker_id: string;
          status?: string;
          status_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          agreed_rate?: number | null;
          application_priority?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          message?: string | null;
          notification_sent?: boolean | null;
          organizer_id?: string;
          reminder_sent?: boolean | null;
          responded_at?: string | null;
          reviewer_notes?: string | null;
          speaker_id?: string;
          status?: string;
          status_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speakers";
            referencedColumns: ["id"];
          }
        ];
      };
      employees: {
        Row: {
          id: number;
          name: string | null;
        };
        Insert: {
          id: number;
          name?: string | null;
        };
        Update: {
          id?: number;
          name?: string | null;
        };
        Relationships: [];
      };
      event_invitations: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          message: string | null;
          offered_rate: number | null;
          organizer_id: string;
          speaker_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          message?: string | null;
          offered_rate?: number | null;
          organizer_id: string;
          speaker_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          message?: string | null;
          offered_rate?: number | null;
          organizer_id?: string;
          speaker_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_invitations_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_invitations_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speakers";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          created_at: string;
          date_time: string;
          description: string;
          duration_hours: number;
          event_type: string;
          format: string;
          id: string;
          location: string | null;
          organizer_id: string;
          required_topics: string[] | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          date_time: string;
          description: string;
          duration_hours: number;
          event_type: string;
          format: string;
          id?: string;
          location?: string | null;
          organizer_id: string;
          required_topics?: string[] | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          date_time?: string;
          description?: string;
          duration_hours?: number;
          event_type?: string;
          format?: string;
          id?: string;
          location?: string | null;
          organizer_id?: string;
          required_topics?: string[] | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          location: string | null;
          updated_at: string;
          user_id: string;
          user_type: string;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          location?: string | null;
          updated_at?: string;
          user_id: string;
          user_type?: string;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          location?: string | null;
          updated_at?: string;
          user_id?: string;
          user_type?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          reviewee_id?: string;
          reviewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      speaker_topics: {
        Row: {
          id: string;
          speaker_id: string;
          topic_id: string;
        };
        Insert: {
          id?: string;
          speaker_id: string;
          topic_id: string;
        };
        Update: {
          id?: string;
          speaker_id?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_topics_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speakers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_topics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      speakers: {
        Row: {
          available: boolean;
          average_rating: number | null;
          created_at: string;
          experience_level: string;
          hourly_rate: number | null;
          id: string;
          profile_id: string;
          total_talks: number;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          available?: boolean;
          average_rating?: number | null;
          created_at?: string;
          experience_level?: string;
          hourly_rate?: number | null;
          id?: string;
          profile_id: string;
          total_talks?: number;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          available?: boolean;
          average_rating?: number | null;
          created_at?: string;
          experience_level?: string;
          hourly_rate?: number | null;
          id?: string;
          profile_id?: string;
          total_talks?: number;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "speakers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      topics: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      application_status_history: {
        Row: {
          booking_id: string;
          changed_by: string;
          created_at: string;
          id: string;
          new_status: string;
          notes: string | null;
          previous_status: string | null;
          reason: string | null;
        };
        Insert: {
          booking_id: string;
          changed_by: string;
          created_at?: string;
          id?: string;
          new_status: string;
          notes?: string | null;
          previous_status?: string | null;
          reason?: string | null;
        };
        Update: {
          booking_id?: string;
          changed_by?: string;
          created_at?: string;
          id?: string;
          new_status?: string;
          notes?: string | null;
          previous_status?: string | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "application_status_history_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      application_notifications: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          message: string | null;
          metadata: Json | null;
          notification_type: string;
          read_at: string | null;
          recipient_id: string;
          sent_at: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          notification_type: string;
          read_at?: string | null;
          recipient_id: string;
          sent_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          notification_type?: string;
          read_at?: string | null;
          recipient_id?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      speaker_invitations: {
        Row: {
          id: string;
          event_id: string;
          organizer_id: string;
          speaker_id: string;
          message: string | null;
          proposed_rate: number | null;
          status: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          organizer_id: string;
          speaker_id: string;
          message?: string | null;
          proposed_rate?: number | null;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          organizer_id?: string;
          speaker_id?: string;
          message?: string | null;
          proposed_rate?: number | null;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_invitations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_invitations_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_invitations_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speakers";
            referencedColumns: ["id"];
          }
        ];
      };
      speaker_invitation_history: {
        Row: {
          id: string;
          invitation_id: string;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invitation_id: string;
          old_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invitation_id?: string;
          old_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_invitation_history_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "speaker_invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_invitation_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      application_summary: {
        Row: {
          id: string;
          event_id: string;
          speaker_id: string;
          organizer_id: string;
          status: string;
          status_reason: string | null;
          agreed_rate: number | null;
          message: string | null;
          application_priority: string | null;
          created_at: string;
          updated_at: string;
          responded_at: string | null;
          event_title: string;
          event_date: string;
          event_format: string;
          event_type: string;
          speaker_name: string;
          speaker_avatar: string | null;
          organizer_name: string;
          experience_level: string;
          average_rating: number;
          hours_since_application: number;
          response_time_hours: number | null;
        };
        Relationships: [];
      };
      invitation_details: {
        Row: {
          id: string;
          event_id: string;
          organizer_id: string;
          speaker_id: string;
          message: string | null;
          proposed_rate: number | null;
          status: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          event_title: string;
          event_description: string;
          event_date: string;
          event_location: string | null;
          event_type: string;
          event_format: string;
          organizer_name: string;
          organizer_email: string;
          organizer_avatar: string | null;
          speaker_name: string;
          speaker_email: string;
          speaker_avatar: string | null;
          speaker_bio: string | null;
          speaker_expertise: string[] | null;
          speaker_experience: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_application_stats: {
        Args: {
          user_id_param: string;
        };
        Returns: {
          total_applications: number;
          pending_applications: number;
          accepted_applications: number;
          rejected_applications: number;
          completed_applications: number;
          response_rate: number;
          avg_response_time_hours: number;
        }[];
      };
      get_invitation_stats: {
        Args: {
          event_uuid: string;
        };
        Returns: {
          total_invitations: number;
          pending_invitations: number;
          accepted_invitations: number;
          declined_invitations: number;
          expired_invitations: number;
        }[];
      };
      expire_old_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

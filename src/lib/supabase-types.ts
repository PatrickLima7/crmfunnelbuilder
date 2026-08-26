// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --project-id atekqlroxrxxvpitqguy > src/lib/supabase-types.ts
// to regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: "admin" | "operator";
          cpf: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role?: "admin" | "operator";
          cpf?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          role?: "admin" | "operator";
          cpf?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          daily_contacts: number;
          daily_conversions: number;
          max_pause_minutes: number;
          max_step_minutes: number;
          call_target_minutes: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          daily_contacts?: number;
          daily_conversions?: number;
          max_pause_minutes?: number;
          max_step_minutes?: number;
          call_target_minutes?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          daily_contacts?: number;
          daily_conversions?: number;
          max_pause_minutes?: number;
          max_step_minutes?: number;
          call_target_minutes?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      script_steps: {
        Row: {
          id: string;
          position: number;
          title: string;
          checklist: string[];
          speech: string[];
          note_label: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          position: number;
          title: string;
          checklist?: string[];
          speech?: string[];
          note_label?: string;
          updated_at?: string;
        };
        Update: {
          position?: number;
          title?: string;
          checklist?: string[];
          speech?: string[];
          note_label?: string;
          updated_at?: string;
        };
      };
      operator_presence: {
        Row: {
          id: string;
          operator_id: string;
          state: "ligacao" | "whatsapp" | "ocioso" | "pausa";
          pause_reason: string | null;
          current_lead: string | null;
          contacts_today: number;
          conversions_today: number;
          talk_seconds: number;
          pause_seconds: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operator_id: string;
          state?: "ligacao" | "whatsapp" | "ocioso" | "pausa";
          pause_reason?: string | null;
          current_lead?: string | null;
          contacts_today?: number;
          conversions_today?: number;
          talk_seconds?: number;
          pause_seconds?: number;
          updated_at?: string;
        };
        Update: {
          state?: "ligacao" | "whatsapp" | "ocioso" | "pausa";
          pause_reason?: string | null;
          current_lead?: string | null;
          contacts_today?: number;
          conversions_today?: number;
          talk_seconds?: number;
          pause_seconds?: number;
          updated_at?: string;
        };
      };
      work_sessions: {
        Row: {
          id: string;
          operator_id: string;
          date: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          operator_id: string;
          date?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          ended_at?: string | null;
        };
      };
      pause_events: {
        Row: {
          id: string;
          operator_id: string;
          session_id: string | null;
          reason: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          operator_id: string;
          session_id?: string | null;
          reason: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          ended_at?: string | null;
        };
      };
      contact_events: {
        Row: {
          id: string;
          operator_id: string;
          session_id: string | null;
          lead_name: string | null;
          lead_phone: string | null;
          contact_type: "call" | "whatsapp";
          outcome: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          operator_id: string;
          session_id?: string | null;
          lead_name?: string | null;
          lead_phone?: string | null;
          contact_type: "call" | "whatsapp";
          outcome?: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          outcome?: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | null;
          ended_at?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          status: "pending" | "contacted" | "converted" | "inactive";
          temperature: "quente" | "morno" | "frio";
          assigned_to: string | null;
          notes: string | null;
          callback_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          status?: "pending" | "contacted" | "converted" | "inactive";
          temperature?: "quente" | "morno" | "frio";
          assigned_to?: string | null;
          notes?: string | null;
          callback_at?: string | null;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          status?: "pending" | "contacted" | "converted" | "inactive";
          temperature?: "quente" | "morno" | "frio";
          assigned_to?: string | null;
          notes?: string | null;
          callback_at?: string | null;
          updated_at?: string;
        };
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Goals = Database["public"]["Tables"]["goals"]["Row"];
export type ScriptStepRow = Database["public"]["Tables"]["script_steps"]["Row"];
export type OperatorPresence = Database["public"]["Tables"]["operator_presence"]["Row"];
export type WorkSession = Database["public"]["Tables"]["work_sessions"]["Row"];
export type PauseEvent = Database["public"]["Tables"]["pause_events"]["Row"];
export type ContactEvent = Database["public"]["Tables"]["contact_events"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type AppConfig = Database["public"]["Tables"]["app_config"]["Row"];

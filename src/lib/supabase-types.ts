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
          active: boolean;
          daily_contacts_goal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role?: "admin" | "operator";
          cpf?: string | null;
          avatar_url?: string | null;
          active?: boolean;
          daily_contacts_goal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          role?: "admin" | "operator";
          cpf?: string | null;
          avatar_url?: string | null;
          active?: boolean;
          daily_contacts_goal?: number | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      contact_events: {
        Row: {
          id: string;
          operator_id: string;
          session_id: string | null;
          lead_name: string | null;
          lead_phone: string | null;
          contact_type: "call" | "whatsapp" | "whatsapp_message";
          outcome: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | "retorno" | "errado" | "convertido" | "sem_interesse" | "numero_invalido" | "em_nutricao" | "agendado" | null;
          motivo_desinteresse: string | null;
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
          contact_type: "call" | "whatsapp" | "whatsapp_message";
          outcome?: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | "retorno" | "errado" | "convertido" | "sem_interesse" | "numero_invalido" | "em_nutricao" | "agendado" | null;
          motivo_desinteresse?: string | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          outcome?: "interessado" | "pensar" | "nao" | "sem_resposta" | "revisao" | "retorno" | "errado" | "convertido" | "sem_interesse" | "numero_invalido" | "em_nutricao" | "agendado" | null;
          motivo_desinteresse?: string | null;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          phone2: string | null;
          cpf: string | null;
          email: string | null;
          city: string | null;
          state: string | null;
          profession: string | null;
          company: string | null;
          status: "pending" | "novo" | "contacted" | "converted" | "inactive" | "em_nutricao" | "blacklisted";
          temperature: "quente" | "morno" | "frio";
          origin: string;
          assigned_to: string | null;
          notes: string | null;
          callback_at: string | null;
          historico: Json | null;
          midia: string | null;
          campanha: string | null;
          curso: string | null;
          data_nascimento: string | null;
          genero: string | null;
          cep: string | null;
          hr_para_contato: string | null;
          dt_matricula: string | null;
          informacao: string | null;
          observacao: string | null;
          detalhes: string | null;
          telefone_3: string | null;
          telefone_4: string | null;
          identificacao: string | null;
          data_primeiro_cadastro: string;
          data_ultimo_cadastro: string;
          data_ultimo_contato: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          phone2?: string | null;
          cpf?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          profession?: string | null;
          company?: string | null;
          status?: "pending" | "novo" | "contacted" | "converted" | "inactive" | "em_nutricao" | "blacklisted";
          temperature?: "quente" | "morno" | "frio";
          origin?: string;
          assigned_to?: string | null;
          notes?: string | null;
          callback_at?: string | null;
          historico?: Json | null;
          midia?: string | null;
          campanha?: string | null;
          curso?: string | null;
          data_nascimento?: string | null;
          genero?: string | null;
          cep?: string | null;
          hr_para_contato?: string | null;
          dt_matricula?: string | null;
          informacao?: string | null;
          observacao?: string | null;
          detalhes?: string | null;
          telefone_3?: string | null;
          telefone_4?: string | null;
          identificacao?: string | null;
          data_primeiro_cadastro?: string;
          data_ultimo_cadastro?: string;
          data_ultimo_contato?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          phone2?: string | null;
          cpf?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          profession?: string | null;
          company?: string | null;
          status?: "pending" | "novo" | "contacted" | "converted" | "inactive" | "em_nutricao" | "blacklisted";
          temperature?: "quente" | "morno" | "frio";
          origin?: string;
          assigned_to?: string | null;
          notes?: string | null;
          callback_at?: string | null;
          historico?: Json | null;
          midia?: string | null;
          campanha?: string | null;
          curso?: string | null;
          data_nascimento?: string | null;
          genero?: string | null;
          cep?: string | null;
          hr_para_contato?: string | null;
          dt_matricula?: string | null;
          informacao?: string | null;
          observacao?: string | null;
          detalhes?: string | null;
          telefone_3?: string | null;
          telefone_4?: string | null;
          identificacao?: string | null;
          data_primeiro_cadastro?: string;
          data_ultimo_cadastro?: string;
          data_ultimo_contato?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      midias: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nome?: string;
          ativo?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      pause_config: {
        Row: {
          id: string;
          nome: string;
          max_minutes: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          max_minutes?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nome?: string;
          max_minutes?: number;
          ativo?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      expediente_logs: {
        Row: {
          id: string;
          operator_id: string;
          session_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          contacts_count: number | null;
          conversions_count: number | null;
          talk_seconds: number | null;
          pause_seconds: number | null;
          summary_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operator_id: string;
          session_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          contacts_count?: number | null;
          conversions_count?: number | null;
          talk_seconds?: number | null;
          pause_seconds?: number | null;
          summary_json?: Json | null;
          created_at?: string;
        };
        Update: {
          ended_at?: string | null;
          duration_seconds?: number | null;
          contacts_count?: number | null;
          conversions_count?: number | null;
          talk_seconds?: number | null;
          pause_seconds?: number | null;
          summary_json?: Json | null;
        };
        Relationships: [];
      };
      cursos: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nome?: string;
          ativo?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
    CompositeTypes: Record<string, never>;
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
export type Midia = Database["public"]["Tables"]["midias"]["Row"];
export type PauseConfig = Database["public"]["Tables"]["pause_config"]["Row"];
export type ExpedienteLog = Database["public"]["Tables"]["expediente_logs"]["Row"];
export type Curso = Database["public"]["Tables"]["cursos"]["Row"];


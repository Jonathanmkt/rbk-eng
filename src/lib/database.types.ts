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
  // ⚠️ Bloco escrito à mão (não gerado). O schema `anki` já está exposto e
  // FUNCIONANDO na Data API real (confirmado via REST: GET .../rest/v1/decks
  // com header Accept-Profile: anki → 200), via override de role aplicado por
  // SQL (`alter role authenticator set pgrst.db_schemas = 'public, anki'` +
  // `notify pgrst, 'reload schema'`). Só a GERAÇÃO de tipos (`generate_typescript_types`)
  // ainda não o inclui, porque ela lê da config "Exposed schemas" do dashboard
  // (Project Settings > Data API), que é um armazenamento separado do override
  // de role e não é alcançável por SQL/MCP. Puramente cosmético: marque o
  // schema no dashboard quando quiser, regere e substitua este bloco (deve
  // ficar idêntico ao que já está aqui).
  anki: {
    Tables: {
      decks: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          audio_language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string
          name: string
          description?: string | null
          audio_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          audio_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          deck_id: string
          owner_id: string
          front: string
          back: string
          state: number
          due: string
          stability: number
          difficulty: number
          elapsed_days: number
          scheduled_days: number
          reps: number
          lapses: number
          learning_steps: number
          last_review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          owner_id?: string
          front: string
          back: string
          state?: number
          due?: string
          stability?: number
          difficulty?: number
          elapsed_days?: number
          scheduled_days?: number
          reps?: number
          lapses?: number
          learning_steps?: number
          last_review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          owner_id?: string
          front?: string
          back?: string
          state?: number
          due?: string
          stability?: number
          difficulty?: number
          elapsed_days?: number
          scheduled_days?: number
          reps?: number
          lapses?: number
          learning_steps?: number
          last_review?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      review_log: {
        Row: {
          id: string
          card_id: string
          owner_id: string
          rating: number
          state: number
          due: string
          stability: number
          difficulty: number
          elapsed_days: number
          scheduled_days: number
          reviewed_at: string
        }
        Insert: {
          id?: string
          card_id: string
          owner_id?: string
          rating: number
          state: number
          due: string
          stability: number
          difficulty: number
          elapsed_days: number
          scheduled_days: number
          reviewed_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          owner_id?: string
          rating?: number
          state?: number
          due?: string
          stability?: number
          difficulty?: number
          elapsed_days?: number
          scheduled_days?: number
          reviewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  // ⚠️ Bloco escrito à mão (não gerado), como o `anki` acima — mesmo motivo.
  leitor: {
    Tables: {
      books: {
        Row: {
          id: string
          title: string
          author: string | null
          language: string
          storage_path: string
          cover_path: string | null
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          author?: string | null
          language: string
          storage_path: string
          cover_path?: string | null
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string | null
          language?: string
          storage_path?: string
          cover_path?: string | null
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          id: string
          book_id: string
          user_id: string
          location_cfi: string | null
          fraction: number
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id?: string
          location_cfi?: string | null
          fraction?: number
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          location_cfi?: string | null
          fraction?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      word_bank: {
        Row: {
          id: string
          user_id: string
          book_id: string | null
          source_type: string
          selected_text: string
          paragraph_context: string | null
          translation_common: string | null
          translation_contextual: string | null
          context_explanation: string | null
          location_cfi: string | null
          language: string
          card_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          book_id?: string | null
          source_type?: string
          selected_text: string
          paragraph_context?: string | null
          translation_common?: string | null
          translation_contextual?: string | null
          context_explanation?: string | null
          location_cfi?: string | null
          language: string
          card_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string | null
          source_type?: string
          selected_text?: string
          paragraph_context?: string | null
          translation_common?: string | null
          translation_contextual?: string | null
          context_explanation?: string | null
          location_cfi?: string | null
          language?: string
          card_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_bank_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_bank_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_cache: {
        Row: {
          id: string
          source_text: string
          source_lang: string
          target_lang: string
          translated_text: string
          provider: string
          created_at: string
        }
        Insert: {
          id?: string
          source_text: string
          source_lang: string
          target_lang: string
          translated_text: string
          provider?: string
          created_at?: string
        }
        Update: {
          id?: string
          source_text?: string
          source_lang?: string
          target_lang?: string
          translated_text?: string
          provider?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  // ⚠️ Bloco escrito à mão (não gerado), como o `anki` e o `leitor` — o gerador só devolve o `public`.
  // Espelha as migrations `create_tutor_conversas` (30/09/2026) e `tutor_sessions_tipo_e_material` (02/10/2026).
  tutor: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          updated_at: string
          ended_at: string | null
          model: string | null
          usage: Json
          summary: string | null
          kind: 'livre' | 'musica'
          material: Json | null
        }
        Insert: {
          id?: string
          user_id?: string
          started_at?: string
          updated_at?: string
          ended_at?: string | null
          model?: string | null
          usage?: Json
          summary?: string | null
          kind?: 'livre' | 'musica'
          material?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          updated_at?: string
          ended_at?: string | null
          model?: string | null
          usage?: Json
          summary?: string | null
          kind?: 'livre' | 'musica'
          material?: Json | null
        }
        Relationships: []
      }
      session_turns: {
        Row: {
          id: string
          session_id: string
          idx: number
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          idx: number
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          idx?: number
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_turns_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          access_level: number
          avatar_url: string | null
          created_at: string
          id: string
          nome_completo: string | null
          permissions: string[]
          roles: string[]
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          access_level?: number
          avatar_url?: string | null
          created_at?: string
          id: string
          nome_completo?: string | null
          permissions?: string[]
          roles?: string[]
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: number
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome_completo?: string | null
          permissions?: string[]
          roles?: string[]
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

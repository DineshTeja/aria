export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          bio: string | null
          city: string | null
          id: number
          name: string
          specialty: string | null
          state: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          id?: number
          name: string
          specialty?: string | null
          state?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          id?: number
          name?: string
          specialty?: string | null
          state?: string | null
        }
        Relationships: []
      }
      knowledge: {
        Row: {
          article: string | null
          category: Database["public"]["Enums"]["category"] | null
          embedding: string | null
          id: string
          summary: string
          tag: string
          url: string | null
        }
        Insert: {
          article?: string | null
          category?: Database["public"]["Enums"]["category"] | null
          embedding?: string | null
          id?: string
          summary: string
          tag: string
          url?: string | null
        }
        Update: {
          article?: string | null
          category?: Database["public"]["Enums"]["category"] | null
          embedding?: string | null
          id?: string
          summary?: string
          tag?: string
          url?: string | null
        }
        Relationships: []
      }
      pdf_knowledge: {
        Row: {
          content: string | null
          created_at: string | null
          file_name: string
          file_path: string
          id: number
          summary: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          id?: number
          summary?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: number
          summary?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_documents: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          tag: string
          summary: string
          article: string
          category: Database["public"]["Enums"]["category"]
          similarity: number
        }[]
      }
    }
    Enums: {
      category:
        | "cardiovascular"
        | "respiratory"
        | "gastrointestinal"
        | "neurological"
        | "endocrine"
        | "hematological"
        | "infectious"
        | "musculoskeletal"
        | "autoimmune"
        | "cancer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

// Export categories array
export const categories = [
  "cardiovascular",
  "respiratory",
  "gastrointestinal",
  "neurological",
  "endocrine",
  "hematological",
  "infectious",
  "musculoskeletal",
  "autoimmune",
  "cancer",
];

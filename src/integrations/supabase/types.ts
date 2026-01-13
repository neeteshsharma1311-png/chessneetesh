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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "online_games"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_puzzles: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          fen: string
          id: string
          name: string
          player_color: string
          puzzle_date: string
          solution: string[]
          theme: string
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: string
          fen: string
          id?: string
          name: string
          player_color: string
          puzzle_date: string
          solution: string[]
          theme: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          fen?: string
          id?: string
          name?: string
          player_color?: string
          puzzle_date?: string
          solution?: string[]
          theme?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_invites: {
        Row: {
          created_at: string
          expires_at: string
          from_user_id: string
          game_id: string | null
          id: string
          status: string
          time_control: number | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_user_id: string
          game_id?: string | null
          id?: string
          status?: string
          time_control?: number | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_user_id?: string
          game_id?: string | null
          id?: string
          status?: string
          time_control?: number | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "online_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invites_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_moves: {
        Row: {
          created_at: string
          fen_after: string
          from_square: string
          game_id: string
          id: string
          move_number: number
          move_time_ms: number | null
          player_id: string
          san: string
          to_square: string
        }
        Insert: {
          created_at?: string
          fen_after: string
          from_square: string
          game_id: string
          id?: string
          move_number: number
          move_time_ms?: number | null
          player_id: string
          san: string
          to_square: string
        }
        Update: {
          created_at?: string
          fen_after?: string
          from_square?: string
          game_id?: string
          id?: string
          move_number?: number
          move_time_ms?: number | null
          player_id?: string
          san?: string
          to_square?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "online_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      online_games: {
        Row: {
          black_player_id: string | null
          black_time_remaining: number | null
          completed_at: string | null
          created_at: string
          current_turn: string
          draw_offered_by: string | null
          fen: string
          game_type: string
          id: string
          invite_code: string | null
          pgn: string | null
          result: string | null
          status: string
          time_control: number | null
          updated_at: string
          white_player_id: string | null
          white_time_remaining: number | null
          winner_id: string | null
        }
        Insert: {
          black_player_id?: string | null
          black_time_remaining?: number | null
          completed_at?: string | null
          created_at?: string
          current_turn?: string
          draw_offered_by?: string | null
          fen?: string
          game_type?: string
          id?: string
          invite_code?: string | null
          pgn?: string | null
          result?: string | null
          status?: string
          time_control?: number | null
          updated_at?: string
          white_player_id?: string | null
          white_time_remaining?: number | null
          winner_id?: string | null
        }
        Update: {
          black_player_id?: string | null
          black_time_remaining?: number | null
          completed_at?: string | null
          created_at?: string
          current_turn?: string
          draw_offered_by?: string | null
          fen?: string
          game_type?: string
          id?: string
          invite_code?: string | null
          pgn?: string | null
          result?: string | null
          status?: string
          time_control?: number | null
          updated_at?: string
          white_player_id?: string | null
          white_time_remaining?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_games_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "online_games_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "online_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          games_drawn: number
          games_lost: number
          games_played: number
          games_won: number
          id: string
          is_online: boolean
          last_seen: string | null
          rating: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          games_drawn?: number
          games_lost?: number
          games_played?: number
          games_won?: number
          id?: string
          is_online?: boolean
          last_seen?: string | null
          rating?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          games_drawn?: number
          games_lost?: number
          games_played?: number
          games_won?: number
          id?: string
          is_online?: boolean
          last_seen?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          black_player_id: string | null
          completed_at: string | null
          created_at: string
          game_id: string | null
          id: string
          match_number: number
          round: number
          scheduled_at: string | null
          status: string
          tournament_id: string
          white_player_id: string | null
          winner_id: string | null
        }
        Insert: {
          black_player_id?: string | null
          completed_at?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          match_number: number
          round: number
          scheduled_at?: string | null
          status?: string
          tournament_id: string
          white_player_id?: string | null
          winner_id?: string | null
        }
        Update: {
          black_player_id?: string | null
          completed_at?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          match_number?: number
          round?: number
          scheduled_at?: string | null
          status?: string
          tournament_id?: string
          white_player_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "online_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          draws: number
          eliminated: boolean
          id: string
          joined_at: string
          losses: number
          score: number
          seed: number | null
          tournament_id: string
          user_id: string
          wins: number
        }
        Insert: {
          draws?: number
          eliminated?: boolean
          id?: string
          joined_at?: string
          losses?: number
          score?: number
          seed?: number | null
          tournament_id: string
          user_id: string
          wins?: number
        }
        Update: {
          draws?: number
          eliminated?: boolean
          id?: string
          joined_at?: string
          losses?: number
          score?: number
          seed?: number | null
          tournament_id?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          current_round: number
          description: string | null
          id: string
          max_players: number
          name: string
          prize_pool: Json | null
          started_at: string | null
          status: string
          time_control: number
          total_rounds: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_round?: number
          description?: string | null
          id?: string
          max_players?: number
          name: string
          prize_pool?: Json | null
          started_at?: string | null
          status?: string
          time_control?: number
          total_rounds?: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_round?: number
          description?: string | null
          id?: string
          max_players?: number
          name?: string
          prize_pool?: Json | null
          started_at?: string | null
          status?: string
          time_control?: number
          total_rounds?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      user_puzzle_progress: {
        Row: {
          attempts: number
          completed_at: string
          hints_used: number
          id: string
          puzzle_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string
          hints_used?: number
          id?: string
          puzzle_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string
          hints_used?: number
          id?: string
          puzzle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_puzzle_progress_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "daily_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_puzzle_streaks: {
        Row: {
          current_streak: number
          id: string
          last_completed_date: string | null
          longest_streak: number
          total_puzzles_solved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          total_puzzles_solved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          total_puzzles_solved?: number
          updated_at?: string
          user_id?: string
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

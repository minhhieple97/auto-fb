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
      agent_runs: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          graph_run_id: string
          id: string
          input_json: Json
          node_name: string
          output_json: Json
          started_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at: string
          error_message?: string | null
          graph_run_id: string
          id?: string
          input_json: Json
          node_name: string
          output_json: Json
          started_at?: string | null
          status: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          graph_run_id?: string
          id?: string
          input_json?: Json
          node_name?: string
          output_json?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflow_runs: {
        Row: {
          campaign_id: string
          created_at: string
          current_node_name: string | null
          finished_at: string | null
          graph_run_id: string
          id: string
          started_at: string | null
          status: string
          triggered_by_email: string | null
          triggered_by_user_id: string
        }
        Insert: {
          campaign_id: string
          created_at: string
          current_node_name?: string | null
          finished_at?: string | null
          graph_run_id: string
          id?: string
          started_at?: string | null
          status: string
          triggered_by_email?: string | null
          triggered_by_user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_node_name?: string | null
          finished_at?: string | null
          graph_run_id?: string
          id?: string
          started_at?: string | null
          status?: string
          triggered_by_email?: string | null
          triggered_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflow_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_voice: string
          created_at: string
          id: string
          language: string
          llm_model: string
          llm_provider: string
          name: string
          status: string
          target_page_id: string
          topic: string
          updated_at: string
        }
        Insert: {
          brand_voice: string
          created_at: string
          id?: string
          language: string
          llm_model: string
          llm_provider: string
          name: string
          status: string
          target_page_id: string
          topic: string
          updated_at: string
        }
        Update: {
          brand_voice?: string
          created_at?: string
          id?: string
          language?: string
          llm_model?: string
          llm_provider?: string
          name?: string
          status?: string
          target_page_id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          campaign_id: string
          created_at: string
          hash: string
          id: string
          image_urls: Json
          raw_text: string
          source_id: string
          source_url: string
          summary: string
          title: string
        }
        Insert: {
          campaign_id: string
          created_at: string
          hash: string
          id?: string
          image_urls?: Json
          raw_text: string
          source_id: string
          source_url: string
          summary: string
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          hash?: string
          id?: string
          image_urls?: Json
          raw_text?: string
          source_id?: string
          source_url?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      image_assets: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          mime_type: string
          public_url: string | null
          r2_key: string
          source_url: string | null
        }
        Insert: {
          campaign_id: string
          created_at: string
          id?: string
          mime_type: string
          public_url?: string | null
          r2_key: string
          source_url?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          public_url?: string | null
          r2_key?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      post_drafts: {
        Row: {
          approval_status: string
          campaign_id: string
          content_item_id: string
          created_at: string
          id: string
          image_asset_id: string | null
          risk_flags: Json
          risk_score: number
          status: string
          text: string
          updated_at: string
        }
        Insert: {
          approval_status: string
          campaign_id: string
          content_item_id: string
          created_at: string
          id?: string
          image_asset_id?: string | null
          risk_flags?: Json
          risk_score: number
          status: string
          text: string
          updated_at: string
        }
        Update: {
          approval_status?: string
          campaign_id?: string
          content_item_id?: string
          created_at?: string
          id?: string
          image_asset_id?: string | null
          risk_flags?: Json
          risk_score?: number
          status?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_drafts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_drafts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_drafts_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "image_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      published_posts: {
        Row: {
          created_at: string
          error_message: string | null
          facebook_page_id: string
          facebook_post_id: string | null
          id: string
          post_draft_id: string
          publish_payload: Json
          published_at: string | null
          status: string
        }
        Insert: {
          created_at: string
          error_message?: string | null
          facebook_page_id: string
          facebook_post_id?: string | null
          id?: string
          post_draft_id: string
          publish_payload: Json
          published_at?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          facebook_page_id?: string
          facebook_post_id?: string | null
          id?: string
          post_draft_id?: string
          publish_payload?: Json
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_post_draft_id_fkey"
            columns: ["post_draft_id"]
            isOneToOne: false
            referencedRelation: "post_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          campaign_id: string
          crawl_policy: string
          created_at: string
          enabled: boolean
          id: string
          type: string
          url: string
        }
        Insert: {
          campaign_id: string
          crawl_policy: string
          created_at: string
          enabled?: boolean
          id?: string
          type: string
          url: string
        }
        Update: {
          campaign_id?: string
          crawl_policy?: string
          created_at?: string
          enabled?: boolean
          id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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

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
      ai_providers: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          is_enabled: boolean
          model: string
          name: string
          provider: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          model: string
          name: string
          provider: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          model?: string
          name?: string
          provider?: string
        }
        Relationships: []
      }
      analysis_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          influencer_id: string | null
          logs: Json
          platform: string
          started_at: string | null
          status: string
          updated_at: string
          url: string
          username: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          influencer_id?: string | null
          logs?: Json
          platform: string
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
          username: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          influencer_id?: string | null
          logs?: Json
          platform?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
          username?: string
        }
        Relationships: []
      }
      apify_tools: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          is_enabled: boolean | null
          label: string
          platform: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          label: string
          platform: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          label?: string
          platform?: string
        }
        Relationships: []
      }
      campaign_influencers: {
        Row: {
          added_at: string
          agreed_price: number | null
          campaign_id: string
          content_type: string | null
          deliverables: string | null
          id: string
          influencer_id: string
          notes: string | null
          status: string
        }
        Insert: {
          added_at?: string
          agreed_price?: number | null
          campaign_id: string
          content_type?: string | null
          deliverables?: string | null
          id?: string
          influencer_id: string
          notes?: string | null
          status?: string
        }
        Update: {
          added_at?: string
          agreed_price?: number | null
          campaign_id?: string
          content_type?: string | null
          deliverables?: string | null
          id?: string
          influencer_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_influencers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_influencers_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          created_at: string
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          notes: string | null
          platform: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          notes?: string | null
          platform?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          notes?: string | null
          platform?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: []
      }
      influencers: {
        Row: {
          ad_reusability_score: number | null
          ai_recommendation: string | null
          ai_strengths: string | null
          ai_summary: string | null
          ai_validation_warnings: Json | null
          ai_weaknesses: string | null
          audience_age_groups: Json | null
          audience_authenticity_score: number | null
          audience_city_split: Json | null
          audience_country_split: Json | null
          audience_gender_split: Json | null
          audience_languages: Json | null
          audience_mismatch_risk: number | null
          audience_purchase_intent_score: number | null
          audience_quality_score: number | null
          audience_top_cities: string | null
          audience_top_country: string | null
          avg_collab_price: number | null
          avg_comments: number | null
          avg_completion_rate: number | null
          avg_impressions: number | null
          avg_likes: number | null
          avg_reach: number | null
          avg_saves: number | null
          avg_shares: number | null
          avg_view_rate: number | null
          avg_views: number | null
          avg_watch_time: number | null
          best_brand_fit: string | null
          best_campaign_goal: string | null
          best_for_tags: Json | null
          best_time_to_post: Json | null
          biography: string | null
          brand_safety_score: number | null
          buying_comments_ratio: number | null
          city: string | null
          collab_tips: Json | null
          controversy_score: number | null
          conversion_intent_score: number | null
          country: string | null
          created_at: string
          creator_brand_affinity: Json | null
          creator_style: string | null
          data_confidence: Json | null
          editing_style: string | null
          engagement_growth: number | null
          engagement_rate: number | null
          fake_followers_score: number | null
          filming_style: string | null
          follower_brand_affinity: Json | null
          follower_growth_30d: number | null
          follower_growth_90d: number | null
          followers: number | null
          following: number | null
          id: string
          inactive_followers_score: number | null
          inconsistency_risk: number | null
          influencer_name: string | null
          interest_categories: Json | null
          is_public: boolean
          is_verified: boolean | null
          negative_comment_ratio: number | null
          niche: string | null
          overall_score: number | null
          overpromotion_score: number | null
          pacing_style: string | null
          platform: string | null
          popular_posts: Json | null
          positive_comment_ratio: number | null
          post_price_estimated: number | null
          post_price_max: number | null
          post_price_min: number | null
          posting_consistency: string | null
          posts_count: number | null
          primary_language: string | null
          profile_pic_url: string | null
          profile_url: string | null
          psychological_traits: Json | null
          raw_apify_data: Json | null
          recent_posts: Json | null
          recommendation_power_score: number | null
          reel_price_estimated: number | null
          reel_price_max: number | null
          reel_price_min: number | null
          reliability_score: number | null
          sentiment_negative: number | null
          sentiment_net_score: number | null
          sentiment_neutral: number | null
          sentiment_positive: number | null
          sentiment_verdict: string | null
          share_token: string | null
          shared_at: string | null
          story_price_estimated: number | null
          story_price_max: number | null
          story_price_min: number | null
          storytelling_style: string | null
          strongest_niche_fit: string | null
          strongest_platform: string | null
          strongest_season_fit: string | null
          sub_niche: string | null
          suspicious_engagement_score: number | null
          top_hashtags: Json | null
          top_mentions: Json | null
          top_niches: Json | null
          top_performing_content_style: string | null
          top_performing_format: string | null
          top_performing_hook_type: string | null
          trending_topics: Json | null
          trust_comments_ratio: number | null
          trust_score: number | null
          username: string | null
          viral_frequency_score: number | null
          word_cloud: Json | null
        }
        Insert: {
          ad_reusability_score?: number | null
          ai_recommendation?: string | null
          ai_strengths?: string | null
          ai_summary?: string | null
          ai_validation_warnings?: Json | null
          ai_weaknesses?: string | null
          audience_age_groups?: Json | null
          audience_authenticity_score?: number | null
          audience_city_split?: Json | null
          audience_country_split?: Json | null
          audience_gender_split?: Json | null
          audience_languages?: Json | null
          audience_mismatch_risk?: number | null
          audience_purchase_intent_score?: number | null
          audience_quality_score?: number | null
          audience_top_cities?: string | null
          audience_top_country?: string | null
          avg_collab_price?: number | null
          avg_comments?: number | null
          avg_completion_rate?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_reach?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          avg_view_rate?: number | null
          avg_views?: number | null
          avg_watch_time?: number | null
          best_brand_fit?: string | null
          best_campaign_goal?: string | null
          best_for_tags?: Json | null
          best_time_to_post?: Json | null
          biography?: string | null
          brand_safety_score?: number | null
          buying_comments_ratio?: number | null
          city?: string | null
          collab_tips?: Json | null
          controversy_score?: number | null
          conversion_intent_score?: number | null
          country?: string | null
          created_at?: string
          creator_brand_affinity?: Json | null
          creator_style?: string | null
          data_confidence?: Json | null
          editing_style?: string | null
          engagement_growth?: number | null
          engagement_rate?: number | null
          fake_followers_score?: number | null
          filming_style?: string | null
          follower_brand_affinity?: Json | null
          follower_growth_30d?: number | null
          follower_growth_90d?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          inactive_followers_score?: number | null
          inconsistency_risk?: number | null
          influencer_name?: string | null
          interest_categories?: Json | null
          is_public?: boolean
          is_verified?: boolean | null
          negative_comment_ratio?: number | null
          niche?: string | null
          overall_score?: number | null
          overpromotion_score?: number | null
          pacing_style?: string | null
          platform?: string | null
          popular_posts?: Json | null
          positive_comment_ratio?: number | null
          post_price_estimated?: number | null
          post_price_max?: number | null
          post_price_min?: number | null
          posting_consistency?: string | null
          posts_count?: number | null
          primary_language?: string | null
          profile_pic_url?: string | null
          profile_url?: string | null
          psychological_traits?: Json | null
          raw_apify_data?: Json | null
          recent_posts?: Json | null
          recommendation_power_score?: number | null
          reel_price_estimated?: number | null
          reel_price_max?: number | null
          reel_price_min?: number | null
          reliability_score?: number | null
          sentiment_negative?: number | null
          sentiment_net_score?: number | null
          sentiment_neutral?: number | null
          sentiment_positive?: number | null
          sentiment_verdict?: string | null
          share_token?: string | null
          shared_at?: string | null
          story_price_estimated?: number | null
          story_price_max?: number | null
          story_price_min?: number | null
          storytelling_style?: string | null
          strongest_niche_fit?: string | null
          strongest_platform?: string | null
          strongest_season_fit?: string | null
          sub_niche?: string | null
          suspicious_engagement_score?: number | null
          top_hashtags?: Json | null
          top_mentions?: Json | null
          top_niches?: Json | null
          top_performing_content_style?: string | null
          top_performing_format?: string | null
          top_performing_hook_type?: string | null
          trending_topics?: Json | null
          trust_comments_ratio?: number | null
          trust_score?: number | null
          username?: string | null
          viral_frequency_score?: number | null
          word_cloud?: Json | null
        }
        Update: {
          ad_reusability_score?: number | null
          ai_recommendation?: string | null
          ai_strengths?: string | null
          ai_summary?: string | null
          ai_validation_warnings?: Json | null
          ai_weaknesses?: string | null
          audience_age_groups?: Json | null
          audience_authenticity_score?: number | null
          audience_city_split?: Json | null
          audience_country_split?: Json | null
          audience_gender_split?: Json | null
          audience_languages?: Json | null
          audience_mismatch_risk?: number | null
          audience_purchase_intent_score?: number | null
          audience_quality_score?: number | null
          audience_top_cities?: string | null
          audience_top_country?: string | null
          avg_collab_price?: number | null
          avg_comments?: number | null
          avg_completion_rate?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_reach?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          avg_view_rate?: number | null
          avg_views?: number | null
          avg_watch_time?: number | null
          best_brand_fit?: string | null
          best_campaign_goal?: string | null
          best_for_tags?: Json | null
          best_time_to_post?: Json | null
          biography?: string | null
          brand_safety_score?: number | null
          buying_comments_ratio?: number | null
          city?: string | null
          collab_tips?: Json | null
          controversy_score?: number | null
          conversion_intent_score?: number | null
          country?: string | null
          created_at?: string
          creator_brand_affinity?: Json | null
          creator_style?: string | null
          data_confidence?: Json | null
          editing_style?: string | null
          engagement_growth?: number | null
          engagement_rate?: number | null
          fake_followers_score?: number | null
          filming_style?: string | null
          follower_brand_affinity?: Json | null
          follower_growth_30d?: number | null
          follower_growth_90d?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          inactive_followers_score?: number | null
          inconsistency_risk?: number | null
          influencer_name?: string | null
          interest_categories?: Json | null
          is_public?: boolean
          is_verified?: boolean | null
          negative_comment_ratio?: number | null
          niche?: string | null
          overall_score?: number | null
          overpromotion_score?: number | null
          pacing_style?: string | null
          platform?: string | null
          popular_posts?: Json | null
          positive_comment_ratio?: number | null
          post_price_estimated?: number | null
          post_price_max?: number | null
          post_price_min?: number | null
          posting_consistency?: string | null
          posts_count?: number | null
          primary_language?: string | null
          profile_pic_url?: string | null
          profile_url?: string | null
          psychological_traits?: Json | null
          raw_apify_data?: Json | null
          recent_posts?: Json | null
          recommendation_power_score?: number | null
          reel_price_estimated?: number | null
          reel_price_max?: number | null
          reel_price_min?: number | null
          reliability_score?: number | null
          sentiment_negative?: number | null
          sentiment_net_score?: number | null
          sentiment_neutral?: number | null
          sentiment_positive?: number | null
          sentiment_verdict?: string | null
          share_token?: string | null
          shared_at?: string | null
          story_price_estimated?: number | null
          story_price_max?: number | null
          story_price_min?: number | null
          storytelling_style?: string | null
          strongest_niche_fit?: string | null
          strongest_platform?: string | null
          strongest_season_fit?: string | null
          sub_niche?: string | null
          suspicious_engagement_score?: number | null
          top_hashtags?: Json | null
          top_mentions?: Json | null
          top_niches?: Json | null
          top_performing_content_style?: string | null
          top_performing_format?: string | null
          top_performing_hook_type?: string | null
          trending_topics?: Json | null
          trust_comments_ratio?: number | null
          trust_score?: number | null
          username?: string | null
          viral_frequency_score?: number | null
          word_cloud?: Json | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_email: string
          created_at: string
          first_name: string
          id: string
          job_title: string
          last_name: string
          phone: string
        }
        Insert: {
          company_email: string
          created_at?: string
          first_name: string
          id?: string
          job_title: string
          last_name: string
          phone: string
        }
        Update: {
          company_email?: string
          created_at?: string
          first_name?: string
          id?: string
          job_title?: string
          last_name?: string
          phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          analysis_count: number
          analysis_limit: number
          created_at: string
          email: string | null
          first_name: string | null
          full_access: boolean
          id: string
          is_admin: boolean
          last_name: string | null
          report_ids: string[]
          updated_at: string
        }
        Insert: {
          analysis_count?: number
          analysis_limit?: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_access?: boolean
          id: string
          is_admin?: boolean
          last_name?: string | null
          report_ids?: string[]
          updated_at?: string
        }
        Update: {
          analysis_count?: number
          analysis_limit?: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_access?: boolean
          id?: string
          is_admin?: boolean
          last_name?: string | null
          report_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          active_ai_provider_id: string | null
          apify_api_key: string | null
          gemini_api_key: string | null
          id: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          active_ai_provider_id?: string | null
          apify_api_key?: string | null
          gemini_api_key?: string | null
          id?: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          active_ai_provider_id?: string | null
          apify_api_key?: string | null
          gemini_api_key?: string | null
          id?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_active_ai_provider_id_fkey"
            columns: ["active_ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_influencers: {
        Row: {
          check_frequency: string
          created_at: string
          id: string
          influencer_id: string
          is_active: boolean
          last_checked: string | null
          notes: string | null
          tracked_since: string
        }
        Insert: {
          check_frequency?: string
          created_at?: string
          id?: string
          influencer_id: string
          is_active?: boolean
          last_checked?: string | null
          notes?: string | null
          tracked_since?: string
        }
        Update: {
          check_frequency?: string
          created_at?: string
          id?: string
          influencer_id?: string
          is_active?: boolean
          last_checked?: string | null
          notes?: string | null
          tracked_since?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_influencers_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_snapshots: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          avg_views: number | null
          engagement_rate: number | null
          followers: number | null
          id: string
          influencer_id: string
          overall_score: number | null
          snapshot_date: string
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          influencer_id: string
          overall_score?: number | null
          snapshot_date?: string
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          influencer_id?: string
          overall_score?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_snapshots_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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

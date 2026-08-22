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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          budget: number | null
          channel: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          offer_id: string | null
          organization_id: string
          start_date: string | null
          status: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          channel?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          offer_id?: string | null
          organization_id: string
          start_date?: string | null
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          channel?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          offer_id?: string | null
          organization_id?: string
          start_date?: string | null
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          id: string
          name: string
          opportunity: string | null
          organization_id: string
          positioning: string | null
          strengths: string | null
          updated_at: string
          weaknesses: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          opportunity?: string | null
          organization_id: string
          positioning?: string | null
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          opportunity?: string | null
          organization_id?: string
          positioning?: string | null
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_assets: {
        Row: {
          conversion_goal: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          status: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          conversion_goal?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          status?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          conversion_goal?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          status?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          age_range: string | null
          buying_frequency: string | null
          buying_triggers: string | null
          created_at: string
          customer_value: number | null
          description: string | null
          goals: string | null
          id: string
          interests: string | null
          location: string | null
          name: string
          objections: string | null
          offer: string | null
          organization_id: string
          preferred_channels: string[] | null
          priority: string | null
          problems: string | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          buying_frequency?: string | null
          buying_triggers?: string | null
          created_at?: string
          customer_value?: number | null
          description?: string | null
          goals?: string | null
          id?: string
          interests?: string | null
          location?: string | null
          name: string
          objections?: string | null
          offer?: string | null
          organization_id: string
          preferred_channels?: string[] | null
          priority?: string | null
          problems?: string | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          buying_frequency?: string | null
          buying_triggers?: string | null
          created_at?: string
          customer_value?: number | null
          description?: string | null
          goals?: string | null
          id?: string
          interests?: string | null
          location?: string | null
          name?: string
          objections?: string | null
          offer?: string | null
          organization_id?: string
          preferred_channels?: string[] | null
          priority?: string | null
          problems?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_since: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          segment_id: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_since?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          segment_id?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_since?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          segment_id?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          occurred_on: string
          organization_id: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          organization_id: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          organization_id?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_snapshots: {
        Row: {
          created_at: string
          customers: number
          id: string
          leads: number
          organization_id: string
          period_month: string
          qualified_leads: number
          updated_at: string
          visitors: number
        }
        Insert: {
          created_at?: string
          customers?: number
          id?: string
          leads?: number
          organization_id: string
          period_month?: string
          qualified_leads?: number
          updated_at?: string
          visitors?: number
        }
        Update: {
          created_at?: string
          customers?: number
          id?: string
          leads?: number
          organization_id?: string
          period_month?: string
          qualified_leads?: number
          updated_at?: string
          visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_opportunities: {
        Row: {
          created_at: string
          current_value: string | null
          id: string
          lever: string
          organization_id: string
          recommended_action: string | null
          status: string
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: string | null
          id?: string
          lever?: string
          organization_id: string
          recommended_action?: string | null
          status?: string
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: string | null
          id?: string
          lever?: string
          organization_id?: string
          recommended_action?: string | null
          status?: string
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string | null
          occurred_at: string
          organization_id: string
          summary: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          organization_id: string
          summary: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          organization_id?: string
          summary?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          offer_id: string | null
          organization_id: string
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          offer_id?: string | null
          organization_id: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          offer_id?: string | null
          organization_id?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          cost: number | null
          created_at: string
          cta: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          price: number | null
          segment_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          cta?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          price?: number | null
          segment_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          cta?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          price?: number | null
          segment_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          acquisition_channels: string[] | null
          avg_order_value: number | null
          created_at: string
          currency: string
          email: string | null
          facebook: string | null
          goals: string[] | null
          google_profile: string | null
          id: string
          industry: string | null
          instagram: string | null
          internal_notes: string | null
          location: string | null
          main_customer_type: string | null
          main_goal: string | null
          main_offers: string | null
          monthly_revenue_range: string | null
          name: string
          niche: string | null
          onboarding_completed: boolean
          onboarding_status: string
          owner_id: string
          phone: string | null
          products_services: string | null
          target_location: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          acquisition_channels?: string[] | null
          avg_order_value?: number | null
          created_at?: string
          currency?: string
          email?: string | null
          facebook?: string | null
          goals?: string[] | null
          google_profile?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          internal_notes?: string | null
          location?: string | null
          main_customer_type?: string | null
          main_goal?: string | null
          main_offers?: string | null
          monthly_revenue_range?: string | null
          name: string
          niche?: string | null
          onboarding_completed?: boolean
          onboarding_status?: string
          owner_id: string
          phone?: string | null
          products_services?: string | null
          target_location?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          acquisition_channels?: string[] | null
          avg_order_value?: number | null
          created_at?: string
          currency?: string
          email?: string | null
          facebook?: string | null
          goals?: string[] | null
          google_profile?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          internal_notes?: string | null
          location?: string | null
          main_customer_type?: string | null
          main_goal?: string | null
          main_offers?: string | null
          monthly_revenue_range?: string | null
          name?: string
          niche?: string | null
          onboarding_completed?: boolean
          onboarding_status?: string
          owner_id?: string
          phone?: string | null
          products_services?: string | null
          target_location?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      positioning: {
        Row: {
          brand_promise: string | null
          created_at: string
          differentiator: string | null
          messaging: string | null
          organization_id: string
          problem: string | null
          proof: string | null
          target_customer: string | null
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          brand_promise?: string | null
          created_at?: string
          differentiator?: string | null
          messaging?: string | null
          organization_id: string
          problem?: string | null
          proof?: string | null
          target_customer?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          brand_promise?: string | null
          created_at?: string
          differentiator?: string | null
          messaging?: string | null
          organization_id?: string
          problem?: string | null
          proof?: string | null
          target_customer?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positioning_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_profiles: {
        Row: {
          consistent_address: boolean | null
          consistent_description: boolean | null
          consistent_name: boolean | null
          consistent_phone: boolean | null
          consistent_website: boolean | null
          created_at: string
          google_address: string | null
          google_category: string | null
          google_hours: string | null
          google_phone: string | null
          google_profile_claimed: boolean | null
          google_rating: number | null
          google_reviews: number | null
          google_website_linked: boolean | null
          instagram_bio: string | null
          instagram_contact: boolean | null
          instagram_has_cta: boolean | null
          instagram_link: boolean | null
          instagram_url: string | null
          organization_id: string
          updated_at: string
          website_has_contact: boolean | null
          website_has_cta: boolean | null
          website_mobile_ready: boolean | null
          website_status: string | null
          website_url: string | null
          whatsapp_business: boolean | null
          whatsapp_catalogue: boolean | null
          whatsapp_cta: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          consistent_address?: boolean | null
          consistent_description?: boolean | null
          consistent_name?: boolean | null
          consistent_phone?: boolean | null
          consistent_website?: boolean | null
          created_at?: string
          google_address?: string | null
          google_category?: string | null
          google_hours?: string | null
          google_phone?: string | null
          google_profile_claimed?: boolean | null
          google_rating?: number | null
          google_reviews?: number | null
          google_website_linked?: boolean | null
          instagram_bio?: string | null
          instagram_contact?: boolean | null
          instagram_has_cta?: boolean | null
          instagram_link?: boolean | null
          instagram_url?: string | null
          organization_id: string
          updated_at?: string
          website_has_contact?: boolean | null
          website_has_cta?: boolean | null
          website_mobile_ready?: boolean | null
          website_status?: string | null
          website_url?: string | null
          whatsapp_business?: boolean | null
          whatsapp_catalogue?: boolean | null
          whatsapp_cta?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          consistent_address?: boolean | null
          consistent_description?: boolean | null
          consistent_name?: boolean | null
          consistent_phone?: boolean | null
          consistent_website?: boolean | null
          created_at?: string
          google_address?: string | null
          google_category?: string | null
          google_hours?: string | null
          google_phone?: string | null
          google_profile_claimed?: boolean | null
          google_rating?: number | null
          google_reviews?: number | null
          google_website_linked?: boolean | null
          instagram_bio?: string | null
          instagram_contact?: boolean | null
          instagram_has_cta?: boolean | null
          instagram_link?: boolean | null
          instagram_url?: string | null
          organization_id?: string
          updated_at?: string
          website_has_contact?: boolean | null
          website_has_cta?: boolean | null
          website_mobile_ready?: boolean | null
          website_status?: string | null
          website_url?: string | null
          whatsapp_business?: boolean | null
          whatsapp_catalogue?: boolean | null
          whatsapp_cta?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_transactions: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          occurred_on: string
          offer_id: string | null
          organization_id: string
          payment_method: string | null
          product_service: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          offer_id?: string | null
          organization_id: string
          payment_method?: string | null
          product_service?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          offer_id?: string | null
          organization_id?: string
          payment_method?: string | null
          product_service?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          module: string
          notes: string | null
          organization_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          module?: string
          notes?: string | null
          organization_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          module?: string
          notes?: string | null
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "platform_admin" | "business_owner"
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
      app_role: ["platform_admin", "business_owner"],
    },
  },
} as const

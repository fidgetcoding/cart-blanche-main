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
          attachments: Json | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          merchant_id: string
          role: string
          tool_calls: Json | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          merchant_id: string
          role: string
          tool_calls?: Json | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          merchant_id?: string
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          merchant_id: string
          minimum_spend: number | null
          starts_at: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          merchant_id: string
          minimum_spend?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          merchant_id?: string
          minimum_spend?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_tiles: {
        Row: {
          created_at: string | null
          grid_position: Json | null
          grid_size: Json | null
          id: string
          image_url: string
          merchant_id: string
          product_tags: Json[] | null
        }
        Insert: {
          created_at?: string | null
          grid_position?: Json | null
          grid_size?: Json | null
          id?: string
          image_url: string
          merchant_id: string
          product_tags?: Json[] | null
        }
        Update: {
          created_at?: string | null
          grid_position?: Json | null
          grid_size?: Json | null
          id?: string
          image_url?: string
          merchant_id?: string
          product_tags?: Json[] | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_tiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_type: string
          hotzone_id: string | null
          id: string
          merchant_id: string
          metadata: Json | null
          product_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          hotzone_id?: string | null
          id?: string
          merchant_id: string
          metadata?: Json | null
          product_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          hotzone_id?: string | null
          id?: string
          merchant_id?: string
          metadata?: Json | null
          product_id?: string | null
          session_id?: string
        }
        Relationships: []
      }
      flow_editor_state: {
        Row: {
          edges: Json | null
          id: string
          merchant_id: string
          nodes: Json | null
          updated_at: string | null
        }
        Insert: {
          edges?: Json | null
          id?: string
          merchant_id: string
          nodes?: Json | null
          updated_at?: string | null
        }
        Update: {
          edges?: Json | null
          id?: string
          merchant_id?: string
          nodes?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_editor_state_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_layouts: {
        Row: {
          category_order: string[]
          hidden_product_types: string[]
          hidden_tags: string[]
          id: string
          layout_type: string
          merchant_id: string
          product_order: string[]
          updated_at: string | null
        }
        Insert: {
          category_order?: string[]
          hidden_product_types?: string[]
          hidden_tags?: string[]
          id?: string
          layout_type?: string
          merchant_id: string
          product_order?: string[]
          updated_at?: string | null
        }
        Update: {
          category_order?: string[]
          hidden_product_types?: string[]
          hidden_tags?: string[]
          id?: string
          layout_type?: string
          merchant_id?: string
          product_order?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      hotzones: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string
          name: string
          neighbors: Json | null
          position: Json
          product_ids: string[] | null
          sort_order: number | null
          style_config: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id: string
          name: string
          neighbors?: Json | null
          position?: Json
          product_ids?: string[] | null
          sort_order?: number | null
          style_config?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string
          name?: string
          neighbors?: Json | null
          position?: Json
          product_ids?: string[] | null
          sort_order?: number | null
          style_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hotzones_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          brand_config: Json | null
          created_at: string | null
          email: string
          id: string
          onboarding_completed: boolean | null
          store_category: string | null
          store_description: string | null
          store_name: string
          store_slug: string | null
          store_tagline: string | null
          stripe_connected_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_config?: Json | null
          created_at?: string | null
          email: string
          id: string
          onboarding_completed?: boolean | null
          store_category?: string | null
          store_description?: string | null
          store_name?: string
          store_slug?: string | null
          store_tagline?: string | null
          stripe_connected_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_config?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          onboarding_completed?: boolean | null
          store_category?: string | null
          store_description?: string | null
          store_name?: string
          store_slug?: string | null
          store_tagline?: string | null
          stripe_connected_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string | null
          id: string
          items: Json
          merchant_id: string
          notes: string | null
          order_number: string
          shipping_address: Json | null
          status: string | null
          stripe_payment_id: string | null
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          items?: Json
          merchant_id: string
          notes?: string | null
          order_number: string
          shipping_address?: Json | null
          status?: string | null
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          items?: Json
          merchant_id?: string
          notes?: string | null
          order_number?: string
          shipping_address?: Json | null
          status?: string | null
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pairings: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string
          paired_product_id: string
          pairing_strength: number | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id: string
          paired_product_id: string
          pairing_strength?: number | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string
          paired_product_id?: string
          pairing_strength?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pairings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pairings_paired_product_id_fkey"
            columns: ["paired_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pairings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          images: string[] | null
          inventory_count: number | null
          options: Json | null
          price: number | null
          product_id: string
          sku: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          options?: Json | null
          price?: number | null
          product_id: string
          sku?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          options?: Json | null
          price?: number | null
          product_id?: string
          sku?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          grid_position: Json | null
          id: string
          images: string[] | null
          merchant_id: string
          pinned: boolean | null
          price: number
          seo_description: string | null
          seo_title: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          grid_position?: Json | null
          id?: string
          images?: string[] | null
          merchant_id: string
          pinned?: boolean | null
          price: number
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          grid_position?: Json | null
          id?: string
          images?: string[] | null
          merchant_id?: string
          pinned?: boolean | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_config: {
        Row: {
          ale_enabled: boolean | null
          ale_intensity: string | null
          created_at: string | null
          id: string
          low_stock_threshold: number | null
          merchant_id: string
          platform_fee_percent: number | null
          updated_at: string | null
        }
        Insert: {
          ale_enabled?: boolean | null
          ale_intensity?: string | null
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          merchant_id: string
          platform_fee_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          ale_enabled?: boolean | null
          ale_intensity?: string | null
          created_at?: string | null
          id?: string
          low_stock_threshold?: number | null
          merchant_id?: string
          platform_fee_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_config_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      styling_guides: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string
          name: string
          rules: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id: string
          name?: string
          rules?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string
          name?: string
          rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "styling_guides_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      merchant_storefronts: {
        Row: {
          brand_config: Json | null
          store_category: string | null
          store_description: string | null
          store_name: string | null
          store_slug: string | null
          store_tagline: string | null
        }
        Insert: {
          brand_config?: Json | null
          store_category?: string | null
          store_description?: string | null
          store_name?: string | null
          store_slug?: string | null
          store_tagline?: string | null
        }
        Update: {
          brand_config?: Json | null
          store_category?: string | null
          store_description?: string | null
          store_name?: string | null
          store_slug?: string | null
          store_tagline?: string | null
        }
        Relationships: []
      }
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

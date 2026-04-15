export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
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
      intake_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_batches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          condition: Database["public"]["Enums"]["inventory_condition"]
          created_at: string
          current_location_id: string | null
          dimensions: string | null
          estimated_listing_price_cents: number | null
          home_location_id: string | null
          id: string
          intake_batch_id: string | null
          item_code: string
          marked_for_disposal: boolean
          material: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price_cents: number | null
          replacement_cost_cents: number | null
          room: string | null
          sku: string | null
          source_job_id: string | null
          status: Database["public"]["Enums"]["inventory_item_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["inventory_condition"]
          created_at?: string
          current_location_id?: string | null
          dimensions?: string | null
          estimated_listing_price_cents?: number | null
          home_location_id?: string | null
          id?: string
          intake_batch_id?: string | null
          item_code?: string
          marked_for_disposal?: boolean
          material?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          replacement_cost_cents?: number | null
          room?: string | null
          sku?: string | null
          source_job_id?: string | null
          status?: Database["public"]["Enums"]["inventory_item_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["inventory_condition"]
          created_at?: string
          current_location_id?: string | null
          dimensions?: string | null
          estimated_listing_price_cents?: number | null
          home_location_id?: string | null
          id?: string
          intake_batch_id?: string | null
          item_code?: string
          marked_for_disposal?: boolean
          material?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          replacement_cost_cents?: number | null
          room?: string | null
          sku?: string | null
          source_job_id?: string | null
          status?: Database["public"]["Enums"]["inventory_item_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_home_location_id_fkey"
            columns: ["home_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_intake_batch_id_fkey"
            columns: ["intake_batch_id"]
            isOneToOne: false
            referencedRelation: "intake_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          item_id: string
          sort_order: number
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          item_id: string
          sort_order?: number
          storage_bucket?: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          item_id?: string
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      job_items: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string | null
          id: string
          item_id: string
          job_id: string
          notes: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          id?: string
          item_id: string
          job_id: string
          notes?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          id?: string
          item_id?: string
          job_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pack_requests: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          notes: string | null
          optional: boolean
          quantity: number
          requested_item_id: string | null
          request_text: string
          room: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          notes?: string | null
          optional?: boolean
          quantity?: number
          requested_item_id?: string | null
          request_text?: string
          room?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          optional?: boolean
          quantity?: number
          requested_item_id?: string | null
          request_text?: string
          room?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_pack_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pack_requests_requested_item_id_fkey"
            columns: ["requested_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pick_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          job_id: string
          notes: string | null
          pack_request_id: string | null
          picked_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          job_id: string
          notes?: string | null
          pack_request_id?: string | null
          picked_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          job_id?: string
          notes?: string | null
          pack_request_id?: string | null
          picked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_pick_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pick_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pick_items_pack_request_id_fkey"
            columns: ["pack_request_id"]
            isOneToOne: false
            referencedRelation: "job_pack_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address1: string | null
          address2: string | null
          address_label: string | null
          city: string | null
          country: string | null
          created_at: string
          end_date: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          postal: string | null
          start_date: string | null
          state: string | null
          status: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          address_label?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          end_date?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          postal?: string | null
          start_date?: string | null
          state?: string | null
          status?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          address_label?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          end_date?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          postal?: string | null
          start_date?: string | null
          state?: string | null
          status?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address1: string | null
          address2: string | null
          address_label: string | null
          city: string | null
          country: string | null
          created_at: string
          geocoded_at: string | null
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          postal: string | null
          state: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          address_label?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          geocoded_at?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          postal?: string | null
          state?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          address_label?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          geocoded_at?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          postal?: string | null
          state?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_inventory_item_code: { Args: never; Returns: string }
    }
    Enums: {
      inventory_condition: "new" | "like_new" | "good" | "fair" | "rough"
      inventory_item_status:
        | "available"
        | "on_job"
        | "packed"
        | "maintenance"
        | "sold"
        | "lost"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      inventory_condition: ["new", "like_new", "good", "fair", "rough"],
      inventory_item_status: [
        "available",
        "on_job",
        "packed",
        "maintenance",
        "sold",
        "lost",
      ],
    },
  },
} as const

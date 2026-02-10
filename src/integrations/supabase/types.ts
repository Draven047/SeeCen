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
      ai_coach_chat_history: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_role: string
          related_recommendation_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_role: string
          related_recommendation_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_role?: string
          related_recommendation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_chat_history_related_recommendation_id_fkey"
            columns: ["related_recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_daily_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_daily_recommendations: {
        Row: {
          analysis_context: Json | null
          cigars_to_push: Json | null
          created_at: string
          cross_sell_opportunities: Json | null
          daily_summary: string | null
          follow_up_customers: Json | null
          id: string
          incentive_coaching: Json | null
          offer_recommendations: Json | null
          recommendation_date: string
          stock_priorities: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_context?: Json | null
          cigars_to_push?: Json | null
          created_at?: string
          cross_sell_opportunities?: Json | null
          daily_summary?: string | null
          follow_up_customers?: Json | null
          id?: string
          incentive_coaching?: Json | null
          offer_recommendations?: Json | null
          recommendation_date?: string
          stock_priorities?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_context?: Json | null
          cigars_to_push?: Json | null
          created_at?: string
          cross_sell_opportunities?: Json | null
          daily_summary?: string | null
          follow_up_customers?: Json | null
          id?: string
          incentive_coaching?: Json | null
          offer_recommendations?: Json | null
          recommendation_date?: string
          stock_priorities?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cigars: {
        Row: {
          created_at: string
          description: string | null
          filler: string | null
          id: string
          image_url: string | null
          name: string
          origin: string
          price: number
          shape: string
          size: string | null
          stock_quantity: number | null
          stock_status: Database["public"]["Enums"]["stock_status"]
          updated_at: string
          wrapper: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filler?: string | null
          id?: string
          image_url?: string | null
          name: string
          origin: string
          price: number
          shape: string
          size?: string | null
          stock_quantity?: number | null
          stock_status?: Database["public"]["Enums"]["stock_status"]
          updated_at?: string
          wrapper: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filler?: string | null
          id?: string
          image_url?: string | null
          name?: string
          origin?: string
          price?: number
          shape?: string
          size?: string | null
          stock_quantity?: number | null
          stock_status?: Database["public"]["Enums"]["stock_status"]
          updated_at?: string
          wrapper?: string
        }
        Relationships: []
      }
      credit_note_series: {
        Row: {
          created_at: string
          current_number: number
          financial_year: string
          id: string
          prefix: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_number?: number
          financial_year: string
          id?: string
          prefix: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_number?: number
          financial_year?: string
          id?: string
          prefix?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_series_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          cess_amount: number
          cgst_amount: number
          created_at: string
          created_by: string
          credit_note_number: string
          credit_type: string
          deduct_fume_points: boolean
          id: string
          igst_amount: number
          original_order_id: string
          points_deducted: number
          reason: string
          sgst_amount: number
          store_id: string
          total_amount: number
        }
        Insert: {
          amount?: number
          cess_amount?: number
          cgst_amount?: number
          created_at?: string
          created_by: string
          credit_note_number: string
          credit_type: string
          deduct_fume_points?: boolean
          id?: string
          igst_amount?: number
          original_order_id: string
          points_deducted?: number
          reason: string
          sgst_amount?: number
          store_id: string
          total_amount?: number
        }
        Update: {
          amount?: number
          cess_amount?: number
          cgst_amount?: number
          created_at?: string
          created_by?: string
          credit_note_number?: string
          credit_type?: string
          deduct_fume_points?: boolean
          id?: string
          igst_amount?: number
          original_order_id?: string
          points_deducted?: number
          reason?: string
          sgst_amount?: number
          store_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          fume_points_balance: number
          id: string
          imported_order_count: number
          imported_total_spent: number
          is_blacklisted: boolean
          last_order_date: string | null
          name: string
          notes: string | null
          phone: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          fume_points_balance?: number
          id?: string
          imported_order_count?: number
          imported_total_spent?: number
          is_blacklisted?: boolean
          last_order_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          fume_points_balance?: number
          id?: string
          imported_order_count?: number
          imported_total_spent?: number
          is_blacklisted?: boolean
          last_order_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_logs: {
        Row: {
          action_type: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          performed_by: string
          reason: string | null
          store_id: string | null
        }
        Insert: {
          action_type: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          performed_by: string
          reason?: string | null
          store_id?: string | null
        }
        Update: {
          action_type?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string
          reason?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fume_points_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          order_id: string | null
          points: number
          reason: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points: number
          reason?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fume_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fume_points_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fume_points_settings: {
        Row: {
          created_at: string
          expiry_months: number | null
          id: string
          is_active: boolean
          min_redeem_points: number
          point_value: number
          points_per_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_months?: number | null
          id?: string
          is_active?: boolean
          min_redeem_points?: number
          point_value?: number
          points_per_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_months?: number | null
          id?: string
          is_active?: boolean
          min_redeem_points?: number
          point_value?: number
          points_per_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoice_series: {
        Row: {
          created_at: string
          current_number: number
          financial_year: string
          id: string
          prefix: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_number?: number
          financial_year: string
          id?: string
          prefix: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_number?: number
          financial_year?: string
          id?: string
          prefix?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_series_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          cigar_id: string
          created_at: string
          id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          cigar_id: string
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          cigar_id?: string
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: string | null
          cess_amount: number
          cess_rate: number
          cgst_amount: number
          cgst_rate: number
          created_at: string
          created_by: string
          customer_id: string | null
          finalized_at: string | null
          finalized_by: string | null
          fume_points_earned: number
          fume_points_redeemed: number
          id: string
          igst_amount: number
          igst_rate: number
          invoice_date: string | null
          invoice_number: string | null
          invoice_snapshot: Json | null
          is_finalized: boolean
          is_voided: boolean
          notes: string | null
          order_number: string
          payment_qr_code: string | null
          place_of_supply_code: string | null
          place_of_supply_state: string | null
          sgst_amount: number
          sgst_rate: number
          shipping_address: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          billing_address?: string | null
          cess_amount?: number
          cess_rate?: number
          cgst_amount?: number
          cgst_rate?: number
          created_at?: string
          created_by: string
          customer_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          fume_points_earned?: number
          fume_points_redeemed?: number
          id?: string
          igst_amount?: number
          igst_rate?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_snapshot?: Json | null
          is_finalized?: boolean
          is_voided?: boolean
          notes?: string | null
          order_number: string
          payment_qr_code?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          sgst_amount?: number
          sgst_rate?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          billing_address?: string | null
          cess_amount?: number
          cess_rate?: number
          cgst_amount?: number
          cgst_rate?: number
          created_at?: string
          created_by?: string
          customer_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          fume_points_earned?: number
          fume_points_redeemed?: number
          id?: string
          igst_amount?: number
          igst_rate?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_snapshot?: Json | null
          is_finalized?: boolean
          is_voided?: boolean
          notes?: string | null
          order_number?: string
          payment_qr_code?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          sgst_amount?: number
          sgst_rate?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          cigar_id: string
          created_at: string
          created_by: string
          id: string
          purchase_date: string
          quantity: number
          store_id: string
          supplier_name: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          cigar_id: string
          created_at?: string
          created_by: string
          id?: string
          purchase_date?: string
          quantity: number
          store_id: string
          supplier_name?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          cigar_id?: string
          created_at?: string
          created_by?: string
          id?: string
          purchase_date?: string
          quantity?: number
          store_id?: string
          supplier_name?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          achieved_amount: number
          created_at: string
          id: string
          incentive_milestone: number | null
          quarter: number
          target_amount: number
          updated_at: string
          user_id: string | null
          year: number
        }
        Insert: {
          achieved_amount?: number
          created_at?: string
          id?: string
          incentive_milestone?: number | null
          quarter: number
          target_amount: number
          updated_at?: string
          user_id?: string | null
          year: number
        }
        Update: {
          achieved_amount?: number
          created_at?: string
          id?: string
          incentive_milestone?: number | null
          quarter?: number
          target_amount?: number
          updated_at?: string
          user_id?: string | null
          year?: number
        }
        Relationships: []
      }
      stock_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cigar_id: string
          created_at: string
          id: string
          notes: string | null
          quantity: number
          requested_by: string
          status: Database["public"]["Enums"]["stock_request_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cigar_id: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity: number
          requested_by: string
          status?: Database["public"]["Enums"]["stock_request_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cigar_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          requested_by?: string
          status?: Database["public"]["Enums"]["stock_request_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_requests_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_assignments: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          cigar_id: string
          id: string
          min_stock_level: number | null
          quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          cigar_id: string
          id?: string
          min_stock_level?: number | null
          quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          cigar_id?: string
          id?: string
          min_stock_level?: number | null
          quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_cigar_id_fkey"
            columns: ["cigar_id"]
            isOneToOne: false
            referencedRelation: "cigars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tax_settings: {
        Row: {
          cess_enabled: boolean
          created_at: string
          default_cess_rate: number
          default_cgst_rate: number
          default_igst_rate: number
          default_sgst_rate: number
          id: string
          state_code: string
          state_name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          cess_enabled?: boolean
          created_at?: string
          default_cess_rate?: number
          default_cgst_rate?: number
          default_igst_rate?: number
          default_sgst_rate?: number
          id?: string
          state_code: string
          state_name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          cess_enabled?: boolean
          created_at?: string
          default_cess_rate?: number
          default_cgst_rate?: number
          default_igst_rate?: number
          default_sgst_rate?: number
          id?: string
          state_code?: string
          state_name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tax_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          is_approved: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_approved?: boolean
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
      generate_credit_note_number: {
        Args: { p_store_id: string }
        Returns: string
      }
      generate_invoice_number: { Args: { p_store_id: string }; Returns: string }
      get_current_financial_year: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "sales" | "operations"
      order_status: "created" | "paid" | "shipped" | "delivered"
      stock_request_status: "pending" | "approved" | "rejected" | "fulfilled"
      stock_status: "in_stock" | "low_stock" | "out_of_stock"
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
      app_role: ["admin", "sales", "operations"],
      order_status: ["created", "paid", "shipped", "delivered"],
      stock_request_status: ["pending", "approved", "rejected", "fulfilled"],
      stock_status: ["in_stock", "low_stock", "out_of_stock"],
    },
  },
} as const

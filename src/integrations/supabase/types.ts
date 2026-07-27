export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          slug?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      catalog_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          name: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      erp_modules: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          tenant_id: string;
          service_id: string;
          movement_type: string;
          quantity: number;
          quantity_delta: number;
          stock_before: number;
          stock_after: number;
          reason: string;
          source: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service_id: string;
          movement_type: string;
          quantity: number;
          quantity_delta: number;
          stock_before: number;
          stock_after: number;
          reason: string;
          source: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          service_id?: string;
          movement_type?: string;
          quantity?: number;
          quantity_delta?: number;
          stock_before?: number;
          stock_after?: number;
          reason?: string;
          source?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_modules: {
        Row: {
          tenant_id: string;
          module_id: string;
          enabled: boolean;
        };
        Insert: {
          tenant_id: string;
          module_id: string;
          enabled?: boolean;
        };
        Update: {
          tenant_id?: string;
          module_id?: string;
          enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "erp_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          starts_at: string | null;
          ends_at: string | null;
          amount: number;
          billing_cycle: Database["public"]["Enums"]["subscription_billing_cycle"];
          status: Database["public"]["Enums"]["subscription_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          amount?: number;
          billing_cycle?: Database["public"]["Enums"]["subscription_billing_cycle"];
          status?: Database["public"]["Enums"]["subscription_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          amount?: number;
          billing_cycle?: Database["public"]["Enums"]["subscription_billing_cycle"];
          status?: Database["public"]["Enums"]["subscription_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      achat_items: {
        Row: {
          achat_id: string;
          id: string;
          line_total: number;
          name: string;
          price: number;
          qty: number;
          unit: string | null;
        };
        Insert: {
          achat_id: string;
          id?: string;
          line_total?: number;
          name: string;
          price?: number;
          qty?: number;
          unit?: string | null;
        };
        Update: {
          achat_id?: string;
          id?: string;
          line_total?: number;
          name?: string;
          price?: number;
          qty?: number;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "achat_items_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats";
            referencedColumns: ["id"];
          },
        ];
      };
      achats: {
        Row: {
          tenant_id: string;
          created_at: string;
          discount: number;
          fournisseur_id: string | null;
          fournisseur_name: string | null;
          id: string;
          notes: string | null;
          number: string;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          discount?: number;
          fournisseur_id?: string | null;
          fournisseur_name?: string | null;
          id?: string;
          notes?: string | null;
          number: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          discount?: number;
          fournisseur_id?: string | null;
          fournisseur_name?: string | null;
          id?: string;
          notes?: string | null;
          number?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achats_fournisseur_id_fkey";
            columns: ["fournisseur_id"];
            isOneToOne: false;
            referencedRelation: "fournisseurs";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          tenant_id: string;
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      depenses: {
        Row: {
          tenant_id: string;
          amount: number;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          paid_at: string;
          payment_method: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          paid_at?: string;
          payment_method?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          paid_at?: string;
          payment_method?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      devis: {
        Row: {
          tenant_id: string;
          client_id: string | null;
          client_name: string | null;
          created_at: string;
          discount: number;
          due_date: string | null;
          id: string;
          notes: string | null;
          number: string;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          client_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          discount?: number;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          number: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          discount?: number;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          number?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      devis_items: {
        Row: {
          devis_id: string;
          id: string;
          line_total: number;
          name: string;
          price: number;
          qty: number;
          service_id: string | null;
          unit: string | null;
        };
        Insert: {
          devis_id: string;
          id?: string;
          line_total?: number;
          name: string;
          price?: number;
          qty?: number;
          service_id?: string | null;
          unit?: string | null;
        };
        Update: {
          devis_id?: string;
          id?: string;
          line_total?: number;
          name?: string;
          price?: number;
          qty?: number;
          service_id?: string | null;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "devis_items_devis_id_fkey";
            columns: ["devis_id"];
            isOneToOne: false;
            referencedRelation: "devis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devis_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      fournisseurs: {
        Row: {
          tenant_id: string;
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      integration_settings: {
        Row: {
          ai_enabled: boolean;
          ai_max_tokens: number | null;
          ai_model: string | null;
          ai_temperature: number | null;
          claude_key: string | null;
          created_at: string;
          gemini_key: string | null;
          id: string;
          openai_key: string | null;
          singleton: boolean;
          updated_at: string;
        };
        Insert: {
          ai_enabled?: boolean;
          ai_max_tokens?: number | null;
          ai_model?: string | null;
          ai_temperature?: number | null;
          claude_key?: string | null;
          created_at?: string;
          gemini_key?: string | null;
          id?: string;
          openai_key?: string | null;
          singleton?: boolean;
          updated_at?: string;
        };
        Update: {
          ai_enabled?: boolean;
          ai_max_tokens?: number | null;
          ai_model?: string | null;
          ai_temperature?: number | null;
          claude_key?: string | null;
          created_at?: string;
          gemini_key?: string | null;
          id?: string;
          openai_key?: string | null;
          singleton?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      parametres: {
        Row: {
          address: string | null;
          city: string | null;
          company_name: string;
          country: string | null;
          created_at: string;
          currency: string;
          date_format: string;
          decimals: number;
          email: string | null;
          id: string;
          invoice_prefix: string;
          logo_url: string | null;
          phone: string | null;
          quote_prefix: string;
          rccm: string | null;
          receipt_prefix: string;
          signature_url: string | null;
          singleton: boolean;
          stamp_url: string | null;
          tax_number: string | null;
          tax_regime: string | null;
          trade_name: string | null;
          updated_at: string;
          vat_rate: number | null;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          company_name?: string;
          country?: string | null;
          created_at?: string;
          currency?: string;
          date_format?: string;
          decimals?: number;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          phone?: string | null;
          quote_prefix?: string;
          rccm?: string | null;
          receipt_prefix?: string;
          signature_url?: string | null;
          singleton?: boolean;
          stamp_url?: string | null;
          tax_number?: string | null;
          tax_regime?: string | null;
          trade_name?: string | null;
          updated_at?: string;
          vat_rate?: number | null;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          company_name?: string;
          country?: string | null;
          created_at?: string;
          currency?: string;
          date_format?: string;
          decimals?: number;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          phone?: string | null;
          quote_prefix?: string;
          rccm?: string | null;
          receipt_prefix?: string;
          signature_url?: string | null;
          singleton?: boolean;
          stamp_url?: string | null;
          tax_number?: string | null;
          tax_regime?: string | null;
          trade_name?: string | null;
          updated_at?: string;
          vat_rate?: number | null;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          tenant_id: string;
          active: boolean;
          category: string;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          id: string;
          name: string;
          photo_url: string | null;
          price: number;
          stock: number | null;
          manage_stock: boolean;
          stock_alert_threshold: number;
          type: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          tenant_id?: string;
          active?: boolean;
          category?: string;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          price?: number;
          stock?: number | null;
          manage_stock?: boolean;
          stock_alert_threshold?: number;
          type?: string;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          active?: boolean;
          category?: string;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          price?: number;
          stock?: number | null;
          manage_stock?: boolean;
          stock_alert_threshold?: number;
          type?: string;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vente_items: {
        Row: {
          cost_price: number;
          id: string;
          item_type: string;
          line_total: number;
          name: string;
          price: number;
          qty: number;
          service_id: string | null;
          selling_price: number;
          unit: string | null;
          vente_id: string;
        };
        Insert: {
          cost_price?: number;
          id?: string;
          item_type?: string;
          line_total?: number;
          name: string;
          price?: number;
          qty?: number;
          service_id?: string | null;
          selling_price?: number;
          unit?: string | null;
          vente_id: string;
        };
        Update: {
          cost_price?: number;
          id?: string;
          item_type?: string;
          line_total?: number;
          name?: string;
          price?: number;
          qty?: number;
          service_id?: string | null;
          selling_price?: number;
          unit?: string | null;
          vente_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vente_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vente_items_vente_id_fkey";
            columns: ["vente_id"];
            isOneToOne: false;
            referencedRelation: "ventes";
            referencedColumns: ["id"];
          },
        ];
      };
      ventes: {
        Row: {
          tenant_id: string;
          cashier: string | null;
          client_id: string | null;
          client_name: string | null;
          created_at: string;
          discount: number;
          id: string;
          number: string;
          payment_method: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          cashier?: string | null;
          client_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          discount?: number;
          id?: string;
          number: string;
          payment_method?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          cashier?: string | null;
          client_id?: string | null;
          client_name?: string | null;
          created_at?: string;
          discount?: number;
          id?: string;
          number?: string;
          payment_method?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ventes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      replace_and_delete_catalog_category: {
        Args: {
          source_category_id: string;
          replacement_category_id: string;
        };
        Returns: undefined;
      };
      current_user_module_enabled: {
        Args: { requested_code: string };
        Returns: boolean;
      };
      apply_inventory_movement: {
        Args: {
          requested_service_id: string;
          requested_type: string;
          requested_quantity: number;
          requested_reason: string;
          requested_source?: string;
        };
        Returns: Database["public"]["Tables"]["inventory_movements"]["Row"];
      };
      current_user_has_module_assignment: {
        Args: { requested_module_id: string };
        Returns: boolean;
      };
      create_trial_workspace: {
        Args: {
          p_user_id: string;
          p_company_name: string;
          p_full_name: string;
          p_email: string;
          p_phone: string;
        };
        Returns: {
          tenantId: string;
          slug: string;
          loginUrl: string;
        };
      };
      rollback_trial_workspace: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      consume_trial_signup_attempt: {
        Args: {
          p_ip_address: string;
          p_email: string;
          p_max_attempts?: number;
          p_window?: string;
        };
        Returns: boolean;
      };
      expire_due_subscriptions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      subscription_billing_cycle: "monthly" | "quarterly" | "yearly";
      subscription_status: "trial" | "active" | "expired" | "suspended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      subscription_billing_cycle: ["monthly", "quarterly", "yearly"],
      subscription_status: ["trial", "active", "expired", "suspended"],
    },
  },
} as const;

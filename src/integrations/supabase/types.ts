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
      achat_items: {
        Row: {
          achat_id: string
          id: string
          line_total: number
          name: string
          price: number
          qty: number
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          achat_id: string
          id?: string
          line_total?: number
          name: string
          price?: number
          qty?: number
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          achat_id?: string
          id?: string
          line_total?: number
          name?: string
          price?: number
          qty?: number
          tenant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achat_items_achat_id_fkey"
            columns: ["achat_id"]
            isOneToOne: false
            referencedRelation: "achats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achat_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      achats: {
        Row: {
          created_at: string
          discount: number
          fournisseur_id: string | null
          fournisseur_name: string | null
          id: string
          notes: string | null
          number: string
          subtotal: number
          tenant_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount?: number
          fournisseur_id?: string | null
          fournisseur_name?: string | null
          id?: string
          notes?: string | null
          number: string
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount?: number
          fournisseur_id?: string | null
          fournisseur_name?: string | null
          id?: string
          notes?: string | null
          number?: string
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achats_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          affected_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          affected_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          affected_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      ai_agent_modules: {
        Row: {
          agent_id: string
          module_id: string
        }
        Insert: {
          agent_id: string
          module_id: string
        }
        Update: {
          agent_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_modules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "erp_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_plans: {
        Row: {
          agent_id: string
          plan_code: string
        }
        Insert: {
          agent_id: string
          plan_code: string
        }
        Update: {
          agent_id?: string
          plan_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_plans_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_plans_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "ai_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      ai_agents: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          model_id: string | null
          name: string
          system_prompt: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model_id?: string | null
          name: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model_id?: string | null
          name?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_pending_actions: {
        Row: {
          action_type: string
          created_at: string
          executed_at: string | null
          expires_at: string
          id: string
          payload: Json
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload: Json
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_pending_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          context_window: number | null
          created_at: string
          id: string
          input_cost_per_million: number
          is_active: boolean
          model_key: string
          name: string
          output_cost_per_million: number
          provider: string
          updated_at: string
        }
        Insert: {
          context_window?: number | null
          created_at?: string
          id?: string
          input_cost_per_million?: number
          is_active?: boolean
          model_key: string
          name: string
          output_cost_per_million?: number
          provider: string
          updated_at?: string
        }
        Update: {
          context_window?: number | null
          created_at?: string
          id?: string
          input_cost_per_million?: number
          is_active?: boolean
          model_key?: string
          name?: string
          output_cost_per_million?: number
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_plan_quotas: {
        Row: {
          included_credits: number
          max_agents: number | null
          monthly_requests: number
          monthly_tokens: number
          plan_code: string
          updated_at: string
        }
        Insert: {
          included_credits?: number
          max_agents?: number | null
          monthly_requests: number
          monthly_tokens: number
          plan_code: string
          updated_at?: string
        }
        Update: {
          included_credits?: number
          max_agents?: number | null
          monthly_requests?: number
          monthly_tokens?: number
          plan_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_plan_quotas_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: true
            referencedRelation: "ai_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      ai_plans: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          monthly_request_limit: number | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          monthly_request_limit?: number | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          monthly_request_limit?: number | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_platform_settings: {
        Row: {
          default_model_id: string | null
          id: boolean
          logging_enabled: boolean
          monthly_budget: number | null
          retention_days: number
          updated_at: string
        }
        Insert: {
          default_model_id?: string | null
          id?: boolean
          logging_enabled?: boolean
          monthly_budget?: number | null
          retention_days?: number
          updated_at?: string
        }
        Update: {
          default_model_id?: string | null
          id?: boolean
          logging_enabled?: boolean
          monthly_budget?: number | null
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_platform_settings_default_model_id_fkey"
            columns: ["default_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          request_type: string
          status: string
          tenant_id: string
          tool_name: string | null
          total_tokens: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          request_type: string
          status: string
          tenant_id: string
          tool_name?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          request_type?: string
          status?: string
          tenant_id?: string
          tool_name?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string
          role_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module: string
          role_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string
          role_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_logs: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      depenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          paid_at: string
          payment_method: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          discount: number
          due_date: string | null
          id: string
          notes: string | null
          number: string
          status: string | null
          subtotal: number
          tenant_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          status?: string | null
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          status?: string | null
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_items: {
        Row: {
          devis_id: string
          id: string
          line_total: number
          name: string
          price: number
          qty: number
          service_id: string | null
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          devis_id: string
          id?: string
          line_total?: number
          name: string
          price?: number
          qty?: number
          service_id?: string | null
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          devis_id?: string
          id?: string
          line_total?: number
          name?: string
          price?: number
          qty?: number
          service_id?: string | null
          tenant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_items_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_modules: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      fournisseurs: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseurs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          ai_enabled: boolean
          ai_max_tokens: number | null
          ai_model: string | null
          ai_temperature: number | null
          claude_key: string | null
          created_at: string
          gemini_key: string | null
          id: string
          openai_key: string | null
          singleton: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_max_tokens?: number | null
          ai_model?: string | null
          ai_temperature?: number | null
          claude_key?: string | null
          created_at?: string
          gemini_key?: string | null
          id?: string
          openai_key?: string | null
          singleton?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          ai_max_tokens?: number | null
          ai_model?: string | null
          ai_temperature?: number | null
          claude_key?: string | null
          created_at?: string
          gemini_key?: string | null
          id?: string
          openai_key?: string | null
          singleton?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          quantity: number
          quantity_delta: number
          reason: string
          service_id: string
          source: string
          stock_after: number
          stock_before: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          quantity: number
          quantity_delta: number
          reason: string
          service_id: string
          source: string
          stock_after: number
          stock_before: number
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          quantity?: number
          quantity_delta?: number
          reason?: string
          service_id?: string
          source?: string
          stock_after?: number
          stock_before?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_pack_items: {
        Row: {
          module_id: string
          pack_id: string
        }
        Insert: {
          module_id: string
          pack_id: string
        }
        Update: {
          module_id?: string
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_pack_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "erp_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "module_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      module_packs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametres: {
        Row: {
          address: string | null
          business_sector: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          currency: string
          date_format: string
          decimals: number
          email: string | null
          id: string
          invoice_prefix: string
          logo_url: string | null
          phone: string | null
          quote_prefix: string
          rccm: string | null
          receipt_prefix: string
          signature_url: string | null
          singleton: boolean
          stamp_url: string | null
          tax_number: string | null
          tax_regime: string | null
          tenant_id: string | null
          trade_name: string | null
          updated_at: string
          vat_rate: number | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_sector?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          decimals?: number
          email?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          phone?: string | null
          quote_prefix?: string
          rccm?: string | null
          receipt_prefix?: string
          signature_url?: string | null
          singleton?: boolean
          stamp_url?: string | null
          tax_number?: string | null
          tax_regime?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string
          vat_rate?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_sector?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          decimals?: number
          email?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          phone?: string | null
          quote_prefix?: string
          rccm?: string | null
          receipt_prefix?: string
          signature_url?: string | null
          singleton?: boolean
          stamp_url?: string | null
          tax_number?: string | null
          tax_regime?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string
          vat_rate?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parametres_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          partner_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          partner_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          partner_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_activity_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_credit_transactions: {
        Row: {
          actor_id: string
          balance_after: number
          created_at: string
          credits: number
          id: string
          partner_id: string
          payment_id: string | null
          reason: string
          reference: string | null
          tenant_id: string | null
          transaction_type: string
        }
        Insert: {
          actor_id: string
          balance_after: number
          created_at?: string
          credits: number
          id?: string
          partner_id: string
          payment_id?: string | null
          reason: string
          reference?: string | null
          tenant_id?: string | null
          transaction_type: string
        }
        Update: {
          actor_id?: string
          balance_after?: number
          created_at?: string
          credits?: number
          id?: string
          partner_id?: string
          payment_id?: string | null
          reason?: string
          reference?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_credit_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_credit_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "partner_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          created_at: string
          id: string
          included_tenant_credits: number
          is_active: boolean
          max_trials: number
          module_pack_id: string
          name: string
          price: number
          subscription_duration_days: number
          trial_duration_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          included_tenant_credits: number
          is_active?: boolean
          max_trials?: number
          module_pack_id: string
          name: string
          price: number
          subscription_duration_days: number
          trial_duration_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          included_tenant_credits?: number
          is_active?: boolean
          max_trials?: number
          module_pack_id?: string
          name?: string
          price?: number
          subscription_duration_days?: number
          trial_duration_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_module_pack_id_fkey"
            columns: ["module_pack_id"]
            isOneToOne: false
            referencedRelation: "module_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string
          id: string
          offer_id: string
          partner_id: string
          reason: string | null
          status: string
          validated_at: string
          validated_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_reference: string
          id?: string
          offer_id: string
          partner_id: string
          reason?: string | null
          status?: string
          validated_at?: string
          validated_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string
          id?: string
          offer_id?: string
          partner_id?: string
          reason?: string | null
          status?: string
          validated_at?: string
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_subscriptions: {
        Row: {
          activated_at: string
          expires_at: string
          id: string
          offer_id: string
          partner_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          expires_at: string
          id?: string
          offer_id: string
          partner_id: string
          starts_at: string
          status: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          expires_at?: string
          id?: string
          offer_id?: string
          partner_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_subscriptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tenants: {
        Row: {
          assigned_at: string
          partner_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          partner_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          partner_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tenants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trial_usage: {
        Row: {
          client_email: string
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          normalized_email: string
          offer_id: string
          partner_id: string
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          client_email: string
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          normalized_email: string
          offer_id: string
          partner_id: string
          starts_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          client_email?: string
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          normalized_email?: string
          offer_id?: string
          partner_id?: string
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trial_usage_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trial_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trial_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_users: {
        Row: {
          created_at: string
          partner_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          partner_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          phone: string | null
          role_id: string | null
          sessions_revoked_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          last_login_ip?: string | null
          phone?: string | null
          role_id?: string | null
          sessions_revoked_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          phone?: string | null
          role_id?: string | null
          sessions_revoked_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string
          category_id: string | null
          cost_price: number
          created_at: string
          id: string
          manage_stock: boolean
          name: string
          photo_url: string | null
          price: number
          stock: number | null
          stock_alert_threshold: number
          tenant_id: string
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          manage_stock?: boolean
          name: string
          photo_url?: string | null
          price?: number
          stock?: number | null
          stock_alert_threshold?: number
          tenant_id: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          manage_stock?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          stock?: number | null
          stock_alert_threshold?: number
          tenant_id?: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: Database["public"]["Enums"]["subscription_billing_cycle"]
          created_at: string
          ends_at: string | null
          id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: Database["public"]["Enums"]["subscription_billing_cycle"]
          created_at?: string
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: Database["public"]["Enums"]["subscription_billing_cycle"]
          created_at?: string
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_agents: {
        Row: {
          agent_id: string
          enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ai_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          tenant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_subscriptions: {
        Row: {
          activated_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          expires_at: string | null
          id: string
          monthly_request_limit: number
          plan_code: string
          requests_used: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          expires_at?: string | null
          id?: string
          monthly_request_limit: number
          plan_code: string
          requests_used?: number
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          expires_at?: string | null
          id?: string
          monthly_request_limit?: number
          plan_code?: string
          requests_used?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "ai_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_ai_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_module_packs: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          pack_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          pack_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          pack_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "module_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_module_packs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          enabled: boolean
          module_id: string
          tenant_id: string
        }
        Insert: {
          enabled?: boolean
          module_id: string
          tenant_id: string
        }
        Update: {
          enabled?: boolean
          module_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "erp_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_catalog_settings: {
        Row: {
          catalog_codes_enabled: boolean
          catalog_mode: string
          products_in_sales_enabled: boolean
          purchases_enabled: boolean
          services_in_sales_enabled: boolean
          stock_enabled: boolean
          suppliers_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          catalog_codes_enabled?: boolean
          catalog_mode?: string
          products_in_sales_enabled?: boolean
          purchases_enabled?: boolean
          services_in_sales_enabled?: boolean
          stock_enabled?: boolean
          suppliers_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          catalog_codes_enabled?: boolean
          catalog_mode?: string
          products_in_sales_enabled?: boolean
          purchases_enabled?: boolean
          services_in_sales_enabled?: boolean
          stock_enabled?: boolean
          suppliers_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_catalog_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
        }
        Relationships: []
      }
      trial_signup_rate_limits: {
        Row: {
          attempts: number
          key_hash: string
          window_started_at: string
        }
        Insert: {
          attempts: number
          key_hash: string
          window_started_at: string
        }
        Update: {
          attempts?: number
          key_hash?: string
          window_started_at?: string
        }
        Relationships: []
      }
      vente_items: {
        Row: {
          cost_price: number
          id: string
          item_type: string
          line_total: number
          name: string
          price: number
          qty: number
          selling_price: number
          service_id: string | null
          tenant_id: string | null
          unit: string | null
          vente_id: string
        }
        Insert: {
          cost_price?: number
          id?: string
          item_type?: string
          line_total?: number
          name: string
          price?: number
          qty?: number
          selling_price?: number
          service_id?: string | null
          tenant_id?: string | null
          unit?: string | null
          vente_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          item_type?: string
          line_total?: number
          name?: string
          price?: number
          qty?: number
          selling_price?: number
          service_id?: string | null
          tenant_id?: string | null
          unit?: string | null
          vente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vente_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vente_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vente_items_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "ventes"
            referencedColumns: ["id"]
          },
        ]
      }
      ventes: {
        Row: {
          cashier: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          discount: number
          id: string
          notes: string | null
          number: string
          payment_method: string
          subtotal: number
          tenant_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          cashier?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          number: string
          payment_method?: string
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          cashier?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          payment_method?: string
          subtotal?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_rapport_mensuel: {
        Row: {
          achats_total: number | null
          benefice: number | null
          depenses_total: number | null
          mois: string | null
          ventes_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_catalog_route_enabled: {
        Args: { requested_path: string }
        Returns: boolean
      }
      activate_partner_tenant: {
        Args: { requested_actor_id: string; requested_tenant_id: string }
        Returns: undefined
      }
      adjust_partner_credits: {
        Args: {
          requested_actor_id: string
          requested_credits: number
          requested_partner_id: string
          requested_reason: string
          requested_reference: string
        }
        Returns: number
      }
      apply_inventory_movement: {
        Args: {
          requested_quantity: number
          requested_reason: string
          requested_service_id: string
          requested_source?: string
          requested_type: string
        }
        Returns: {
          created_at: string
          id: string
          movement_type: string
          quantity: number
          quantity_delta: number
          reason: string
          service_id: string
          source: string
          stock_after: number
          stock_before: number
          tenant_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_offer_pack_to_tenant: {
        Args: {
          requested_actor_id: string
          requested_pack_id: string
          requested_tenant_id: string
        }
        Returns: undefined
      }
      assign_module_pack_to_tenant: {
        Args: {
          requested_by: string
          requested_pack_id: string
          requested_tenant_id: string
        }
        Returns: undefined
      }
      consume_trial_signup_attempt: {
        Args: {
          p_email: string
          p_ip_address: string
          p_max_attempts?: number
          p_phone?: string
          p_window?: string
        }
        Returns: boolean
      }
      create_partner_account: {
        Args: {
          requested_actor_id: string
          requested_code: string
          requested_name: string
          requested_partner_id: string
          requested_user_id: string
        }
        Returns: string
      }
      create_partner_tenant: {
        Args: {
          requested_actor_id: string
          requested_email: string
          requested_name: string
          requested_trial: boolean
        }
        Returns: string
      }
      create_trial_workspace: {
        Args: {
          p_activity?: string
          p_company_name: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_user_id: string
        }
        Returns: Json
      }
      current_partner_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      current_user_has_module_assignment: {
        Args: { requested_module_id: string }
        Returns: boolean
      }
      current_user_module_enabled: {
        Args: { requested_code: string }
        Returns: boolean
      }
      delete_module_pack: {
        Args: { requested_pack_id: string }
        Returns: undefined
      }
      delete_partner_offer: {
        Args: { requested_actor_id: string; requested_offer_id: string }
        Returns: undefined
      }
      expire_due_subscriptions: { Args: never; Returns: number }
      expire_partner_trials: { Args: never; Returns: number }
      get_ai_subscription_state: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          current_period_end: string
          current_period_start: string
          expires_at: string
          module_enabled: boolean
          monthly_request_limit: number
          permission_granted: boolean
          plan_code: string
          plan_name: string
          quota_exhausted: boolean
          requests_used: number
          status: string
          valid: boolean
        }[]
      }
      global_search: {
        Args: { search_query: string }
        Returns: {
          description: string
          icon: string
          id: string
          module: string
          title: string
          url: string
        }[]
      }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      initialize_tenant_roles: {
        Args: { first_user_id?: string; target_tenant_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_platform_admin_actor: {
        Args: { requested_actor_id: string }
        Returns: boolean
      }
      log_connection_attempt: {
        Args: { p_email: string; p_status: string; p_user_id?: string }
        Returns: undefined
      }
      manage_module_pack: {
        Args: {
          requested_code: string
          requested_description: string
          requested_is_active: boolean
          requested_module_ids: string[]
          requested_name: string
          requested_pack_id: string
        }
        Returns: string
      }
      manage_partner_offer: {
        Args: {
          requested_actor_id: string
          requested_credits: number
          requested_duration_days: number
          requested_is_active: boolean
          requested_max_trials: number
          requested_name: string
          requested_offer_id: string
          requested_pack_id: string
          requested_price: number
          requested_trial_days: number
        }
        Returns: string
      }
      normalize_tenant_slug: { Args: { p_name: string }; Returns: string }
      partner_can_read_module: {
        Args: { requested_module_id: string }
        Returns: boolean
      }
      partner_can_read_tenant: {
        Args: { requested_tenant_id: string }
        Returns: boolean
      }
      partner_id_for_actor: {
        Args: { requested_actor_id: string }
        Returns: string
      }
      replace_and_delete_catalog_category: {
        Args: { replacement_category_id: string; source_category_id: string }
        Returns: undefined
      }
      reserve_ai_request: {
        Args: { p_request_type: string; p_tenant_id: string; p_user_id: string }
        Returns: {
          allowed: boolean
          current_period_end: string
          current_period_start: string
          expires_at: string
          monthly_request_limit: number
          plan_code: string
          reason: string
          requests_used: number
          subscription_status: string
          usage_log_id: string
        }[]
      }
      rollback_trial_workspace: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      set_partner_tenants: {
        Args: {
          requested_actor_id: string
          requested_partner_id: string
          requested_tenant_ids: string[]
        }
        Returns: undefined
      }
      update_partner_account: {
        Args: {
          requested_actor_id: string
          requested_code: string
          requested_is_active: boolean
          requested_name: string
          requested_partner_id: string
        }
        Returns: undefined
      }
      validate_partner_payment: {
        Args: {
          requested_actor_id: string
          requested_amount: number
          requested_currency: string
          requested_offer_id: string
          requested_partner_id: string
          requested_reason: string
          requested_reference: string
        }
        Returns: string
      }
    }
    Enums: {
      platform_role: "partner"
      subscription_billing_cycle: "monthly" | "quarterly" | "yearly"
      subscription_status: "trial" | "active" | "expired" | "suspended"
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
      platform_role: ["partner"],
      subscription_billing_cycle: ["monthly", "quarterly", "yearly"],
      subscription_status: ["trial", "active", "expired", "suspended"],
    },
  },
} as const

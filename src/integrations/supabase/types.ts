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
      active_user_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device: string | null
          ended_at: string | null
          id: string
          ip_masked: string | null
          last_seen_at: string
          latitude: number | null
          location_source: string
          longitude: number | null
          revoked_at: string | null
          revoked_by: string | null
          session_id: string
          started_at: string
          tenant_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          ended_at?: string | null
          id?: string
          ip_masked?: string | null
          last_seen_at?: string
          latitude?: number | null
          location_source?: string
          longitude?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id: string
          started_at?: string
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          ended_at?: string | null
          id?: string
          ip_masked?: string | null
          last_seen_at?: string
          latitude?: number | null
          location_source?: string
          longitude?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string
          started_at?: string
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          browser: string | null
          created_at: string | null
          device: string | null
          email: string | null
          id: string
          is_suspicious: boolean
          status: string
          suspicious_marked_at: string | null
          suspicious_marked_by: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          email?: string | null
          id?: string
          is_suspicious?: boolean
          status?: string
          suspicious_marked_at?: string | null
          suspicious_marked_by?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          email?: string | null
          id?: string
          is_suspicious?: boolean
          status?: string
          suspicious_marked_at?: string | null
          suspicious_marked_by?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      depenses: {
        Row: {
          amount: number
          category: string
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          paid_at: string
          payment_method: string | null
          room_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
          room_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
          room_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_category_id_tenant_id_fkey"
            columns: ["category_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "depenses_room_id_tenant_id_fkey"
            columns: ["room_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "depenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
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
          cost_price: number
          devis_id: string
          id: string
          item_type: string | null
          line_total: number
          name: string
          price: number
          qty: number
          service_id: string | null
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          cost_price?: number
          devis_id: string
          id?: string
          item_type?: string | null
          line_total?: number
          name: string
          price?: number
          qty?: number
          service_id?: string | null
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          cost_price?: number
          devis_id?: string
          id?: string
          item_type?: string | null
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
      hotel_guest_companions: {
        Row: {
          full_name: string
          id: string
          identity_number: string | null
          reservation_id: string
          tenant_id: string
        }
        Insert: {
          full_name: string
          id?: string
          identity_number?: string | null
          reservation_id: string
          tenant_id: string
        }
        Update: {
          full_name?: string
          id?: string
          identity_number?: string | null
          reservation_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_guest_companions_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservation_balances"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_guest_companions_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservations"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_guest_companions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_guests: {
        Row: {
          address: string | null
          archived_at: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          identity_document_path: string | null
          identity_number: string | null
          identity_type: string | null
          last_name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          identity_document_path?: string | null
          identity_number?: string | null
          identity_type?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          identity_document_path?: string | null
          identity_number?: string | null
          identity_type?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_maintenance_providers: {
        Row: {
          availability_status: string
          company_name: string | null
          created_at: string
          full_name: string
          id: string
          internal_note: string | null
          intervention_area: string | null
          is_active: boolean
          phone: string
          tenant_id: string
          trade: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          availability_status?: string
          company_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          internal_note?: string | null
          intervention_area?: string | null
          is_active?: boolean
          phone: string
          tenant_id: string
          trade: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          availability_status?: string
          company_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          internal_note?: string | null
          intervention_area?: string | null
          is_active?: boolean
          phone?: string
          tenant_id?: string
          trade?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_maintenance_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_reservation_extras: {
        Row: {
          created_at: string
          id: string
          label: string
          quantity: number
          reservation_id: string
          tenant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          quantity?: number
          reservation_id: string
          tenant_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          quantity?: number
          reservation_id?: string
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reservation_extras_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservation_balances"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservation_extras_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservations"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservation_extras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_reservation_payments: {
        Row: {
          amount: number
          id: string
          method: string
          notes: string | null
          paid_at: string
          reference: string | null
          reservation_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          id?: string
          method: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          reservation_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          reservation_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reservation_payments_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservation_balances"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservation_payments_reservation_id_tenant_id_fkey"
            columns: ["reservation_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservations"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservation_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_reservations: {
        Row: {
          accommodation_total: number | null
          check_in: string
          check_out: string
          created_at: string
          discount: number
          guest_id: string | null
          id: string
          nightly_rate: number
          nights: number | null
          notes: string | null
          room_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accommodation_total?: number | null
          check_in: string
          check_out: string
          created_at?: string
          discount?: number
          guest_id?: string | null
          id?: string
          nightly_rate: number
          nights?: number | null
          notes?: string | null
          room_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accommodation_total?: number | null
          check_in?: string
          check_out?: string
          created_at?: string
          discount?: number
          guest_id?: string | null
          id?: string
          nightly_rate?: number
          nights?: number | null
          notes?: string | null
          room_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reservations_guest_id_tenant_id_fkey"
            columns: ["guest_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_guests"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservations_room_id_tenant_id_fkey"
            columns: ["room_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_types: {
        Row: {
          amenities: string[]
          base_rate: number
          capacity: number
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          amenities?: string[]
          base_rate?: number
          capacity?: number
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          amenities?: string[]
          base_rate?: number
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: string[]
          capacity: number
          cover_image_path: string | null
          created_at: string
          id: string
          number: string
          rate: number
          room_type_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          capacity?: number
          cover_image_path?: string | null
          created_at?: string
          id?: string
          number: string
          rate?: number
          room_type_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          capacity?: number
          cover_image_path?: string | null
          created_at?: string
          id?: string
          number?: string
          rate?: number
          room_type_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_room_type_tenant_fkey"
            columns: ["room_type_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_room_types"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_settings: {
        Row: {
          cancellation_policy: string | null
          check_in_time: string
          check_out_time: string
          establishment_name: string | null
          id: string
          payment_methods: string[]
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancellation_policy?: string | null
          check_in_time?: string
          check_out_time?: string
          establishment_name?: string | null
          id?: string
          payment_methods?: string[]
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancellation_policy?: string | null
          check_in_time?: string
          check_out_time?: string
          establishment_name?: string | null
          id?: string
          payment_methods?: string[]
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      partner_credit_packs: {
        Row: {
          created_at: string
          credit_count: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_count: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_count?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_credit_purchases: {
        Row: {
          amount: number
          attributed_by: string
          created_at: string
          credit_pack_id: string
          credits: number
          currency: string
          id: string
          partner_id: string
          reason: string | null
          reference: string
        }
        Insert: {
          amount: number
          attributed_by: string
          created_at?: string
          credit_pack_id: string
          credits: number
          currency?: string
          id?: string
          partner_id: string
          reason?: string | null
          reference: string
        }
        Update: {
          amount?: number
          attributed_by?: string
          created_at?: string
          credit_pack_id?: string
          credits?: number
          currency?: string
          id?: string
          partner_id?: string
          reason?: string | null
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_credit_purchases_credit_pack_id_fkey"
            columns: ["credit_pack_id"]
            isOneToOne: false
            referencedRelation: "partner_credit_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_credit_purchases_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_credit_transactions: {
        Row: {
          actor_id: string
          balance_after: number
          created_at: string
          credit_purchase_id: string | null
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
          credit_purchase_id?: string | null
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
          credit_purchase_id?: string | null
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
            foreignKeyName: "partner_credit_transactions_credit_purchase_id_fkey"
            columns: ["credit_purchase_id"]
            isOneToOne: false
            referencedRelation: "partner_credit_purchases"
            referencedColumns: ["id"]
          },
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
            isOneToOne: false
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
          activity_profile_code: string | null
          business_sector: string | null
          city: string | null
          client_email: string
          commission_amount: number
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          manager_name: string | null
          normalized_email: string
          offer_id: string
          partner_id: string
          phone: string | null
          requested_module_ids: string[]
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          activity_profile_code?: string | null
          business_sector?: string | null
          city?: string | null
          client_email: string
          commission_amount?: number
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          manager_name?: string | null
          normalized_email: string
          offer_id: string
          partner_id: string
          phone?: string | null
          requested_module_ids?: string[]
          starts_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          activity_profile_code?: string | null
          business_sector?: string | null
          city?: string | null
          client_email?: string
          commission_amount?: number
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          manager_name?: string | null
          normalized_email?: string
          offer_id?: string
          partner_id?: string
          phone?: string | null
          requested_module_ids?: string[]
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trial_usage_activity_profile_code_fkey"
            columns: ["activity_profile_code"]
            isOneToOne: false
            referencedRelation: "trial_activity_profiles"
            referencedColumns: ["code"]
          },
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
      platform_security_role_assignments: {
        Row: {
          created_at: string
          role_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_name?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_security_role_permissions: {
        Row: {
          permission_code: string
          role_name: string
        }
        Insert: {
          permission_code: string
          role_name: string
        }
        Update: {
          permission_code?: string
          role_name?: string
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
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
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
      tenant_deletion_jobs: {
        Row: {
          attempt_count: number
          auth_user_ids: string[]
          completed_at: string | null
          created_at: string
          current_step: string
          id: string
          last_error: Json | null
          lock_token: string | null
          locked_at: string | null
          requested_by: string
          started_at: string | null
          status: string
          steps: Json
          storage_paths: Json
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          auth_user_ids?: string[]
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          last_error?: Json | null
          lock_token?: string | null
          locked_at?: string | null
          requested_by: string
          started_at?: string | null
          status?: string
          steps?: Json
          storage_paths?: Json
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          auth_user_ids?: string[]
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          last_error?: Json | null
          lock_token?: string | null
          locked_at?: string | null
          requested_by?: string
          started_at?: string | null
          status?: string
          steps?: Json
          storage_paths?: Json
          tenant_id?: string
          tenant_name?: string
          tenant_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_lifecycle_audit: {
        Row: {
          action: string
          created_at: string
          dependency_snapshot: Json
          id: string
          partner_id: string | null
          reason: string
          super_admin_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          dependency_snapshot?: Json
          id?: string
          partner_id?: string | null
          reason: string
          super_admin_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          dependency_snapshot?: Json
          id?: string
          partner_id?: string | null
          reason?: string
          super_admin_id?: string
          tenant_id?: string
        }
        Relationships: []
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
      tenant_suspension_requests: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          reason: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          reason: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          reason?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_suspension_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_suspension_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activity: string | null
          activity_profile_code: string | null
          address: string | null
          business_sector: string | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          onboarding_status: string
          phone: string | null
          platform_type: string
          slug: string
          suggested_pack_code: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
        }
        Insert: {
          activity?: string | null
          activity_profile_code?: string | null
          address?: string | null
          business_sector?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          onboarding_status?: string
          phone?: string | null
          platform_type?: string
          slug: string
          suggested_pack_code?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
        }
        Update: {
          activity?: string | null
          activity_profile_code?: string | null
          address?: string | null
          business_sector?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          onboarding_status?: string
          phone?: string | null
          platform_type?: string
          slug?: string
          suggested_pack_code?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_activity_profile_code_fkey"
            columns: ["activity_profile_code"]
            isOneToOne: false
            referencedRelation: "trial_activity_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      trial_activity_profile_modules: {
        Row: {
          module_id: string
          profile_code: string
        }
        Insert: {
          module_id: string
          profile_code: string
        }
        Update: {
          module_id?: string
          profile_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_activity_profile_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "erp_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_activity_profile_modules_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "trial_activity_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      trial_activity_profiles: {
        Row: {
          code: string
          description: string | null
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          description?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
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
      hotel_reservation_balances: {
        Row: {
          accommodation_total: number | null
          balance_due: number | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          discount: number | null
          extras_total: number | null
          grand_total: number | null
          guest_id: string | null
          id: string | null
          nightly_rate: number | null
          nights: number | null
          notes: string | null
          paid_total: number | null
          room_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reservations_guest_id_tenant_id_fkey"
            columns: ["guest_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_guests"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservations_room_id_tenant_id_fkey"
            columns: ["room_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "hotel_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      activate_invited_tenant_after_password: { Args: never; Returns: Json }
      activate_partner_tenant: {
        Args: { requested_actor_id: string; requested_tenant_id: string }
        Returns: undefined
      }
      activate_pending_trial: {
        Args: {
          p_actor_id: string
          p_amount?: number
          p_billing_cycle: string
          p_duration_days: number
          p_module_ids: string[]
          p_pack_id: string
          p_tenant_id: string
        }
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
      assert_platform_admin: {
        Args: { requested_actor_id: string }
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
      can_manage_avatar_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      consume_trial_signup_attempt: {
        Args: {
          p_email: string
          p_ip_address: string
          p_max_attempts?: number
          p_window?: string
        }
        Returns: boolean
      }
      create_invited_tenant_atomic: {
        Args: {
          requested_actor_id: string
          requested_admin_email: string
          requested_admin_name: string
          requested_admin_user_id: string
          requested_billing_cycle: Database["public"]["Enums"]["subscription_billing_cycle"]
          requested_company_name: string
          requested_duration_days: number
          requested_module_ids?: string[]
          requested_platform_type: string
        }
        Returns: Json
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
      create_partner_paid_tenant: {
        Args: {
          requested_activity_profile_code: string
          requested_actor_id: string
          requested_admin_user_id: string
          requested_city: string
          requested_email: string
          requested_manager_name: string
          requested_name: string
          requested_phone: string
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
      create_partner_trial: {
        Args: {
          requested_activity_profile_code: string
          requested_actor_id: string
          requested_admin_user_id: string
          requested_city: string
          requested_email: string
          requested_manager_name: string
          requested_name: string
          requested_phone: string
        }
        Returns: string
      }
      create_pending_trial_request: {
        Args: {
          p_activity: string
          p_company_name: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_user_id: string
        }
        Returns: string
      }
      create_public_trial_workspace: {
        Args: {
          p_company_name: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_platform_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_tenant_by_super_admin_invitation: {
        Args: {
          requested_actor_id: string
          requested_admin_email: string
          requested_admin_user_id: string
          requested_billing_cycle: Database["public"]["Enums"]["subscription_billing_cycle"]
          requested_company_name: string
          requested_duration_days: number
          requested_module_ids?: string[]
        }
        Returns: string
      }
      create_trial_workspace: {
        Args: {
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
      current_user_can_access_parties: { Args: never; Returns: boolean }
      current_user_catalog_route_enabled: {
        Args: { requested_path: string }
        Returns: boolean
      }
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
      delete_tenant_postgres_data: {
        Args: { requested_actor_id: string; requested_job_id: string }
        Returns: undefined
      }
      delete_tenant_postgres_data_core: {
        Args: { requested_actor_id: string; requested_job_id: string }
        Returns: undefined
      }
      expire_due_subscriptions: { Args: never; Returns: number }
      expire_partner_trials: { Args: never; Returns: number }
      finalize_tenant_deletion: {
        Args: { requested_actor_id: string; requested_job_id: string }
        Returns: undefined
      }
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
      get_ai_subscription_state_active_tenant_core: {
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
      get_hotel_report_export_data: { Args: never; Returns: Json }
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
      has_connection_security_permission: {
        Args: { requested_permission: string }
        Returns: boolean
      }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      heartbeat_user_session: {
        Args: {
          p_gps_consent: boolean
          p_latitude: number
          p_longitude: number
          p_session_id: string
        }
        Returns: boolean
      }
      hotel_module_enabled: { Args: { code: string }; Returns: boolean }
      hotel_permission_for: {
        Args: {
          module_code: string
          permission_code: string
          target_tenant: string
        }
        Returns: boolean
      }
      hotel_tenant_id: { Args: never; Returns: string }
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
        Args: {
          p_browser?: string
          p_device?: string
          p_email: string
          p_status: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      manage_hotel_tenant_module: {
        Args: {
          requested_actor_id: string
          requested_enabled: boolean
          requested_module_id: string
          requested_tenant_id: string
        }
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
      manage_partner_credit_pack: {
        Args: {
          requested_actor_id: string
          requested_credit_count: number
          requested_is_active: boolean
          requested_name: string
          requested_pack_id: string
          requested_price: number
        }
        Returns: string
      }
      manage_partner_offer:
        | {
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
        | {
            Args: {
              requested_actor_id: string
              requested_expires_at: string
              requested_offer_id: string
              requested_partner_id: string
              requested_replace_active: boolean
              requested_starts_at: string
            }
            Returns: string
          }
      manage_tenant_lifecycle: {
        Args: {
          requested_action: string
          requested_actor_id: string
          requested_exact_name?: string
          requested_reason: string
          requested_second_confirmation?: string
          requested_tenant_id: string
        }
        Returns: Json
      }
      manage_user_connection_security: {
        Args: {
          requested_action: string
          requested_connection_id?: string
          requested_session_id?: string
          requested_user_id: string
        }
        Returns: undefined
      }
      mark_invited_tenant_pending_password: {
        Args: { p_full_name: string; p_tenant_id: string; p_user_id: string }
        Returns: undefined
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
      purchase_partner_credit_pack: {
        Args: {
          requested_actor_id: string
          requested_pack_id: string
          requested_partner_id: string
          requested_reason: string
          requested_reference: string
        }
        Returns: string
      }
      replace_and_delete_catalog_category: {
        Args: { replacement_category_id: string; source_category_id: string }
        Returns: undefined
      }
      request_tenant_suspension: {
        Args: {
          requested_actor_id: string
          requested_reason: string
          requested_tenant_id: string
        }
        Returns: string
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
      reserve_ai_request_active_tenant_core: {
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
      set_profile_avatar: {
        Args: { avatar_path: string; target_user_id: string }
        Returns: string
      }
      start_tenant_deletion: {
        Args: {
          requested_actor_id: string
          requested_slug: string
          requested_tenant_id: string
        }
        Returns: string
      }
      tenant_dependency_snapshot: {
        Args: { requested_tenant_id: string }
        Returns: Json
      }
      tenant_has_current_access: {
        Args: { requested_tenant_id: string }
        Returns: boolean
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

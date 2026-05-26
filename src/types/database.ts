/**
 * Database types for the B4BC Connect Supabase schema.
 * Shape matches `supabase gen types typescript` output so the
 * @supabase/supabase-js generic threads through correctly.
 */

export type MemberStatus = "active" | "inactive" | "pending";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type DeletionStatus = "scheduled" | "cancelled" | "completed";
export type AppRole = "admin" | "zone_user" | "member";

export interface AppUserMetadata {
  role: AppRole;
  zone?: string | null;
  display_name?: string | null;
}

export type Database = {
  public: {
    Tables: {
      industries: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          accent_color: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          accent_color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          accent_color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      zones: {
        Row: { id: string; name: string; active: boolean };
        Insert: { id: string; name: string; active?: boolean };
        Update: { id?: string; name?: string; active?: boolean };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          user_id: string | null;
          legacy_member_id: number | null;
          registered_id: string | null;
          company_name: string;
          contact_name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          industry_id: number | null;
          zone_id: string | null;
          description: string | null;
          services: string[];
          logo_url: string | null;
          city: string | null;
          state: string | null;
          address_line1: string | null;
          pincode: string | null;
          date_of_joining: string | null;
          date_of_exit: string | null;
          status: MemberStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          legacy_member_id?: number | null;
          registered_id?: string | null;
          company_name: string;
          contact_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          industry_id?: number | null;
          zone_id?: string | null;
          description?: string | null;
          services?: string[];
          logo_url?: string | null;
          city?: string | null;
          state?: string | null;
          address_line1?: string | null;
          pincode?: string | null;
          date_of_joining?: string | null;
          date_of_exit?: string | null;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          legacy_member_id?: number | null;
          registered_id?: string | null;
          company_name?: string;
          contact_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          industry_id?: number | null;
          zone_id?: string | null;
          description?: string | null;
          services?: string[];
          logo_url?: string | null;
          city?: string | null;
          state?: string | null;
          address_line1?: string | null;
          pincode?: string | null;
          date_of_joining?: string | null;
          date_of_exit?: string | null;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: { user_id: string; member_id: string; created_at: string };
        Insert: {
          user_id: string;
          member_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          member_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: number;
          reporter_id: string | null;
          member_id: string;
          reason: string;
          note: string | null;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: number;
          reporter_id?: string | null;
          member_id: string;
          reason: string;
          note?: string | null;
          status?: ReportStatus;
          created_at?: string;
        };
        Update: {
          id?: number;
          reporter_id?: string | null;
          member_id?: string;
          reason?: string;
          note?: string | null;
          status?: ReportStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      user_deletion_requests: {
        Row: {
          user_id: string;
          requested_at: string;
          deletion_after: string;
          status: DeletionStatus;
        };
        Insert: {
          user_id: string;
          requested_at?: string;
          deletion_after: string;
          status?: DeletionStatus;
        };
        Update: {
          user_id?: string;
          requested_at?: string;
          deletion_after?: string;
          status?: DeletionStatus;
        };
        Relationships: [];
      };
      user_exports: {
        Row: {
          id: number;
          user_id: string;
          requested_at: string;
          download_url: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          requested_at?: string;
          download_url?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          requested_at?: string;
          download_url?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      directory_members: {
        Row: {
          id: string;
          user_id: string | null;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          description: string | null;
          services: string[];
          logo_url: string | null;
          city: string | null;
          state: string | null;
          address_line1: string | null;
          pincode: string | null;
          status: MemberStatus;
          created_at: string;
          updated_at: string;
          industry_id: number | null;
          industry_name: string | null;
          industry_accent_color: string | null;
          zone_id: string | null;
          zone_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience aliases for app code.
export type Industry = Database["public"]["Tables"]["industries"]["Row"];
export type Zone = Database["public"]["Tables"]["zones"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type DirectoryMember =
  Database["public"]["Views"]["directory_members"]["Row"];
export type UserDeletionRequest =
  Database["public"]["Tables"]["user_deletion_requests"]["Row"];
export type UserExport = Database["public"]["Tables"]["user_exports"]["Row"];

/**
 * Shapes returned by server actions in src/app/actions/queries.ts.
 * Backed directly by the legacy MySQL schema in u482963442_events_mgmt —
 * columns are aliased in SQL to the names below so existing UI components
 * keep working unchanged.
 */

export interface Industry {
  id: number;
  name: string;
  description: string | null;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
}

export interface Zone {
  id: string;
  name: string;
}

export interface DirectoryMember {
  id: string;
  registered_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  business_nature: string | null;
  sector: string | null;
  industry_text: string | null;
  other_sector: string | null;
  other_industry: string | null;
  designation: string | null;
  business_location: string | null;
  turnover: string | null;
  referred_by: string | null;
  services: string[];
  logo_url: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  industry_id: number | null;
  industry_name: string | null;
  industry_accent_color: string | null;
  zone_id: string | null;
  zone_name: string | null;
  chapter_id: number | null;
  chapter_name: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalMembers: number;
  industries: Array<{
    id: number;
    name: string;
    description: string | null;
    accent_color: string;
    sort_order: number;
    member_count: number;
  }>;
}

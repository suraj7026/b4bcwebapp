export type Role = "admin" | "zone_user" | "member";

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  zone: string | null;
  memberId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends TokenPair {
  user: ApiUser;
}

export interface Industry {
  id: string;
  name: string;
  description: string | null;
  accentColor: string;
  memberCount: number;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Address {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
}

export interface BusinessMember {
  id: string;
  companyName: string | null;
  contactName: string | null;
  industryId: string | null;
  zone: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: Address;
  description: string | null;
  services: string[];
  logoUrl: string | null;
  updatedAt: string | null;
}

export interface MemberListResponse {
  items: BusinessMember[];
  nextCursor: string | null;
  total: number;
}

export interface MemberListParams {
  q?: string;
  industryId?: string;
  zone?: string;
  sort?: "name" | "-name" | "recent";
  cursor?: string;
  limit?: number;
}

export interface MemberPatchPayload {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  description?: string;
  services?: string[];
  address?: Partial<Address>;
}

export interface MemberReportPayload {
  reason: string;
  note?: string;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

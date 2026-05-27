import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  Eye,
  EyeOff,
  Factory,
  Flag,
  Hammer,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Microscope,
  Paintbrush,
  Phone,
  Plus,
  Scale,
  Search,
  SearchX,
  Shield,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  account_balance: Scale,
  account_circle: UserCircle,
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  badge: BadgeCheck,
  biotech: Microscope,
  bookmark: Bookmark,
  business_center: BriefcaseBusiness,
  call: Phone,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  construction: Hammer,
  delete: Trash2,
  design_services: Paintbrush,
  download: Download,
  error: CircleAlert,
  expand_more: ChevronDown,
  factory: Factory,
  flag: Flag,
  lightbulb: Lightbulb,
  location_on: MapPin,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  progress_activity: LoaderCircle,
  psychology: Sparkles,
  public: Building2,
  search: Search,
  search_off: SearchX,
  shield: Shield,
  shopping_bag: ShoppingBag,
  spa: Leaf,
  space_dashboard: LayoutDashboard,
  trending_up: TrendingUp,
  verified: BadgeCheck,
  visibility: Eye,
  visibility_off: EyeOff,
};

export function Icon({
  name,
  filled,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  const Component = ICONS[name] ?? CircleAlert;
  const shouldFill = filled && name === "bookmark";
  return (
    <Component
      aria-hidden="true"
      className={cn("inline-block size-[1em] shrink-0 select-none", className)}
      fill={shouldFill ? "currentColor" : "none"}
      strokeWidth={filled ? 2.4 : 2}
    />
  );
}

import {
  Banknote,
  Calendar,
  ChartBar,
  Fingerprint,
  Forklift,
  Gauge,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  SquareArrowUpRight,
  Tags,
  Users,
  Wallet,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  isDevelopmentOnly?: boolean;
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    // label: "Dashboards",
    items: [
      {
        title: "Overview",
        url: "/dashboard/overview",
        icon: Gauge,
      },
      {
        title: "Accounts",
        url: "/dashboard/accounts",
        icon: Wallet,
      },
      {
        title: "Expense",
        url: "/dashboard/expense",
        icon: ReceiptText,
      },
      {
        title: "Budgets",
        url: "/dashboard/budgets",
        icon: PiggyBank,
      },
      {
        title: "Categories",
        url: "/dashboard/categories",
        icon: Tags,
      },
    ],
  },
  {
    id: 2,
    label: "Dev Dashboards",
    isDevelopmentOnly: true,
    items: [
      {
        title: "Default",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
    ],
  },
];

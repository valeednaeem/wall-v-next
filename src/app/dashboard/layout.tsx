"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, FileText, FolderKanban, Users,
  Cloud, Globe, Settings, ShoppingBag, ChevronRight,
  Menu, X, LogOut, User, CreditCard, Shield, Search, Bell, AlertTriangle,
  BarChart3, Bot, ClipboardList, CheckSquare, Activity, Scan, MessageSquare, DollarSign, GitBranch, Puzzle
} from "lucide-react";

interface SidebarChild {
  label: string;
  href: string;
  permission?: string;
}

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarChild[];
  permission?: string;
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "PM System", href: "/dashboard/project-manager", icon: <ClipboardList className="h-4 w-4" />, permission: "projects:view", children: [
    { label: "PM Control Center", href: "/dashboard/project-manager", permission: "projects:view" },
    { label: "Admin Center", href: "/dashboard/admin-center", permission: "projects:view" },
    { label: "Projects", href: "/dashboard/projects", permission: "projects:view" },
    { label: "Tasks", href: "/dashboard/tasks", permission: "projects:view" },
    { label: "Workforce", href: "/dashboard/workforce", permission: "projects:view" },
    { label: "Monitor", href: "/dashboard/monitoring", permission: "projects:view" },
    { label: "Scanner", href: "/dashboard/scanner", permission: "projects:view" },
    { label: "Comms", href: "/dashboard/communications", permission: "projects:view" },
    { label: "Financials", href: "/dashboard/financials", permission: "projects:view" },
    { label: "Reports", href: "/dashboard/reports", permission: "projects:view" },
    { label: "Workflows", href: "/dashboard/workflows", permission: "projects:view" },
    { label: "Config", href: "/dashboard/config", permission: "projects:view" },
    { label: "Integrations", href: "/dashboard/integrations", permission: "projects:view" },
  ]},
  { label: "E-Commerce", href: "/dashboard/ecommerce/products", icon: <ShoppingBag className="h-4 w-4" />, permission: "products:view", children: [
    { label: "Products", href: "/dashboard/ecommerce/products", permission: "products:view" },
    { label: "Categories", href: "/dashboard/ecommerce/products/categories", permission: "categories:view" },
    { label: "Orders", href: "/dashboard/orders", permission: "orders:view" },
    { label: "Invoices", href: "/dashboard/invoices", permission: "finance:view" },
    { label: "Payments", href: "/dashboard/payments", permission: "finance:view" },
  ]},
  { label: "Blog", href: "/dashboard/blog", icon: <FileText className="h-4 w-4" />, permission: "blog:view", children: [
    { label: "All Posts", href: "/dashboard/blog", permission: "blog:view" },
    { label: "New Post", href: "/dashboard/blog/new", permission: "blog:create" },
  ]},
  { label: "AI", href: "/dashboard/ai-conversations", icon: <Bot className="h-4 w-4" />, permission: "ai:access", children: [
    { label: "Conversations", href: "/dashboard/ai-conversations", permission: "ai:access" },
    { label: "All Agents", href: "/dashboard/agents", permission: "agents:view" },
    { label: "New Agent", href: "/dashboard/agents/new", permission: "agents:create" },
    { label: "Project Requests", href: "/dashboard/agents/project-requests", permission: "agents:view" },
    { label: "Approvals", href: "/dashboard/agents/approvals", permission: "agents:approve" },
    { label: "Audit Logs", href: "/dashboard/agents/audit-logs", permission: "agents:monitor" },
  ]},
  { label: "CRM", href: "/dashboard/crm", icon: <Users className="h-4 w-4" />, permission: "crm:view", children: [
    { label: "Overview", href: "/dashboard/crm", permission: "crm:view" },
    { label: "Leads", href: "/dashboard/crm/leads", permission: "crm:leads" },
    { label: "Clients", href: "/dashboard/crm/clients", permission: "crm:clients" },
    { label: "Inquiries", href: "/dashboard/crm/inquiries", permission: "crm:inquiries" },
  ]},
  { label: "Marketing", href: "/dashboard/marketing", icon: <BarChart3 className="h-4 w-4" />, permission: "marketing:view", children: [
    { label: "Overview", href: "/dashboard/marketing", permission: "marketing:view" },
    { label: "Google Services", href: "/dashboard/marketing/google", permission: "google:analytics:view" },
    { label: "SEO", href: "/dashboard/marketing/seo", permission: "seo:view" },
    { label: "Tracking", href: "/dashboard/marketing/tracking", permission: "tracking:view" },
    { label: "Social Sharing", href: "/dashboard/marketing/social", permission: "marketing:view" },
    { label: "Diagnostics", href: "/dashboard/marketing/diagnostics", permission: "marketing:view" },
  ]},
  { label: "Hosting", href: "/dashboard/hosting", icon: <Cloud className="h-4 w-4" />, permission: "hosting:view", children: [
    { label: "Hosting Plans", href: "/dashboard/hosting", permission: "hosting:view" },
    { label: "Hosting Offers", href: "/dashboard/hosting/offers", permission: "hosting:manage" },
  ]},
  { label: "Domains", href: "/dashboard/domains", icon: <Globe className="h-4 w-4" />, permission: "domains:view", children: [
    { label: "Domain TLDs", href: "/dashboard/domains", permission: "domains:view" },
    { label: "Domain Offers", href: "/dashboard/domains/offers", permission: "domains:manage" },
  ]},
  { label: "Users", href: "/dashboard/users", icon: <Users className="h-4 w-4" />, permission: "users:view", children: [
    { label: "All Users", href: "/dashboard/users", permission: "users:view" },
    { label: "Roles", href: "/dashboard/users/roles", permission: "roles:view" },
  ]},
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" />, children: [
    { label: "General", href: "/dashboard/settings", permission: "settings:manage" },
    { label: "Pricing", href: "/dashboard/settings/pricing", permission: "settings:manage" },
    { label: "Profile", href: "/dashboard/settings/profile" },
    { label: "Security", href: "/dashboard/settings/auth" },
    { label: "Payment Gateway", href: "/dashboard/settings/payments", permission: "settings:manage" },
    { label: "Payment Stats", href: "/dashboard/settings/payment", permission: "settings:manage" },
    { label: "Legal & Compliance", href: "/dashboard/settings/legal", permission: "settings:manage" },
  ]},
  { label: "Error Logs", href: "/dashboard/errors", icon: <AlertTriangle className="h-4 w-4" />, permission: "settings:view" },
  { label: "Security", href: "/dashboard/security", icon: <Shield className="h-4 w-4" />, permission: "settings:manage" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const userRole = (user as { role?: string })?.role || "customer";
  const userPermissions = (user as { permissions?: string[] })?.permissions || [];
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const isSuperAdmin = userPermissions.includes("*");

  function hasPermission(permission?: string): boolean {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    return userPermissions.includes(permission);
  }

  function hasAccess(item: SidebarItem): boolean {
    return hasPermission(item.permission);
  }

  const filteredSidebarItems = sidebarItems.filter((item) => {
    if (!hasAccess(item)) return false;
    if (item.children) {
      const filteredChildren = item.children.filter((child) => hasPermission(child.permission));
      if (filteredChildren.length === 0) return false;
    }
    return true;
  }).map((item) => {
    if (item.children) {
      return { ...item, children: item.children.filter((child) => hasPermission(child.permission)) };
    }
    return item;
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const sidebar = (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-white flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
          <img src="/wall-v-logo-lg.png" alt="Wall-V" className="h-8 w-auto" />
        </Link>
        <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {filteredSidebarItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${expandedItems.includes(item.label) ? "rotate-90" : ""}`} />
                </button>
                {expandedItems.includes(item.label) && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l pl-3">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${pathname === child.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t p-3">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            {user?.image ? (
              <img src={user.image} alt={userName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {userInitial}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{userRole.replace(/-/g, " ")}</p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-lg shadow-lg py-1 z-50">
              <Link href="/dashboard/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <Link href="/dashboard/settings/auth" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                <Shield className="h-4 w-4" /> Security
              </Link>
              <Link href="/dashboard/settings/payment" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                <CreditCard className="h-4 w-4" /> Billing
              </Link>
              <hr className="my-1" />
              <button
                onClick={() => {
                  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                  signOut({ callbackUrl: "/" });
                  setUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          {sidebar}
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white/95 backdrop-blur px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search..." className="w-64 rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-accent transition-colors hidden sm:block">
              View Site
            </Link>
            <button className="p-2 rounded-lg hover:bg-accent relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>

        <footer className="border-t bg-muted/30 px-4 py-4 lg:px-6">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}{" "}
            <Link href="/copyright" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Wall-V
            </Link>
            . All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

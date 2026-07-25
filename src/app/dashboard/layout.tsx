"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, FileText, FolderKanban, Users, Receipt,
  Cloud, Globe, Headphones, Settings, ShoppingBag, Tags, ChevronRight,
  Menu, X, LogOut, User, CreditCard, Shield, Search, Bell
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "E-Commerce", href: "/dashboard/ecommerce/products", icon: <ShoppingBag className="h-4 w-4" />, children: [
    { label: "Products", href: "/dashboard/ecommerce/products" },
    { label: "Categories", href: "/dashboard/ecommerce/products/categories" },
    { label: "Orders", href: "/dashboard/orders" },
  ]},
  { label: "Blog", href: "/dashboard/blog", icon: <FileText className="h-4 w-4" />, children: [
    { label: "All Posts", href: "/dashboard/blog" },
    { label: "New Post", href: "/dashboard/blog/new" },
  ]},
  { label: "Projects", href: "/dashboard/projects", icon: <FolderKanban className="h-4 w-4" /> },
  { label: "CRM", href: "/dashboard/crm", icon: <Users className="h-4 w-4" />, children: [
    { label: "Overview", href: "/dashboard/crm" },
    { label: "Leads", href: "/dashboard/crm/leads" },
    { label: "Clients", href: "/dashboard/crm/clients" },
    { label: "Inquiries", href: "/dashboard/crm/inquiries" },
  ]},
  { label: "Invoices", href: "/dashboard/invoices", icon: <Receipt className="h-4 w-4" /> },
  { label: "Hosting", href: "/dashboard/hosting", icon: <Cloud className="h-4 w-4" /> },
  { label: "Domains", href: "/dashboard/domains", icon: <Globe className="h-4 w-4" /> },
  { label: "Support", href: "/dashboard/support", icon: <Headphones className="h-4 w-4" /> },
  { label: "Users", href: "/dashboard/users", icon: <Users className="h-4 w-4" />, children: [
    { label: "All Users", href: "/dashboard/users" },
    { label: "Roles", href: "/dashboard/users/roles" },
  ]},
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" />, children: [
    { label: "General", href: "/dashboard/settings" },
    { label: "Profile", href: "/dashboard/settings/profile" },
    { label: "Security", href: "/dashboard/settings/auth" },
    { label: "Payment", href: "/dashboard/settings/payment" },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

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
          <span className="text-primary">Wall</span>-V
        </Link>
        <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {sidebarItems.map((item) => (
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
                onClick={() => { signOut({ callbackUrl: "/" }); setUserMenuOpen(false); }}
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
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/lib/cart-context";
import { useSiteSettings } from "@/lib/use-site-settings";

const services = [
  { title: "AI Automation", description: "Intelligent agents & workflows", href: "/services" },
  { title: "Web Hosting", description: "Shared, VPS & dedicated servers", href: "/hosting" },
  { title: "Domain Names", description: "Register & manage domains", href: "/domains" },
  { title: "Web Development", description: "Custom web applications", href: "/services" },
  { title: "ERP & CRM", description: "Business management solutions", href: "/services" },
  { title: "Maintenance", description: "Ongoing support & updates", href: "/contact" },
];

const navItems = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Hosting", href: "/hosting" },
  { label: "Domains", href: "/domains" },
  { label: "Voice Agent", href: "/voice-agent" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { siteName, logo } = useSiteSettings();

  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={siteName} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-bold">
              <span className="text-primary">Wall</span>-V
            </span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            item.label === "Services" ? (
              <div key={item.label} className="relative">
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent",
                    pathname === item.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {servicesOpen && (
                  <div
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                    className="absolute top-full left-0 w-[480px] grid grid-cols-2 gap-3 p-4 bg-white border rounded-xl shadow-lg"
                  >
                    {services.map((service) => (
                      <Link
                        key={service.title}
                        href={service.href}
                        className="rounded-lg p-3 hover:bg-accent transition-colors"
                        onClick={() => setServicesOpen(false)}
                      >
                        <p className="font-medium text-sm">{service.title}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent",
                  pathname === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/cart" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              {user.image ? (
                <img src={user.image} alt={user.name || ""} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {user.name?.charAt(0) || "U"}
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden border-t bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <hr className="my-2" />
          <Link href="/cart" className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent" onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</span>
            {itemCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{itemCount}</span>}
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent text-destructive">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link href="/signup" className="block px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground text-center" onClick={() => setOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

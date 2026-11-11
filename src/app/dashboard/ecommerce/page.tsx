"use client";

import Link from "next/link";
import { Package, ShoppingCart, Users, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Products",
    description: "Manage your product catalog, pricing, and inventory.",
    icon: Package,
    href: "/dashboard/ecommerce/products",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Orders",
    description: "View and manage customer orders, fulfillment, and status.",
    icon: ShoppingCart,
    href: "/dashboard/orders",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Customers",
    description: "View customer information and order history.",
    icon: Users,
    href: "/dashboard/customers",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Payments",
    description: "Track payments, refunds, and financial reconciliation.",
    icon: DollarSign,
    href: "/dashboard/payments",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function EcommercePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">E-Commerce</h1>
        <p className="text-muted-foreground">Manage your online store, products, and orders.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center justify-center rounded-lg p-2 ${section.bg}`}>
                      <section.icon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

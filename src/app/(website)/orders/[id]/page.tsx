"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle } from "lucide-react";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  billingAddress: { name?: string; email?: string; street?: string; city?: string; state?: string; country?: string; zip?: string };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  completed: CheckCircle,
  cancelled: XCircle,
  refunded: XCircle,
};

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrder(d.data); else setError(d.error || "Order not found"); })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error || "Order not found"}</p>
          <Link href="/products" className="text-primary hover:underline">Back to Products</Link>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status] || Package;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] || ""}`}>
            <StatusIcon className="h-3 w-3" />
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-4">Items</h2>
            <div className="divide-y">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>${order.tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
            </div>
          </section>

          {order.billingAddress?.name && (
            <section className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-2">Billing Address</h2>
              <p className="text-sm">{order.billingAddress.name}</p>
              <p className="text-sm text-muted-foreground">{order.billingAddress.street}</p>
              <p className="text-sm text-muted-foreground">{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
              <p className="text-sm text-muted-foreground">{order.billingAddress.country}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

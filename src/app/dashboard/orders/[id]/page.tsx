"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle } from "lucide-react";

interface Order {
  _id: string;
  orderNumber: string;
  items: { name: string; slug: string; price: number; quantity: number; image?: string; variant?: string }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  guestEmail?: string;
  billingAddress: { name?: string; email?: string; phone?: string; street?: string; city?: string; state?: string; country?: string; zip?: string };
  notes?: string;
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

export default function DashboardOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrder(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const updateOrder = async (updates: Partial<Order>) => {
    if (!order) return;
    setUpdating(true);
    await fetch(`/api/orders/${order._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const res = await fetch(`/api/orders/${order._id}`);
    const data = await res.json();
    if (data.success) setOrder(data.data);
    setUpdating(false);
  };

  if (loading) {
    return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/4" /><div className="h-64 bg-muted rounded" /></div></div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <Link href="/dashboard/orders" className="text-primary hover:underline">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={order.status}
            onChange={(e) => updateOrder({ status: e.target.value as Order["status"] })}
            disabled={updating}
            className={`rounded-full px-3 py-1 text-xs font-medium border-0 ${statusColors[order.status] || ""}`}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
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
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-3">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{order.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </section>

          {order.billingAddress?.name && (
            <section className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-3">Billing Address</h2>
              <div className="text-sm space-y-1">
                <p className="font-medium">{order.billingAddress.name}</p>
                <p className="text-muted-foreground">{order.billingAddress.email}</p>
                <p className="text-muted-foreground">{order.billingAddress.phone}</p>
                <p className="text-muted-foreground">{order.billingAddress.street}</p>
                <p className="text-muted-foreground">{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
                <p className="text-muted-foreground">{order.billingAddress.country}</p>
              </div>
            </section>
          )}

          {order.notes && (
            <section className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

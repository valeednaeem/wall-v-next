"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, Search, ArrowRight, Home, Mail } from "lucide-react";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
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

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");

  const [orderNumber, setOrderNumber] = useState(orderParam || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookedUp, setLookedUp] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrder(data.data);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Failed to look up order. Please try again.");
    } finally {
      setLoading(false);
      setLookedUp(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. A confirmation email has been sent.
          </p>
        </div>

        {/* Order Lookup or Order Details */}
        {!order ? (
          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {orderParam ? "Order Details" : "Look Up Your Order"}
            </h2>

            {orderParam && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <p>Your order number: <strong>{orderParam}</strong></p>
                <p className="text-xs mt-1">Enter the email used during checkout to view details.</p>
              </div>
            )}

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Order Number *</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="WV-20260806-ABC123"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="john@example.com"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Looking up..." : "Find Order"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Order Card */}
            <div className="rounded-xl border bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">Order #{order.orderNumber}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] || ""}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

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
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Billing Address */}
            {order.billingAddress?.name && (
              <div className="rounded-xl border bg-white shadow-sm p-6">
                <h3 className="font-semibold mb-3">Billing Address</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{order.billingAddress.name}</p>
                  <p>{order.billingAddress.street}</p>
                  <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
                  <p>{order.billingAddress.country}</p>
                  {order.billingAddress.email && <p>{order.billingAddress.email}</p>}
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="rounded-xl border bg-blue-50 border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                  You&apos;ll receive an email confirmation shortly.
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 mt-0.5 shrink-0" />
                  Digital products are delivered instantly. Physical products ship within 2-3 business days.
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white transition-colors"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link
                href="/products"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Continue Shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Look up another */}
            {!lookedUp && (
              <button
                onClick={() => { setOrder(null); setOrderNumber(""); setEmail(""); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary mt-2"
              >
                Look up a different order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { Lock, CreditCard, ExternalLink } from "lucide-react";

interface BillingInfo {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export default function CheckoutPage() {
  const { items, subtotal, tax, total, clearCart, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState<BillingInfo>({
    name: "", email: "", phone: "",
    street: "", city: "", state: "", country: "", zip: "",
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Link href="/products" className="text-primary hover:underline">Browse Products</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "product",
          items: items.map((i) => ({ slug: i.slug, quantity: i.quantity, variant: i.variant })),
          guestEmail: billing.email,
          billingAddress: billing,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create checkout session");
        return;
      }

      clearCart();

      // Redirect to 2Checkout hosted checkout
      window.location.href = data.data.checkoutUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Billing Information</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You&apos;ll complete payment on 2Checkout&apos;s secure checkout page.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <input required type="text" value={billing.name} onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <input required type="email" value={billing.email} onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <input type="tel" value={billing.phone} onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country *</label>
                    <input required type="text" value={billing.country} onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="United States" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Street Address *</label>
                    <input required type="text" value={billing.street} onChange={(e) => setBilling({ ...billing, street: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="123 Main St" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City *</label>
                    <input required type="text" value={billing.city} onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State *</label>
                    <input required type="text" value={billing.state} onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP Code *</label>
                    <input required type="text" value={billing.zip} onChange={(e) => setBilling({ ...billing, zip: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </section>
            </div>

            {/* Order Summary */}
            <div>
              <div className="sticky top-24 rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variant || ""}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[180px]">{item.name} x{item.quantity}</span>
                      <span>${((item.salePrice || item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm"><span>Subtotal ({itemCount} items)</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {loading ? "Redirecting to 2Checkout..." : `Pay $${total.toFixed(2)}`}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  Secured by 2Checkout
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

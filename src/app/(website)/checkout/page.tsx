"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Lock, CheckCircle } from "lucide-react";

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
  const router = useRouter();
  const { items, subtotal, tax, total, clearCart, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal" | "manual">("stripe");
  const [billing, setBilling] = useState<BillingInfo>({
    name: "", email: "", phone: "",
    street: "", city: "", state: "", country: "", zip: "",
  });
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [success, setSuccess] = useState<{ orderId: string; orderNumber: string } | null>(null);

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Link href="/products" className="text-primary hover:underline">Browse Products</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-2">Order #{success.orderNumber}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {paymentMethod === "manual"
              ? "Your order has been placed. Our team will contact you to arrange payment."
              : "A confirmation email has been sent."}
          </p>
          <Link href={`/orders/${success.orderNumber}`} className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            View Order
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, quantity: i.quantity, variant: i.variant })),
          guestEmail: billing.email,
          billingAddress: billing,
          shippingAddress: sameAsShipping ? billing : billing,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to place order");
        return;
      }

      setSuccess({ orderId: data.data.orderId, orderNumber: data.data.orderNumber });
      clearCart();
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
              {/* Billing */}
              <section className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Billing Information</h2>
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
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} className="rounded" />
                  Billing address is same as shipping
                </label>
              </section>

              {/* Payment */}
              <section className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                <div className="space-y-3">
                  {[
                    { id: "stripe" as const, label: "Credit / Debit Card", icon: CreditCard },
                    { id: "paypal" as const, label: "PayPal", icon: CreditCard },
                    { id: "manual" as const, label: "Manual Payment (Invoice)", icon: CreditCard },
                  ].map(({ id, label, icon: Icon }) => (
                    <label key={id} className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer ${paymentMethod === id ? "border-primary bg-primary/5" : ""}`}>
                      <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="accent-primary" />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>

                {paymentMethod === "stripe" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium">Card Number</label>
                      <input type="text" placeholder="4242 4242 4242 4242" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">CVC</label>
                        <input type="text" placeholder="123" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Order Summary */}
            <div>
              <div className="sticky top-24 rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variant || ""}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
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
                  {loading ? "Placing Order..." : `Pay $${total.toFixed(2)}`}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout. Your data is encrypted.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { Lock, ExternalLink, Package, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [billing, setBilling] = useState<BillingInfo>({
    name: "", email: "", phone: "",
    street: "", city: "", state: "", country: "", zip: "",
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
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
      window.location.href = data.data.checkoutUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateBilling = (field: keyof BillingInfo, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
        </Button>

        <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll complete payment on 2Checkout&apos;s secure checkout page.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        value={billing.name}
                        onChange={(e) => updateBilling("name", e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={billing.email}
                        onChange={(e) => updateBilling("email", e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={billing.phone}
                        onChange={(e) => updateBilling("phone", e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        required
                        value={billing.country}
                        onChange={(e) => updateBilling("country", e.target.value)}
                        placeholder="United States"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        required
                        value={billing.street}
                        onChange={(e) => updateBilling("street", e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        required
                        value={billing.city}
                        onChange={(e) => updateBilling("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        required
                        value={billing.state}
                        onChange={(e) => updateBilling("state", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        required
                        value={billing.zip}
                        onChange={(e) => updateBilling("zip", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-48 overflow-auto">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.variant || ""}`} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[180px]">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium shrink-0">
                          ${((item.salePrice || item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                    />
                    <Label htmlFor="agree-terms" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="underline hover:text-primary">
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" className="underline hover:text-primary">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading || !agreedToTerms}>
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    {loading ? "Redirecting to 2Checkout..." : `Pay $${total.toFixed(2)}`}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Secured by 2Checkout
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

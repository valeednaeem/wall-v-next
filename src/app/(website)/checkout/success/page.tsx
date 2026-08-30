"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, Search, ArrowRight, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");

  const [orderNumber, setOrderNumber] = useState(orderParam || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. A confirmation email has been sent.
          </p>
        </div>

        {!order ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {orderParam ? "Order Details" : "Look Up Your Order"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderParam && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
                  <p>Your order number: <strong>{orderParam}</strong></p>
                  <p className="text-xs mt-1">Enter the email used during checkout to view details.</p>
                </div>
              )}

              <form onSubmit={handleLookup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input
                    id="orderNumber"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="WV-20260806-ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Looking up..." : "Find Order"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">Order #{order.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant={statusVariant[order.status] || "default"}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
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

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.billingAddress?.name && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Billing Address</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">{order.billingAddress.name}</p>
                    <p>{order.billingAddress.street}</p>
                    <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
                    <p>{order.billingAddress.country}</p>
                    {order.billingAddress.email && <p>{order.billingAddress.email}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                    You&apos;ll receive an email confirmation shortly.
                  </li>
                  <li className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 shrink-0" />
                    Digital products are delivered instantly. Physical products ship within 2-3 business days.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/products">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

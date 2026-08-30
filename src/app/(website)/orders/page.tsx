"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
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

export default function OrdersPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrders([]);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders([data.data]);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Failed to look up order. Please try again.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Orders</h1>
        <p className="text-muted-foreground mb-8">Look up your order using your order number and email.</p>

        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="WV-20260806-ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
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

        {error && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[order.status] || "default"}>
                        {order.status}
                      </Badge>
                      <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} &middot; ${order.total.toFixed(2)}
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/orders/${order._id}`}>
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searched && orders.length === 0 && !error && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders found with that information.</p>
          </div>
        )}
      </div>
    </div>
  );
}

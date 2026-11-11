"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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
  discount: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  billingAddress: {
    name?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const statusIcon: Record<string, typeof Package> = {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-6 px-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">{error || "Order not found"}</p>
          <Button asChild variant="outline">
            <Link href="/products">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcon[order.status] || Package;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <Badge variant={statusVariant[order.status] || "default"} className="gap-1.5">
            <StatusIcon className="h-3 w-3" />
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
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
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Status */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="capitalize">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "failed" ? "destructive" : "warning"}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order</span>
                    <Badge variant={statusVariant[order.status] || "default"}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>{new Date(order.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Billing Address */}
          {order.billingAddress?.name && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Billing Address
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{order.billingAddress.name}</p>
                  <p>{order.billingAddress.street}</p>
                  <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
                  <p>{order.billingAddress.country}</p>
                  {order.billingAddress.email && <p>{order.billingAddress.email}</p>}
                  {order.billingAddress.phone && <p>{order.billingAddress.phone}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

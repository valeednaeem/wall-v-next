"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, CreditCard, MapPin, Clock, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  discount: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  guestEmail?: string;
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

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "completed", "cancelled", "refunded"];
const PAYMENT_STATUS_OPTIONS = ["unpaid", "paid", "failed", "refunded"];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          setNotes(d.data.notes || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const updateOrder = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      }
    } catch (err) {
      console.error("Failed to update order:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Order not found</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant[order.status] || "default"} className="text-sm">
          {order.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={order.status}
                  onValueChange={(v) => updateOrder({ status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={order.paymentStatus}
                  onValueChange={(v) => updateOrder({ paymentStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
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
                  <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this order..."
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => updateOrder({ notes })}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Notes"}
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timestamps
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(order.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

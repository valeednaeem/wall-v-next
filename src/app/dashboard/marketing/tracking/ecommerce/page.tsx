"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShoppingBag, Package, ArrowRight, CreditCard, Loader2, RefreshCw, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface EcommerceEvent {
  _id: string;
  name: string;
  eventName: string;
  category: string;
  status: "active" | "inactive" | "error";
  lastFired?: string;
  totalFires: number;
  description: string;
  parameters: string[];
}

const DEFAULT_EVENTS: Omit<EcommerceEvent, "_id" | "totalFires">[] = [
  { name: "Purchase", eventName: "purchase", category: "transaction", status: "active", description: "Fires when a purchase is completed", parameters: ["transaction_id", "value", "currency", "items"] },
  { name: "Add to Cart", eventName: "add_to_cart", category: "cart", status: "active", description: "Fires when an item is added to cart", parameters: ["item_id", "item_name", "price", "quantity"] },
  { name: "Remove from Cart", eventName: "remove_from_cart", category: "cart", status: "active", description: "Fires when an item is removed from cart", parameters: ["item_id", "item_name", "price", "quantity"] },
  { name: "Begin Checkout", eventName: "begin_checkout", category: "checkout", status: "active", description: "Fires when checkout process starts", parameters: ["value", "currency", "items"] },
  { name: "Add Payment Info", eventName: "add_payment_info", category: "checkout", status: "active", description: "Fires when payment info is submitted", parameters: ["payment_type", "value", "currency"] },
  { name: "View Item", eventName: "view_item", category: "product", status: "active", description: "Fires when a product detail page is viewed", parameters: ["item_id", "item_name", "price", "category"] },
  { name: "View Cart", eventName: "view_cart", category: "cart", status: "active", description: "Fires when the cart page is viewed", parameters: ["value", "currency", "items"] },
  { name: "Refund", eventName: "refund", category: "transaction", status: "inactive", description: "Fires when a refund is processed", parameters: ["transaction_id", "value", "currency"] },
];

export default function EcommerceTrackingPage() {
  const { status } = useSession();
  const [events, setEvents] = useState<EcommerceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/tracking/ecommerce";
      return;
    }
    fetchEvents();
  }, [status]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/tracking/events?category=ecommerce");
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setEvents(data.data);
      } else {
        setEvents(DEFAULT_EVENTS.map((e, i) => ({ ...e, _id: `default-${i}`, totalFires: 0 })));
      }
    } catch {
      setEvents(DEFAULT_EVENTS.map((e, i) => ({ ...e, _id: `default-${i}`, totalFires: 0 })));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const activeCount = events.filter((e) => e.status === "active").length;
  const totalFires = events.reduce((sum, e) => sum + e.totalFires, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-commerce Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor purchase, cart, and checkout event tracking</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent text-sm disabled:opacity-50">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Active Events</p><p className="text-2xl font-bold">{activeCount}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ShoppingBag className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{events.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><ArrowRight className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Fires</p><p className="text-2xl font-bold">{totalFires.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><CreditCard className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Purchase Events</p><p className="text-2xl font-bold">{events.filter((e) => e.eventName === "purchase" || e.eventName === "refund").length}</p></div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">E-commerce Events</h2>
          <p className="text-sm text-muted-foreground">Events tracked for GA4 Enhanced E-commerce</p>
        </div>
        <div className="divide-y">
          {events.map((event) => (
            <div key={event._id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                event.category === "transaction" ? "bg-green-100" :
                event.category === "cart" ? "bg-blue-100" :
                event.category === "checkout" ? "bg-amber-100" : "bg-purple-100"
              )}>
                {event.category === "transaction" ? <CreditCard className="h-5 w-5 text-green-600" /> :
                 event.category === "cart" ? <ShoppingBag className="h-5 w-5 text-blue-600" /> :
                 event.category === "checkout" ? <ArrowRight className="h-5 w-5 text-amber-600" /> :
                 <Package className="h-5 w-5 text-purple-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{event.name}</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded",
                    event.status === "active" ? "bg-green-100 text-green-700" :
                    event.status === "error" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  )}>{event.status}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{event.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Event: <code className="bg-muted px-1 rounded">{event.eventName}</code></span>
                  <span>{event.totalFires.toLocaleString()} fires</span>
                  {event.lastFired && <span>Last: {new Date(event.lastFired).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {event.parameters.slice(0, 3).map((p, i) => (
                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{p}</span>
                ))}
                {event.parameters.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{event.parameters.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Info */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Settings className="h-5 w-5" /> Setup Instructions</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>E-commerce tracking uses GA4 Enhanced E-commerce. Events are automatically fired when users interact with your store.</p>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
            {`<!-- Add to your <head> -->\n<script>gtag('event', 'add_to_cart', { items: [{ item_id: '...', item_name: '...', price: 0, quantity: 1 }] });</script>`}
          </div>
          <p>Ensure your GA4 Measurement ID is configured in <a href="/dashboard/marketing/tracking" className="text-primary hover:underline">Tracking Settings</a>.</p>
        </div>
      </div>
    </div>
  );
}

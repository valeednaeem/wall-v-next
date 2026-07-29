"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Lock, Loader2, CheckCircle, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestoneData {
  index: number;
  name: string;
  description: string;
  status: string;
  amount: number;
  dueDate?: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  requirements: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
  };
  quote: {
    min: number;
    max: number;
    currency: string;
  };
  client: {
    name: string;
    email: string;
  };
  demoId: string;
  milestones: MilestoneData[];
  budget: number;
  currency: string;
}

type PaymentMethod = "stripe" | "paypal" | "2checkout";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("stripe");
  const [processing, setProcessing] = useState(false);
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    address: "",
    city: "",
    country: "",
    zip: "",
  });

  useEffect(() => {
    fetch(`/api/projects/checkout/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProject(d.data);
        else setError(d.error || "Project not found");
      })
      .catch(() => setError("Failed to load checkout"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePayment = async () => {
    if (!project) return;
    setProcessing(true);

    const paymentAmount = selectedMilestoneIdx !== null && project.milestones[selectedMilestoneIdx]
      ? project.milestones[selectedMilestoneIdx].amount
      : project.quote?.min || 1000;

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          projectId: project.id,
          milestoneIndex: selectedMilestoneIdx,
          currency: project.quote?.currency || "USD",
          guestEmail: formData.email || project.client?.email,
          billingAddress: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            street: formData.address,
            city: formData.city,
            country: formData.country,
            zip: formData.zip,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = data.data.checkoutUrl;
      } else {
        setError(data.error || "Payment failed");
      }
    } catch {
      setError("Payment processing error. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Checkout Unavailable</p>
          <p className="text-muted-foreground mb-4">{error || "Project not found."}</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const amount = selectedMilestoneIdx !== null && project.milestones[selectedMilestoneIdx]
    ? project.milestones[selectedMilestoneIdx].amount
    : project.quote?.min || 1000;

  const unpaidMilestones = project.milestones.filter((m) => m.status !== "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold">Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment Method */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "stripe" as PaymentMethod, label: "Credit Card", icon: CreditCard, desc: "Visa, Mastercard, AMEX" },
                  { id: "paypal" as PaymentMethod, label: "PayPal", icon: Globe, desc: "Pay with PayPal" },
                  { id: "2checkout" as PaymentMethod, label: "2Checkout", icon: Shield, desc: "Global payments" },
                ]).map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "border-2 rounded-xl p-4 text-left transition-all",
                      selectedMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <method.icon className={cn("h-5 w-5 mb-2", selectedMethod === method.id ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-sm font-semibold">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Details (Stripe) */}
            {selectedMethod === "stripe" && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-4">Card Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name on Card</label>
                    <input
                      type="text"
                      value={formData.cardName}
                      onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Card Number</label>
                    <input
                      type="text"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Expiry</label>
                      <input
                        type="text"
                        value={formData.expiry}
                        onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CVC</label>
                      <input
                        type="text"
                        value={formData.cvc}
                        onChange={(e) => setFormData({ ...formData, cvc: e.target.value })}
                        className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PayPal */}
            {selectedMethod === "paypal" && (
              <div className="bg-white rounded-xl border p-6">
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to PayPal to complete your payment securely.
                  </p>
                </div>
              </div>
            )}

            {/* 2Checkout */}
            {selectedMethod === "2checkout" && (
              <div className="bg-white rounded-xl border p-6">
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to 2Checkout for secure global payment processing.
                  </p>
                </div>
              </div>
            )}

            {/* Billing Address */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Billing Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                      placeholder="US"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="border-b pb-4 mb-4">
                <p className="font-medium text-sm">{project.name}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {project.requirements?.projectType?.replace(/-/g, " ") || "Custom Project"}
                </p>
              </div>

              {/* Milestone Selection */}
              {unpaidMilestones.length > 0 && (
                <div className="border-b pb-4 mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">SELECT MILESTONE TO PAY</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedMilestoneIdx(null)}
                      className={`w-full text-left p-2 rounded-lg border text-sm transition-colors ${
                        selectedMilestoneIdx === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">Full Project</span>
                        <span className="font-medium">${(project.quote?.min || 0).toLocaleString()}</span>
                      </div>
                    </button>
                    {unpaidMilestones.map((m) => (
                      <button
                        key={m.index}
                        onClick={() => setSelectedMilestoneIdx(m.index)}
                        className={`w-full text-left p-2 rounded-lg border text-sm transition-colors ${
                          selectedMilestoneIdx === m.index ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{m.name}</p>
                            {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                          </div>
                          <span className="font-medium">${m.amount.toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm border-b pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Type</span>
                  <span className="font-medium capitalize">{project.requirements?.projectType?.replace(/-/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Features</span>
                  <span className="font-medium">{project.requirements?.features?.length || 0} included</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="font-medium">{project.requirements?.timeline || "Flexible"}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (0%)</span>
                  <span className="font-medium">$0</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">${amount.toLocaleString()} USD</span>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay ${amount.toLocaleString()} USD
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL Encrypted</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</span>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By completing this payment, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

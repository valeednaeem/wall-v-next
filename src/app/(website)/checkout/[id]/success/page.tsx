"use client";

import { Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Home, CreditCard } from "lucide-react";

function CheckoutSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const method = searchParams.get("method") || "card";
  const amount = searchParams.get("amount") || "0";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center">
        <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for your payment of <span className="font-semibold text-foreground">${parseInt(amount).toLocaleString()} USD</span> via {method}.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium capitalize">{method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">${parseInt(amount).toLocaleString()} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-green-600">Completed</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-medium">pay-{Date.now().toString(36).slice(-8)}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          A confirmation email has been sent. Our team will begin working on your project and reach out within 24 hours.
        </p>

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href={`/preview/${params.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            View Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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

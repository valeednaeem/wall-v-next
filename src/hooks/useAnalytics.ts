"use client";

import { useCallback } from "react";
import {
  trackEvent,
  trackEcommerceEvent,
  trackConversion,
  trackGenerateLead,
  trackContactFormSubmit,
  trackDemoRequested,
  trackSignUp,
  trackLogin,
  trackBeginCheckout,
  trackAddToCart,
  trackPurchase,
  trackProjectCreated,
  trackAIConversationStarted,
  trackVoiceCallStarted,
  trackFileDownload,
  trackVideoPlay,
  trackScrollDepth,
  trackCTAClick,
} from "@/lib/analytics-events";

/**
 * React hook for sending analytics events
 * Provides type-safe, easy-to-use functions for tracking events
 */
export function useAnalytics() {
  const sendEvent = useCallback((eventName: string, parameters?: Record<string, unknown>) => {
    trackEvent(eventName, parameters);
  }, []);

  const sendEcommerceEvent = useCallback((
    eventName: "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout" | "purchase" | "view_item_list" | "select_item",
    items: Array<{
      item_id: string;
      item_name: string;
      price: number;
      quantity: number;
      currency?: string;
      item_category?: string;
      item_variant?: string;
      item_brand?: string;
    }>,
    additionalParams?: Record<string, unknown>
  ) => {
    trackEcommerceEvent(eventName, items, additionalParams);
  }, []);

  const sendConversion = useCallback((eventName: string, value?: number, currency = "USD") => {
    trackConversion(eventName, value, currency);
  }, []);

  return {
    // Generic event
    sendEvent,
    // E-commerce
    sendEcommerceEvent,
    // Conversion
    sendConversion,
    // Predefined event helpers
    trackGenerateLead,
    trackContactFormSubmit,
    trackDemoRequested,
    trackSignUp,
    trackLogin,
    trackBeginCheckout,
    trackAddToCart,
    trackPurchase,
    trackProjectCreated,
    trackAIConversationStarted,
    trackVoiceCallStarted,
    trackFileDownload,
    trackVideoPlay,
    trackScrollDepth,
    trackCTAClick,
  };
}
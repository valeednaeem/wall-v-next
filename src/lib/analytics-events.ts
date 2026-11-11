import { sendGAEvent, sendGAEcommerceEvent, sendGAConversion } from "@/components/analytics/GoogleAnalytics";
import { getCookieConsent } from "@/lib/cookie-consent";

/**
 * Analytics event utilities that connect Wall-V's tracking system to GA4
 * These functions respect cookie consent and only send events when analytics consent is granted
 */

// Check if analytics consent is granted
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return getCookieConsent().analytics === true || getCookieConsent().marketing === true;
}

// Map Wall-V event names to GA4 event names
const EVENT_NAME_MAP: Record<string, string> = {
  generate_lead: "generate_lead",
  contact_form_submit: "contact_form_submit",
  demo_requested: "demo_requested",
  sign_up: "sign_up",
  login: "login",
  begin_checkout: "begin_checkout",
  add_to_cart: "add_to_cart",
  purchase: "purchase",
  project_created: "project_created",
  ai_conversation_started: "ai_conversation_started",
  voice_call_started: "voice_call_started",
  file_download: "file_download",
  video_play: "video_play",
  scroll_depth: "scroll",
  cta_click: "cta_click",
};

/**
 * Send a system event to GA4
 * This is called from various parts of the application when tracked actions occur
 */
export function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (!hasAnalyticsConsent()) return;

  const gaEventName = EVENT_NAME_MAP[eventName] || eventName;
  sendGAEvent(gaEventName, parameters);
}

/**
 * Track e-commerce events
 */
export function trackEcommerceEvent(
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
): void {
  if (!hasAnalyticsConsent()) return;
  sendGAEcommerceEvent(eventName, items, additionalParams);
}

/**
 * Track conversion events (marked as conversions in GA4)
 */
export function trackConversion(
  eventName: string,
  value?: number,
  currency = "USD"
): void {
  if (!hasAnalyticsConsent()) return;
  sendGAConversion(eventName, value, currency);
}

/**
 * Specific event helpers for common actions
 */

// Lead generation
export function trackGenerateLead(formType: string, sourcePage?: string, leadValue?: number) {
  trackEvent("generate_lead", {
    form_type: formType,
    source_page: sourcePage,
    lead_value: leadValue,
  });
}

export function trackContactFormSubmit(formId: string, formType: string) {
  trackEvent("contact_form_submit", {
    form_id: formId,
    form_type: formType,
  });
}

export function trackDemoRequested(productId?: string, sourcePage?: string) {
  trackEvent("demo_requested", {
    product_id: productId,
    source_page: sourcePage,
  });
}

// Authentication
export function trackSignUp(method?: string, plan?: string) {
  trackEvent("sign_up", {
    method,
    plan,
  });
  trackConversion("sign_up");
}

export function trackLogin(method?: string) {
  trackEvent("login", { method });
}

// E-commerce
export function trackBeginCheckout(currency: string, value: number, items: Array<{
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
}>) {
  trackEcommerceEvent("begin_checkout", items.map(i => ({
    ...i,
    currency,
  })), { currency, value });
}

export function trackAddToCart(itemId: string, itemName: string, price: number, quantity: number, itemCategory?: string) {
  trackEcommerceEvent("add_to_cart", [{
    item_id: itemId,
    item_name: itemName,
    price,
    quantity,
    item_category: itemCategory,
  }]);
}

export function trackPurchase(transactionId: string, currency: string, value: number, items: Array<{
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
}>) {
  trackEcommerceEvent("purchase", items.map(i => ({
    ...i,
    currency,
  })), { transaction_id: transactionId, currency, value });
  trackConversion("purchase", value, currency);
}

// Project/CRM
export function trackProjectCreated(projectType: string, estimatedValue?: number) {
  trackEvent("project_created", {
    project_type: projectType,
    estimated_value: estimatedValue,
  });
  trackConversion("project_created", estimatedValue);
}

// AI/Voice
export function trackAIConversationStarted(agentType?: string) {
  trackEvent("ai_conversation_started", { agent_type: agentType });
}

export function trackVoiceCallStarted(agentType?: string) {
  trackEvent("voice_call_started", { agent_type: agentType });
}

// Content
export function trackFileDownload(fileName: string, fileType?: string, resourceType?: string) {
  trackEvent("file_download", {
    file_name: fileName,
    file_type: fileType,
    resource_type: resourceType,
  });
}

export function trackVideoPlay(videoId: string, videoTitle?: string, videoDuration?: number) {
  trackEvent("video_play", {
    video_id: videoId,
    video_title: videoTitle,
    video_duration: videoDuration,
  });
}

export function trackScrollDepth(depthPercentage: number, pagePath: string) {
  trackEvent("scroll_depth", {
    depth_percentage: depthPercentage,
    page_path: pagePath,
  });
}

export function trackCTAClick(ctaText: string, ctaLocation?: string, destinationUrl?: string) {
  trackEvent("cta_click", {
    cta_text: ctaText,
    cta_location: ctaLocation,
    destination_url: destinationUrl,
  });
}
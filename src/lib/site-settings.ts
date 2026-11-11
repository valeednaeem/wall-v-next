import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";

const settingsCache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSiteSetting<T = unknown>(key: string, options?: { noCache?: boolean }): Promise<T | null> {
  const now = Date.now();

  if (!options?.noCache) {
    const cached = settingsCache.get(key);
    if (cached && cached.expiry > now) {
      return cached.data as T;
    }
  }

  await connectToDatabase();
  const setting = await SiteSettings.findOne({ key }).lean();
  if (!setting) return null;

  settingsCache.set(key, { data: setting.value as T, expiry: now + CACHE_TTL });
  return setting.value as T;
}

export async function getSiteSettingsByCategory<T = Record<string, unknown>>(category: string, options?: { noCache?: boolean }): Promise<T> {
  await connectToDatabase();
  const settings = await SiteSettings.find({ category }).lean();
  const result = {} as Record<string, unknown>;
  for (const setting of settings) {
    result[setting.key.split(".").pop() || setting.key] = setting.value;
  }
  return result as T;
}

export async function setSiteSetting(key: string, value: unknown, category?: string): Promise<void> {
  await connectToDatabase();
  const resolvedCategory = category || key.split(".")[0];
  await SiteSettings.findOneAndUpdate(
    { key },
    { key, value, category: resolvedCategory },
    { upsert: true, new: true }
  );
  settingsCache.delete(key);
}

export function clearSettingsCache(): void {
  settingsCache.clear();
}

export async function getPaymentGateways() {
  return getSiteSettingsByCategory<{
    stripe?: { enabled?: boolean; publicKey?: string };
    paypal?: { enabled?: boolean; clientId?: string };
    twoCheckout?: { enabled?: boolean; merchantCode?: string };
  }>("paymentGateways");
}

export async function getSEOSettings() {
  return getSiteSettingsByCategory<{
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  }>("seo");
}

export async function getSocialMediaSettings() {
  return getSiteSettingsByCategory<{
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    github?: string;
  }>("socialMedia");
}

export async function getContactSettings() {
  return getSiteSettingsByCategory<{
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    businessHours?: string;
    latitude?: number;
    longitude?: number;
    mapsUrl?: string;
  }>("contact");
}

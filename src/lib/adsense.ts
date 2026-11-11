import { connectToDatabase } from "@/lib/mongodb";
import AdSenseSettings, { type IAdSenseSettings } from "@/models/adsense-settings";
import { clearSettingsCache } from "@/lib/site-settings";

export interface AdSenseConfig {
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  autoAdsConfig: {
    googleAdsOptOut: boolean;
    noiseReduction: boolean;
    adFormats: Record<string, boolean>;
  };
  adUnits: AdSenseAdUnit[];
  status: string;
  lastVerifiedAt: Date | null;
  lastError: string | null;
}

export interface AdSenseAdUnit {
  id: string;
  name: string;
  format: string;
  slot: string;
  size: { width: number; height: number } | "fluid";
  enabled: boolean;
  placement: string;
}

const DEFAULT_CONFIG: AdSenseConfig = {
  enabled: false,
  publisherId: "",
  autoAdsEnabled: false,
  autoAdsConfig: {
    googleAdsOptOut: false,
    noiseReduction: false,
    adFormats: {
      inArticle: true,
      inFeed: true,
      matchedContent: false,
      multiplex: true,
    },
  },
  adUnits: [],
  status: "not_configured",
  lastVerifiedAt: null,
  lastError: null,
};

export function validatePublisherId(publisherId: string): { valid: boolean; error?: string } {
  if (!publisherId) return { valid: false, error: "Publisher ID is required." };
  if (!/^ca-pub-\d{16}$/.test(publisherId)) {
    return { valid: false, error: "Invalid Publisher ID format. Expected: ca-pub-XXXXXXXXXXXXXXXX (16 digits)." };
  }
  return { valid: true };
}

export async function getAdSenseSettings(): Promise<AdSenseConfig> {
  await connectToDatabase();
  const doc = await AdSenseSettings.findOne({ key: "adsense" }).lean();
  if (!doc) return { ...DEFAULT_CONFIG };
  return {
    enabled: doc.enabled,
    publisherId: doc.publisherId,
    autoAdsEnabled: doc.autoAdsEnabled,
    autoAdsConfig: {
      googleAdsOptOut: doc.autoAdsConfig.googleAdsOptOut,
      noiseReduction: doc.autoAdsConfig.noiseReduction,
      adFormats: {
        inArticle: doc.autoAdsConfig.adFormats.inArticle,
        inFeed: doc.autoAdsConfig.adFormats.inFeed,
        matchedContent: doc.autoAdsConfig.adFormats.matchedContent,
        multiplex: doc.autoAdsConfig.adFormats.multiplex,
      },
    },
    adUnits: doc.adUnits.map((u: IAdSenseSettings["adUnits"][number]) => ({
      id: u.id,
      name: u.name,
      format: u.format,
      slot: u.slot,
      size: u.size,
      enabled: u.enabled,
      placement: u.placement,
    })),
    status: doc.status,
    lastVerifiedAt: doc.lastVerifiedAt,
    lastError: doc.lastError,
  };
}

export async function saveAdSenseSettings(settings: Partial<AdSenseConfig>): Promise<AdSenseConfig> {
  if (settings.publisherId) {
    const validation = validatePublisherId(settings.publisherId);
    if (!validation.valid) throw new Error(validation.error);
  }

  await connectToDatabase();

  const existing = await AdSenseSettings.findOne({ key: "adsense" }).lean();
  const current: AdSenseConfig = existing
    ? {
        enabled: existing.enabled,
        publisherId: existing.publisherId,
        autoAdsEnabled: existing.autoAdsEnabled,
        autoAdsConfig: {
          googleAdsOptOut: existing.autoAdsConfig.googleAdsOptOut,
          noiseReduction: existing.autoAdsConfig.noiseReduction,
          adFormats: {
            inArticle: existing.autoAdsConfig.adFormats.inArticle,
            inFeed: existing.autoAdsConfig.adFormats.inFeed,
            matchedContent: existing.autoAdsConfig.adFormats.matchedContent,
            multiplex: existing.autoAdsConfig.adFormats.multiplex,
          },
        },
        adUnits: existing.adUnits.map((u: IAdSenseSettings["adUnits"][number]) => ({
          id: u.id,
          name: u.name,
          format: u.format,
          slot: u.slot,
          size: u.size,
          enabled: u.enabled,
          placement: u.placement,
        })),
        status: existing.status as AdSenseConfig["status"],
        lastVerifiedAt: existing.lastVerifiedAt,
        lastError: existing.lastError,
      }
    : { ...DEFAULT_CONFIG };

  const merged: AdSenseConfig = {
    ...current,
    ...settings,
    autoAdsConfig: {
      ...current.autoAdsConfig,
      ...(settings.autoAdsConfig || {}),
      adFormats: {
        ...current.autoAdsConfig.adFormats,
        ...(settings.autoAdsConfig?.adFormats || {}),
      },
    },
    adUnits: settings.adUnits || current.adUnits,
  };

  if (merged.enabled && merged.publisherId) {
    merged.status = "configured";
  } else if (!merged.enabled) {
    merged.status = "not_configured";
  }

  await AdSenseSettings.findOneAndUpdate(
    { key: "adsense" },
    {
      key: "adsense",
      enabled: merged.enabled,
      publisherId: merged.publisherId,
      autoAdsEnabled: merged.autoAdsEnabled,
      autoAdsConfig: merged.autoAdsConfig,
      adUnits: merged.adUnits,
      status: merged.status,
      lastVerifiedAt: merged.lastVerifiedAt,
      lastError: merged.lastError,
    },
    { upsert: true, new: true }
  );
  clearSettingsCache();

  return merged;
}

export async function getAdSenseStatus(): Promise<{
  configured: boolean;
  publisherIdPresent: boolean;
  scriptEnabled: boolean;
  autoAdsEnabled: boolean;
  adUnitsCount: number;
  activeAdUnits: number;
  status: string;
  lastVerified: Date | null;
  issues: string[];
}> {
  const config = await getAdSenseSettings();
  const issues: string[] = [];

  if (!config.publisherId) issues.push("Publisher ID not configured.");
  if (config.enabled && !config.publisherId) issues.push("AdSense enabled but no Publisher ID.");
  if (config.autoAdsEnabled && !config.publisherId) issues.push("Auto Ads enabled but no Publisher ID.");

  const activeAdUnits = config.adUnits.filter((u) => u.enabled);

  return {
    configured: config.enabled && !!config.publisherId,
    publisherIdPresent: !!config.publisherId,
    scriptEnabled: config.enabled,
    autoAdsEnabled: config.autoAdsEnabled,
    adUnitsCount: config.adUnits.length,
    activeAdUnits: activeAdUnits.length,
    status: config.status,
    lastVerified: config.lastVerifiedAt,
    issues,
  };
}

export async function verifyAdSenseIntegration(): Promise<{
  valid: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}> {
  const config = await getAdSenseSettings();
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  const pubValid = validatePublisherId(config.publisherId);
  checks.push({
    name: "Publisher ID",
    passed: pubValid.valid,
    message: pubValid.valid
      ? `Publisher ID configured: ${config.publisherId}`
      : pubValid.error || "Publisher ID is missing or invalid.",
  });

  checks.push({
    name: "AdSense Enabled",
    passed: config.enabled,
    message: config.enabled ? "AdSense integration is enabled." : "AdSense integration is disabled.",
  });

  checks.push({
    name: "Script Will Load",
    passed: config.enabled && !!config.publisherId,
    message:
      config.enabled && config.publisherId
        ? "AdSense script will load on public pages."
        : "AdSense script will not load (disabled or missing Publisher ID).",
  });

  const activeUnits = config.adUnits.filter((u) => u.enabled);
  checks.push({
    name: "Active Ad Units",
    passed: activeUnits.length > 0 || config.autoAdsEnabled,
    message:
      activeUnits.length > 0
        ? `${activeUnits.length} active ad unit(s) configured.`
        : config.autoAdsEnabled
          ? "Auto Ads enabled (manual ad units not required)."
          : "No active ad units configured and Auto Ads is disabled.",
  });

  const slots = config.adUnits.map((u) => u.slot).filter(Boolean);
  const uniqueSlots = new Set(slots);
  checks.push({
    name: "No Duplicate Slots",
    passed: slots.length === uniqueSlots.size,
    message:
      slots.length === uniqueSlots.size
        ? "All ad unit slots are unique."
        : `Duplicate ad slot IDs detected (${slots.length - uniqueSlots.size} duplicates).`,
  });

  const allPassed = checks.every((c) => c.passed);
  const now = new Date();

  await AdSenseSettings.findOneAndUpdate(
    { key: "adsense" },
    {
      $set: {
        status: !config.enabled ? "not_configured" : allPassed ? "configured" : "error",
        lastVerifiedAt: now,
        lastError: allPassed ? null : checks.filter((c) => !c.passed).map((c) => c.message).join("; "),
      },
    },
    { upsert: true }
  );
  clearSettingsCache();

  return { valid: allPassed, checks };
}

export function getPageTargeting(): {
  publicWebsite: boolean;
  blog: boolean;
  productPages: boolean;
  servicePages: boolean;
  contact: boolean;
  dashboard: boolean;
  clientPortal: boolean;
  checkout: boolean;
} {
  return {
    publicWebsite: true,
    blog: true,
    productPages: true,
    servicePages: true,
    contact: true,
    dashboard: false,
    clientPortal: false,
    checkout: false,
  };
}

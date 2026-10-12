export interface DograhWidgetUrlOptions {
  production?: boolean;
}

export interface DograhWidgetUrlResolution {
  url: string;
  source: "database" | "environment" | "missing";
  error?: string;
}

const LEGACY_WIDGET_HOSTS = new Set(["cdn.dograh.com"]);

export function validateDograhWidgetUrl(
  value: unknown,
  options: DograhWidgetUrlOptions = {}
): { valid: boolean; reason?: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, reason: "Dograh website widget URL is not configured." };
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { valid: false, reason: "Dograh website widget URL is not a valid URL." };
  }

  if (options.production && url.protocol !== "https:") {
    return { valid: false, reason: "Dograh website widget URL must use HTTPS in production." };
  }

  if (LEGACY_WIDGET_HOSTS.has(url.hostname.toLowerCase())) {
    return { valid: false, reason: "The legacy Dograh CDN widget URL is no longer supported." };
  }

  if (!url.pathname.toLowerCase().endsWith("/dograh-widget.js")) {
    return { valid: false, reason: "Use the generated dograh-widget.js URL from Dograh Agent Settings." };
  }

  return { valid: true };
}

export function resolveDograhWidgetUrl(
  databaseValue: unknown,
  environmentValue: unknown,
  options: DograhWidgetUrlOptions = {}
): DograhWidgetUrlResolution {
  const databaseValidation = validateDograhWidgetUrl(databaseValue, options);
  if (databaseValidation.valid) {
    return { url: String(databaseValue).trim(), source: "database" };
  }

  const environmentValidation = validateDograhWidgetUrl(environmentValue, options);
  if (environmentValidation.valid) {
    return { url: String(environmentValue).trim(), source: "environment" };
  }

  const error = typeof databaseValue === "string" && databaseValue.trim()
    ? databaseValidation.reason
    : environmentValidation.reason;

  return { url: "", source: "missing", error };
}

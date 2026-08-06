import crypto from "crypto";

const API_HOST =
  process.env.RESELLER_API_HOST || "https://api.duoservers.com";
const API_USER = process.env.RESELLER_API_USER || "wallv";
const API_PASS = process.env.RESELLER_API_PASS || "";

interface ResellersPanelResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface DomainCheckResult {
  domain: string;
  available: boolean;
  price: number;
  currency: string;
  tld: string;
}

interface DomainRegisterParams {
  domain: string;
  years: number;
  registrant: {
    firstName: string;
    lastName: string;
    email: string;
    organization?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  };
  nameservers?: string[];
}

interface DomainRenewParams {
  domain: string;
  years: number;
}

interface DomainTransferParams {
  domain: string;
  authCode: string;
  years?: number;
}

async function apiCall(
  action: string,
  params: Record<string, string> = {}
): Promise<ResellersPanelResponse> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = crypto
      .createHash("sha256")
      .update(`${API_USER}${API_PASS}${timestamp}`)
      .digest("hex");

    const searchParams = new URLSearchParams({
      sWSLUser: API_USER,
      sWSLSha256: hash,
      sWSLTimestamp: timestamp,
      sWSLAction: action,
      ...params,
    });

    const response = await fetch(`${API_HOST}/api/v1.php?${searchParams}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("ResellersPanel API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkDomainAvailability(
  domain: string
): Promise<DomainCheckResult> {
  const tld = domain.split(".").pop() || "";
  const result = await apiCall("domain_check", { domain });

  if (!result.success) {
    return {
      domain,
      available: false,
      price: 0,
      currency: "USD",
      tld,
    };
  }

  const data = result.data as Record<string, unknown>;
  return {
    domain,
    available: data.available === "yes",
    price: parseFloat(data.price as string) || 0,
    currency: (data.currency as string) || "USD",
    tld,
  };
}

export async function getDomainPricing(
  tld: string
): Promise<{ registration: number; renewal: number; transfer: number }> {
  const result = await apiCall("domain_pricing", { tld });

  if (!result.success) {
    return { registration: 0, renewal: 0, transfer: 0 };
  }

  const data = result.data as Record<string, unknown>;
  return {
    registration: parseFloat(data.registration as string) || 0,
    renewal: parseFloat(data.renewal as string) || 0,
    transfer: parseFloat(data.transfer as string) || 0,
  };
}

export async function registerDomain(
  params: DomainRegisterParams
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("domain_register", {
    domain: params.domain,
    years: params.years.toString(),
    registrant_firstName: params.registrant.firstName,
    registrant_lastName: params.registrant.lastName,
    registrant_email: params.registrant.email,
    registrant_organization: params.registrant.organization || "",
    registrant_address: params.registrant.address,
    registrant_city: params.registrant.city,
    registrant_state: params.registrant.state,
    registrant_zip: params.registrant.zip,
    registrant_country: params.registrant.country,
    registrant_phone: params.registrant.phone,
    nameservers: params.nameservers?.join(",") || "",
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.order_id as string,
  };
}

export async function renewDomain(
  params: DomainRenewParams
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("domain_renew", {
    domain: params.domain,
    years: params.years.toString(),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.order_id as string,
  };
}

export async function transferDomain(
  params: DomainTransferParams
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("domain_transfer", {
    domain: params.domain,
    authCode: params.authCode,
    years: (params.years || 1).toString(),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.order_id as string,
  };
}

export async function getDomainInfo(
  domain: string
): Promise<Record<string, unknown> | null> {
  const result = await apiCall("domain_info", { domain });

  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

export async function updateNameservers(
  domain: string,
  nameservers: string[]
): Promise<{ success: boolean; error?: string }> {
  const result = await apiCall("domain_update_nameservers", {
    domain: nameservers.join(","),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

export async function getAvailableTLDs(): Promise<
  Array<{ tld: string; registration: number; renewal: number }>
> {
  const result = await apiCall("domain_tlds");

  if (!result.success) {
    return [];
  }

  const data = result.data as Record<string, unknown>;
  const tlds = data.tlds as Array<Record<string, unknown>>;

  return tlds.map((tld) => ({
    tld: tld.tld as string,
    registration: parseFloat(tld.registration as string) || 0,
    renewal: parseFloat(tld.renewal as string) || 0,
  }));
}

export async function getHostingPlans(): Promise<
  Array<{ id: string; name: string; price: number; renewalPrice: number; description: string; features: string[] }>
> {
  const result = await apiCall("hosting_plans");

  if (!result.success) {
    return [];
  }

  const data = result.data as Record<string, unknown>;
  const plans = data.plans as Array<Record<string, unknown>>;

  return plans.map((plan) => ({
    id: plan.id as string,
    name: plan.name as string,
    price: parseFloat(plan.price as string) || 0,
    renewalPrice: parseFloat(plan.renewal_price as string) || parseFloat(plan.price as string) || 0,
    description: plan.description as string,
    features: (plan.features as string[]) || [],
  }));
}

const WEBSOULS_API_URL =
  process.env.WEBSOULS_API_URL || "https://billing.websouls.com";
const WEBSOULS_API_IDENTIFIER =
  process.env.WEBSOULS_API_IDENTIFIER || "";
const WEBSOULS_API_SECRET =
  process.env.WEBSOULS_API_SECRET || "";

interface WebSoulsResponse {
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

interface HostingPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  description: string;
}

async function apiCall(
  action: string,
  params: Record<string, string> = {}
): Promise<WebSoulsResponse> {
  try {
    const searchParams = new URLSearchParams({
      api_identifier: WEBSOULS_API_IDENTIFIER,
      api_secret: WEBSOULS_API_SECRET,
      action,
      ...params,
    });

    const response = await fetch(
      `${WEBSOULS_API_URL}/includes/api.php?${searchParams}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    if (data.result === "error") {
      return { success: false, error: data.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("WebSouls API error:", error);
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
  const result = await apiCall("domainavailable", { domain });

  if (!result.success) {
    return {
      domain,
      available: false,
      price: 0,
      currency: "PKR",
      tld,
    };
  }

  const data = result.data as Record<string, unknown>;
  return {
    domain,
    available: data.available === "yes",
    price: parseFloat(data.price as string) || 0,
    currency: (data.currency as string) || "PKR",
    tld,
  };
}

export async function getDomainPricing(
  tld: string
): Promise<{ registration: number; renewal: number; transfer: number }> {
  const result = await apiCall("domainpricing", { tld });

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
  const result = await apiCall("domainregister", {
    domain: params.domain,
    period: params.years.toString(),
    firstname: params.registrant.firstName,
    lastname: params.registrant.lastName,
    email: params.registrant.email,
    companyname: params.registrant.organization || "",
    address1: params.registrant.address,
    city: params.registrant.city,
    state: params.registrant.state,
    postcode: params.registrant.zip,
    country: params.registrant.country,
    phonenumber: params.registrant.phone,
    ns1: params.nameservers?.[0] || "",
    ns2: params.nameservers?.[1] || "",
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.orderid as string,
  };
}

export async function renewDomain(
  domain: string,
  years: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("domainrenew", {
    domain,
    period: years.toString(),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.orderid as string,
  };
}

export async function transferDomain(
  domain: string,
  authCode: string,
  years: number = 1
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("domaintransfer", {
    domain,
    eppcode: authCode,
    period: years.toString(),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.orderid as string,
  };
}

export async function getDomainInfo(
  domain: string
): Promise<Record<string, unknown> | null> {
  const result = await apiCall("domaininfo", { domain });

  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

export async function updateNameservers(
  domain: string,
  nameservers: string[]
): Promise<{ success: boolean; error?: string }> {
  const result = await apiCall("domainupdatenameservers", {
    domain,
    ns1: nameservers[0] || "",
    ns2: nameservers[1] || "",
    ns3: nameservers[2] || "",
    ns4: nameservers[3] || "",
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

export async function getHostingPlans(): Promise<HostingPlan[]> {
  const result = await apiCall("gethostingplans");

  if (!result.success) {
    return [];
  }

  const data = result.data as Record<string, unknown>;
  const plans = data.plans as Array<Record<string, unknown>>;

  return plans.map((plan) => ({
    id: plan.pid as string,
    name: plan.name as string,
    price: parseFloat(plan.price as string) || 0,
    billingCycle: plan.billingcycle as string,
    description: plan.description as string,
  }));
}

export async function getPKDomainPricing(): Promise<{
  pk: { registration: number; renewal: number };
  comPk: { registration: number; renewal: number };
  eduPk: { registration: number; renewal: number };
}> {
  const pk = await getDomainPricing("pk");
  const comPk = await getDomainPricing("com.pk");
  const eduPk = await getDomainPricing("edu.pk");

  return {
    pk: { registration: pk.registration, renewal: pk.renewal },
    comPk: { registration: comPk.registration, renewal: comPk.renewal },
    eduPk: { registration: eduPk.registration, renewal: eduPk.renewal },
  };
}

export async function createHostingOrder(
  planId: string,
  domain: string,
  billingCycle: string,
  customerEmail: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const result = await apiCall("createorder", {
    pid: planId,
    domain,
    billingcycle: billingCycle,
    email: customerEmail,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as Record<string, unknown>;
  return {
    success: true,
    orderId: data.orderid as string,
  };
}

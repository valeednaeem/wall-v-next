import {
  checkDomainAvailability as rpCheck,
  getDomainPricing as rpGetPricing,
  getAvailableTLDs as rpGetTLDs,
} from "./resellerspanel";
import {
  checkDomainAvailability as wsCheck,
  getDomainPricing as wsGetPricing,
  getPKDomainPricing as wsGetPKPricing,
} from "./websouls";

export type DomainProvider = "resellerspanel" | "websouls";

export interface DomainPricingResult {
  domain: string;
  tld: string;
  available: boolean;
  provider: DomainProvider;
  registrationPrice: number;
  renewalPrice: number;
  currency: string;
  isPKDomain: boolean;
}

export interface UnifiedDomainSearchResult {
  domain: string;
  results: DomainPricingResult[];
  cheapest: DomainPricingResult | null;
}

const GENERIC_TLDS = [
  "com",
  "net",
  "org",
  "info",
  "biz",
  "co",
  "xyz",
  "online",
  "site",
  "website",
  "space",
  "tech",
  "store",
  "press",
  "services",
  "news",
  "ninja",
  "guru",
  "pro",
  "host",
];

const PK_TLDS = ["pk", "com.pk", "edu.pk", "org.pk", "net.pk", "fam.pk", "web.pk"];

const CC_TLDS = [
  "uk",
  "co.uk",
  "org.uk",
  "me.uk",
  "eu",
  "us",
  "ca",
  "com.au",
  "net.au",
  "org.au",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "be",
  "at",
  "ch",
  "se",
  "no",
  "fi",
  "dk",
  "pt",
  "pl",
  "gr",
  "ie",
  "co.nz",
  "net.nz",
  "org.nz",
  "co.za",
  "cn",
  "com.cn",
  "net.cn",
  "org.cn",
  "tw",
  "com.tw",
  "net.tw",
  "org.tw",
  "jp",
  "co.jp",
  "kr",
  "in",
  "co.in",
  "net.in",
  "org.in",
  "br",
  "com.br",
  "mx",
  "com.mx",
];

const MARGIN_GENERIC = 0.15;
const MARGIN_CC = 0;
const MARGIN_PK = 0.15;

function isPKDomain(tld: string): boolean {
  return PK_TLDS.includes(tld);
}

function isGenericTLD(tld: string): boolean {
  return GENERIC_TLDS.includes(tld);
}

function isCCTLD(tld: string): boolean {
  return CC_TLDS.includes(tld);
}

function applyMargin(price: number, tld: string): number {
  if (isPKDomain(tld)) {
    return Math.round(price * (1 + MARGIN_PK) * 100) / 100;
  }
  if (isGenericTLD(tld)) {
    return Math.round(price * (1 + MARGIN_GENERIC) * 100) / 100;
  }
  if (isCCTLD(tld)) {
    return Math.round(price * (1 + MARGIN_CC) * 100) / 100;
  }
  return price;
}

export async function searchDomain(
  domainName: string
): Promise<UnifiedDomainSearchResult> {
  const tld = domainName.split(".").slice(1).join(".");

  const searchPromises: Promise<DomainPricingResult>[] = [];

  if (isPKDomain(tld)) {
    searchPromises.push(searchWithProvider(domainName, tld, "websouls"));
  } else {
    searchPromises.push(searchWithProvider(domainName, tld, "resellerspanel"));
  }

  const results = await Promise.allSettled(searchPromises);

  const successfulResults = results
    .filter(
      (r): r is PromiseFulfilledResult<DomainPricingResult> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  const cheapest = successfulResults
    .filter((r) => r.available)
    .sort((a, b) => a.registrationPrice - b.registrationPrice)[0] || null;

  return {
    domain: domainName,
    results: successfulResults,
    cheapest,
  };
}

async function searchWithProvider(
  domain: string,
  tld: string,
  provider: DomainProvider
): Promise<DomainPricingResult> {
  try {
    if (provider === "resellerspanel") {
      const check = await rpCheck(domain);
      const pricing = await rpGetPricing(tld);

      return {
        domain,
        tld,
        available: check.available,
        provider: "resellerspanel",
        registrationPrice: applyMargin(
          pricing.registration || check.price,
          tld
        ),
        renewalPrice: applyMargin(pricing.renewal, tld),
        currency: check.currency || "USD",
        isPKDomain: isPKDomain(tld),
      };
    } else {
      const check = await wsCheck(domain);
      const pricing = await wsGetPricing(tld);

      return {
        domain,
        tld,
        available: check.available,
        provider: "websouls",
        registrationPrice: applyMargin(
          pricing.registration || check.price,
          tld
        ),
        renewalPrice: applyMargin(pricing.renewal, tld),
        currency: check.currency || "PKR",
        isPKDomain: isPKDomain(tld),
      };
    }
  } catch (error) {
    console.error(`Error searching with ${provider}:`, error);
    return {
      domain,
      tld,
      available: false,
      provider,
      registrationPrice: 0,
      renewalPrice: 0,
      currency: provider === "resellerspanel" ? "USD" : "PKR",
      isPKDomain: isPKDomain(tld),
    };
  }
}

export async function searchMultipleDomains(
  baseDomain: string,
  tlds: string[]
): Promise<UnifiedDomainSearchResult[]> {
  const searchPromises = tlds.map((tld) =>
    searchDomain(`${baseDomain}.${tld}`)
  );

  return Promise.all(searchPromises);
}

export async function getAvailableTLDs(): Promise<
  Array<{
    tld: string;
    provider: DomainProvider;
    registration: number;
    renewal: number;
    currency: string;
  }>
> {
  const rpTLDs = await rpGetTLDs();
  const pkPricing = await wsGetPKPricing();

  const allTLDs: Array<{
    tld: string;
    provider: DomainProvider;
    registration: number;
    renewal: number;
    currency: string;
  }> = [];

  for (const tld of rpTLDs) {
    allTLDs.push({
      tld: tld.tld,
      provider: "resellerspanel",
      registration: applyMargin(tld.registration, tld.tld),
      renewal: applyMargin(tld.renewal, tld.tld),
      currency: "USD",
    });
  }

  const pkTLDs = [
    { tld: "pk", ...pkPricing.pk },
    { tld: "com.pk", ...pkPricing.comPk },
    { tld: "edu.pk", ...pkPricing.eduPk },
  ];

  for (const tld of pkTLDs) {
    allTLDs.push({
      tld: tld.tld,
      provider: "websouls",
      registration: applyMargin(tld.registration, tld.tld),
      renewal: applyMargin(tld.renewal, tld.tld),
      currency: "PKR",
    });
  }

  return allTLDs;
}

export function calculateTotalPrice(
  items: Array<{ price: number; years: number }>
): number {
  return items.reduce((total, item) => total + item.price * item.years, 0);
}

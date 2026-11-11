import crypto from "crypto";

const MERCHANT_CODE = process.env.TWOCHECKOUT_MERCHANT_CODE || "";
const SECRET_KEY = process.env.TWOCHECKOUT_SECRET_KEY || "";
const CHECKOUT_URL = "https://secure.2checkout.com/order/checkout.php";

export interface CheckoutItem {
  productId: string;
  quantity: number;
  price?: number;
  name?: string;
  options?: string;
}

export interface CreateBuyLinkOptions {
  items: CheckoutItem[];
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  ref?: string;
  backRef?: string;
  language?: string;
  test?: boolean;
}

function byteLength(str: string): number {
  return Buffer.byteLength(str, "utf-8");
}

function buildHmacSourceString(params: Record<string, string>): string {
  let result = "";
  for (const key of Object.keys(params)) {
    const value = params[key] || "";
    const len = byteLength(value);
    if (len > 0) {
      result += len + value;
    }
  }
  return result;
}

export function generateBuyLink(options: CreateBuyLinkOptions): string {
  const {
    items,
    currency = "USD",
    ref,
    backRef,
    language = "en",
    test = false,
  } = options;

  if (!MERCHANT_CODE) {
    throw new Error("TWOCHECKOUT_MERCHANT_CODE is not configured");
  }

  const prods = items.map((i) => i.productId).join(",");
  const qtys = items.map((i) => String(i.quantity)).join(",");

  const params: Record<string, string> = {
    PRODS: prods,
    QTY: qtys,
    CURRENCY: currency,
    LANG: language,
    CARD: "1",
    CART: "1",
  };

  if (ref) params.REF = ref;
  if (test) params.DOTEST = "1";

  // Build query string
  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  let url = `${CHECKOUT_URL}?${queryString}`;

  if (backRef) {
    url += `&BACK_REF=${encodeURIComponent(backRef)}`;
  }

  return url;
}

export function generateSecureBuyLink(options: CreateBuyLinkOptions): string {
  const {
    items,
    currency = "USD",
    ref,
    backRef,
    language = "en",
    test = false,
  } = options;

  if (!SECRET_KEY) {
    throw new Error("TWOCHECKOUT_SECRET_KEY is not configured");
  }

  const prods = items.map((i) => i.productId).join(",");
  const qtys = items.map((i) => String(i.quantity)).join(",");

  // Build the parameter string for PHASH calculation
  const paramParts: string[] = [];
  paramParts.push(`PRODS=${prods}`);
  paramParts.push(`QTY=${qtys}`);
  if (currency) paramParts.push(`CURRENCY=${currency}`);
  if (language) paramParts.push(`LANG=${language}`);
  paramParts.push("CARD=1");
  paramParts.push("CART=1");
  if (ref) paramParts.push(`REF=${ref}`);

  const paramStr = paramParts.join("&");

  // For PHASH, we need the raw parameter string length + the string
  // But looking at the docs, the HMAC source is: length(prefixed_params_string)
  // Actually the docs say: build string from query params, prefixed by length of the sequence
  // Let me re-read: "build a string from the query parameters of the buy-link, prefixed by the length of the sequence of parameters"

  // The source string for HMAC is: the full parameter string with its length prepended
  const sourceStr = paramStr;

  // HMAC-SHA256
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(sourceStr).digest("hex");

  const phash = `sha256.${hmac}`;

  const params: Record<string, string> = {
    PRODS: prods,
    QTY: qtys,
    CURRENCY: currency,
    LANG: language,
    CARD: "1",
    CART: "1",
    PHASH: phash,
  };

  if (ref) params.REF = ref;
  if (test) params.DOTEST = "1";

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  let url = `${CHECKOUT_URL}?${queryString}`;

  if (backRef) {
    url += `&BACK_REF=${encodeURIComponent(backRef)}`;
  }

  return url;
}

export function verifyIpnHash(
  ipnParams: Record<string, string>,
  receivedHash: string
): boolean {
  if (!SECRET_KEY) return false;

  // Build the HMAC source string from IPN parameters in exact order
  // The order must match what 2Checkout sent
  const orderedKeys = [
    "SALEDATE", "REFNO", "REFNOEXT", "ORDERNO", "ORDERSTATUS",
    "PAYMETHOD", "FIRSTNAME", "LASTNAME", "COMPANY", "REGISTRATIONNUMBER",
    "FISCALCODE", "CBANKNAME", "CBANKACCOUNT", "ADDRESS1", "ADDRESS2",
    "CITY", "STATE", "ZIPCODE", "COUNTRY", "PHONE", "FAX",
    "CUSTOMEREMAIL", "FIRSTNAME_D", "LASTNAME_D", "COMPANY_D",
    "ADDRESS1_D", "ADDRESS2_D", "CITY_D", "STATE_D", "ZIPCODE_D",
    "COUNTRY_D", "PHONE_D", "IPADDRESS", "CURRENCY",
  ];

  let hashStr = "";
  for (const key of orderedKeys) {
    const value = ipnParams[key] || "";
    const len = byteLength(value);
    if (len > 0) {
      hashStr += len + value;
    }
  }

  // Add IPN_PID[], IPN_PNAME[], etc. arrays
  const arrayKeys = [
    "IPN_PID", "IPN_PNAME", "IPN_PCODE", "IPN_INFO",
    "IPN_QTY", "IPN_PRICE", "IPN_VAT", "IPN_VER",
    "IPN_DISCOUNT", "IPN_PROMONAME", "IPN_DELIVEREDCODES", "IPN_TOTAL",
  ];

  for (const arrKey of arrayKeys) {
    let idx = 0;
    while (ipnParams[`${arrKey}[${idx}]`] !== undefined) {
      const value = ipnParams[`${arrKey}[${idx}]`];
      const len = byteLength(value);
      if (len > 0) {
        hashStr += len + value;
      }
      idx++;
    }
  }

  // Add remaining scalar params
  const remainingKeys = [
    "IPN_TOTALGENERAL", "IPN_SHIPPING", "IPN_COMMISSION",
    "IPN_DATE", "TEST_ORDER",
  ];

  for (const key of remainingKeys) {
    const value = ipnParams[key] || "";
    const len = byteLength(value);
    if (len > 0) {
      hashStr += len + value;
    }
  }

  const computedHash = crypto.createHmac("sha256", SECRET_KEY).update(hashStr).digest("hex");
  return computedHash === receivedHash;
}

export function generateIpnResponse(
  ipnPid0: string,
  ipnPname0: string,
  ipnDate: string
): string {
  const date = formatDate(new Date());
  const sourceStr = `${byteLength(ipnPid0)}${ipnPid0}${byteLength(ipnPname0)}${ipnPname0}${byteLength(ipnDate)}${ipnDate}${byteLength(date)}${date}`;
  const hash = crypto.createHmac("sha256", SECRET_KEY).update(sourceStr).digest("hex");
  return `<sig algo="sha256" date="${date}">${hash}</sig>`;
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function generateIpnErrorResponse(): string {
  return "<EPAYMENT />";
}

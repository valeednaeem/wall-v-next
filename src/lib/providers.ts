export interface AIProvider {
  name: string;
  chat(messages: { role: string; content: string }[]): Promise<string>;
  generateContent(prompt: string): Promise<string>;
}

export interface PaymentProvider {
  name: string;
  createCheckout(data: CheckoutData): Promise<CheckoutResult>;
  verifyPayment(paymentId: string): Promise<boolean>;
}

export interface CheckoutData {
  amount: number;
  currency: string;
  description: string;
  email: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface HostingProvider {
  name: string;
  createAccount(data: HostingData): Promise<HostingResult>;
  suspendAccount(accountId: string): Promise<boolean>;
  terminateAccount(accountId: string): Promise<boolean>;
}

export interface HostingData {
  domain: string;
  plan: string;
  email: string;
}

export interface HostingResult {
  accountId: string;
  status: string;
}

export interface DomainProvider {
  name: string;
  checkAvailability(domain: string): Promise<DomainCheckResult>;
  register(data: DomainData): Promise<DomainResult>;
  renew(domain: string, years: number): Promise<boolean>;
  transfer(domain: string, authCode: string): Promise<boolean>;
}

export interface DomainCheckResult {
  available: boolean;
  price?: number;
}

export interface DomainData {
  domain: string;
  registrant: RegistrantInfo;
}

export interface DomainResult {
  orderId: string;
  status: string;
}

export interface RegistrantInfo {
  name: string;
  email: string;
  organization?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
}

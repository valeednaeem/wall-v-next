import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("acceptable-use", "Acceptable Use Policy");
}

export default function AcceptableUsePage() {
  return (
    <LegalPageView
      slug="acceptable-use"
      fallbackTitle="Acceptable Use Policy"
      fallbackContent={`
        <h2>1. Introduction</h2>
        <p>This Acceptable Use Policy ("AUP") governs your use of Wall-V's services, including our website, AI tools, APIs, hosting, and all related platforms. By using our services, you agree to comply with this policy.</p>

        <h2>2. Prohibited Activities</h2>
        <p>You may not use our services to:</p>
        <ul>
          <li>Violate any applicable law, regulation, or third-party rights</li>
          <li>Send spam, chain letters, pyramid schemes, or other unsolicited communications</li>
          <li>Transmit malware, viruses, worms, or other harmful code</li>
          <li Attempt to gain unauthorized access to any system, network, or account</li>
          <li>Interfere with or disrupt the integrity or performance of our services</li>
          <li>Engage in denial-of-service attacks or similar abusive behavior</li>
          <li>Scrape, crawl, or use automated tools to access our services without permission</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation</li>
          <li>Collect or harvest personal information of others without consent</li>
        </ul>

        <h2>3. AI Services Acceptable Use</h2>
        <p>When using our AI tools and services, you additionally agree to:</p>
        <ul>
          <li>Not use AI outputs to create harmful, misleading, or fraudulent content</li>
          <li>Not attempt to extract or reverse-engineer our AI models or algorithms</li>
          <li>Not use our AI services to generate content that violates intellectual property rights</li>
          <li>Not use AI-generated content to impersonate real individuals or organizations</li>
          <li>Not overload our AI services with excessive or malicious requests</li>
          <li>Verify AI outputs before using them for critical decisions</li>
        </ul>

        <h2>4. Content Standards</h2>
        <p>Content you create, store, or transmit through our services must not:</p>
        <ul>
          <li>Contain illegal, obscene, defamatory, or threatening material</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Contain malware or harmful code</li>
          <li>Be misleading, deceptive, or fraudulent</li>
          <li>Violate privacy rights of others</li>
        </ul>

        <h2>5. API Usage</h2>
        <p>If you access our APIs:</p>
        <ul>
          <li>Comply with rate limits and usage quotas</li>
          <li>Do not share API keys with unauthorized parties</li>
          <li>Implement proper authentication and error handling</li>
          <li>Do not cache or store API responses beyond reasonable limits</li>
        </ul>

        <h2>6. Enforcement</h2>
        <p>We reserve the right to investigate and take appropriate action against anyone who violates this policy, including but not limited to suspending or terminating access to our services.</p>

        <h2>7. Reporting Violations</h2>
        <p>To report a violation of this policy, contact us at abuse@wall-v.com.</p>

        <h2>8. Updates</h2>
        <p>We may update this policy from time to time. Continued use of our services constitutes acceptance of the updated policy.</p>
      `}
    />
  );
}

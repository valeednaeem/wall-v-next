import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("data-processing", "Data Processing & Security Policy");
}

export default function DataProcessingPage() {
  return (
    <LegalPageView
      slug="data-processing"
      fallbackTitle="Data Processing & Security Policy"
      fallbackContent={`
        <h2>1. Data Processing Overview</h2>
        <p>This policy describes how Wall-V processes, stores, and protects data in connection with our services. We are committed to implementing appropriate technical and organizational measures to ensure data security.</p>

        <h2>2. Types of Data Processed</h2>
        <ul>
          <li><strong>Account Data:</strong> Name, email, phone, billing information</li>
          <li><strong>Project Data:</strong> Code, designs, specifications, documents provided for development</li>
          <li><strong>Usage Data:</strong> Log files, analytics, API usage patterns</li>
          <li><strong>Communication Data:</strong> Support tickets, emails, chat logs</li>
          <li><strong>Payment Data:</strong> Transaction records (processed by secure third-party providers)</li>
          <li><strong>AI Interaction Data:</strong> Prompts and outputs from AI services</li>
        </ul>

        <h2>3. Data Processing Legal Basis</h2>
        <p>We process data based on:</p>
        <ul>
          <li>Contractual necessity (providing our services)</li>
          <li>Legitimate interests (improving services, security)</li>
          <li>Consent (marketing communications, analytics)</li>
          <li>Legal obligations (tax records, regulatory compliance)</li>
        </ul>

        <h2>4. Security Measures</h2>
        <p>We implement the following security measures:</p>
        <ul>
          <li>TLS/SSL encryption for data in transit</li>
          <li>AES-256 encryption for data at rest</li>
          <li>Regular security audits and penetration testing</li>
          <li>Access controls and role-based permissions</li>
          <li>Multi-factor authentication for admin access</li>
          <li>Automated threat detection and monitoring</li>
          <li>Regular backups with encrypted storage</li>
          <li>Employee security training and awareness programs</li>
        </ul>

        <h2>5. Data Storage & Retention</h2>
        <p>Data is stored on secure cloud infrastructure with redundant storage. Retention periods:</p>
        <ul>
          <li>Account data: Duration of account plus 30 days</li>
          <li>Project data: 90 days after project completion</li>
          <li>Payment records: 7 years (legal requirement)</li>
          <li>Usage logs: 12 months</li>
          <li>Support tickets: 24 months</li>
        </ul>

        <h2>6. Data Sharing</h2>
        <p>We share data only when necessary with:</p>
        <ul>
          <li>Service providers who assist in our operations (hosting, payment processing)</li>
          <li>Analytics providers (anonymized data only)</li>
          <li>Law enforcement when legally required</li>
          <li>Business transfer parties (in case of merger/acquisition)</li>
        </ul>

        <h2>7. International Data Transfers</h2>
        <p>Data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including standard contractual clauses where required.</p>

        <h2>8. AI Data Processing</h2>
        <p>AI services process data to generate outputs. We do not use customer data to train AI models without explicit consent. AI interactions may be logged for quality improvement purposes.</p>

        <h2>9. Incident Response</h2>
        <p>In the event of a data breach, we will:</p>
        <ul>
          <li>Contain and mitigate the breach immediately</li>
          <li>Notify affected users within 72 hours</li>
          <li>Report to relevant authorities as required by law</li>
          <li>Conduct a thorough investigation and implement corrective measures</li>
        </ul>

        <h2>10. Contact</h2>
        <p>For data processing inquiries, contact our Data Protection Officer at dpo@wall-v.com.</p>
      `}
    />
  );
}

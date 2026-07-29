import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("privacy", "Privacy Policy");
}

export default function PrivacyPage() {
  return (
    <LegalPageView
      slug="privacy"
      fallbackTitle="Privacy Policy"
      fallbackContent={`
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly, including account details (name, email, phone), payment information, project specifications, communications, and usage data from cookies and analytics.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to provide and improve our services, process transactions, send communications, ensure security, and comply with legal obligations.</p>

        <h2>3. Cookies & Tracking</h2>
        <p>We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can control cookies through your browser settings.</p>

        <h2>4. Data Sharing & Third Parties</h2>
        <p>We share data with service providers who assist in our operations, payment processors, analytics partners, and when required by law. We do not sell your personal information.</p>

        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures including TLS/SSL encryption, secure servers, and regular security audits. However, no method of transmission is 100% secure.</p>

        <h2>6. Your Rights (GDPR)</h2>
        <p>You have the right to access, correct, delete, restrict processing, and port your personal data. Contact us to exercise these rights.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your data for as long as necessary to provide our services. Upon account deletion, personal data is removed within 30 days, except where retention is required by law.</p>

        <h2>8. Children's Privacy</h2>
        <p>Our services are not directed to individuals under 16. We do not knowingly collect data from children.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this policy periodically. Significant changes will be communicated via email or website notice.</p>

        <h2>10. Contact</h2>
        <p>For privacy-related inquiries, contact us at privacy@wall-v.com.</p>
      `}
    />
  );
}

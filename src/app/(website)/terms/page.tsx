import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("terms", "Terms & Conditions");
}

export default function TermsPage() {
  return (
    <LegalPageView
      slug="terms"
      fallbackTitle="Terms & Conditions"
      fallbackContent={`
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using Wall-V's services, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.</p>

        <h2>2. Services Description</h2>
        <p>Wall-V provides AI-powered software development, web and mobile application development, hosting services, digital product sales, and consulting services. We reserve the right to modify, suspend, or discontinue any service at any time.</p>

        <h2>3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

        <h2>4. Payment & Billing</h2>
        <p>All payments are processed through our secure payment partners. Prices are subject to change with 30 days' notice. Refunds are subject to our Refund Policy. Late payments may incur a 1.5% monthly fee.</p>

        <h2>5. Intellectual Property</h2>
        <p>All content, trademarks, and intellectual property on this website are owned by Wall-V or its licensors. Custom development work ownership is transferred upon full payment as specified in individual project agreements.</p>

        <h2>6. Limitation of Liability</h2>
        <p>Wall-V shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.</p>

        <h2>7. Indemnification</h2>
        <p>You agree to indemnify and hold Wall-V harmless from any claims, losses, or damages, including legal fees, resulting from your use of our services or violation of these terms.</p>

        <h2>8. Termination</h2>
        <p>Either party may terminate this agreement with 30 days' written notice. We reserve the right to immediately terminate accounts that violate these terms.</p>

        <h2>9. Governing Law</h2>
        <p>These terms are governed by the laws of Pakistan. Any disputes shall be resolved in the courts of Karachi, Pakistan.</p>

        <h2>10. Contact</h2>
        <p>For questions about these terms, contact us at legal@wall-v.com.</p>
      `}
    />
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Wall-V terms of service — the rules and guidelines governing your use of our platform and services.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: July 15, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using Wall-V&apos;s services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time, and continued use constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Services Description</h2>
          <p className="text-muted-foreground mb-3">Wall-V provides the following digital services:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Custom web and mobile application development</li>
            <li>AI automation and machine learning solutions</li>
            <li>ERP and CRM system implementation</li>
            <li>Web hosting and domain registration</li>
            <li>Digital product sales and licensing</li>
            <li>Technical consulting and support services</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            Specific service details, deliverables, and timelines are defined in individual project agreements or statements of work.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. User Accounts</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>You must provide accurate and complete registration information</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
            <li>You may not share your account with others or create multiple accounts</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Payment & Billing</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>All prices are listed in USD unless otherwise specified</li>
            <li>Payment is due as outlined in the project agreement or invoice</li>
            <li>Late payments may incur a 1.5% monthly fee after a 7-day grace period</li>
            <li>Refund requests must be made within 14 days of payment</li>
            <li>We reserve the right to suspend services for overdue accounts</li>
            <li>Hosting renewals are billed annually and auto-renew unless canceled 30 days prior</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
          <p className="text-muted-foreground">
            Upon full payment, you receive ownership of the final deliverables as defined in the project agreement. Wall-V retains ownership of pre-existing code, frameworks, tools, and methodologies used in development. We may use anonymized project data for portfolio and marketing purposes unless you opt out in writing.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Wall-V shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. Our total liability for any claim arising from our services shall not exceed the amount paid by you for those services in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify, defend, and hold harmless Wall-V, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorney fees) arising from your use of our services, your violation of these terms, or your violation of any rights of a third party.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Termination</h2>
          <p className="text-muted-foreground">
            Either party may terminate the agreement with 30 days written notice. We may terminate or suspend your access immediately for breach of these terms. Upon termination, all outstanding payments become due immediately. Sections regarding intellectual property, limitation of liability, and indemnification survive termination.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Governing Law</h2>
          <p className="text-muted-foreground">
            These terms are governed by and construed in accordance with the laws of Pakistan. Any disputes shall be resolved in the courts of Karachi, Pakistan. Both parties agree to attempt informal resolution before pursuing formal legal action.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Information</h2>
          <p className="text-muted-foreground">
            For questions about these terms, contact us at:
          </p>
          <div className="mt-3 text-muted-foreground">
            <p><strong>Email:</strong> legal@wall-v.com</p>
            <p><strong>Address:</strong> Wall-V Technologies, Karachi, Pakistan</p>
          </div>
        </section>
      </div>
    </div>
  );
}

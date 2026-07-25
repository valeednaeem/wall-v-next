import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Wall-V privacy policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: July 15, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground mb-3">We collect information you provide directly to us:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
            <li><strong>Payment Information:</strong> Billing address and payment method details when you make a purchase.</li>
            <li><strong>Project Data:</strong> Specifications, files, and content you provide for web development or AI automation projects.</li>
            <li><strong>Communications:</strong> Messages you send us through contact forms, email, or support tickets.</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, and interaction patterns on our platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>To provide, maintain, and improve our services</li>
            <li>To process transactions and send related information</li>
            <li>To send technical notices, updates, and security alerts</li>
            <li>To respond to your comments, questions, and customer service requests</li>
            <li>To analyze usage patterns and optimize our platform</li>
            <li>To detect, prevent, and address technical issues and fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Cookies & Tracking</h2>
          <p className="text-muted-foreground">
            We use cookies and similar tracking technologies to maintain your session, remember preferences, and analyze usage. You can instruct your browser to refuse all cookies, though some features may not function properly without them. We use essential cookies for authentication, analytics cookies to understand usage, and preference cookies to remember your settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Data Sharing & Third Parties</h2>
          <p className="text-muted-foreground mb-3">We do not sell your personal information. We may share data with:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>Service Providers:</strong> Hosting providers, payment processors, and analytics tools that help us operate our platform.</li>
            <li><strong>Legal Requirements:</strong> When required by law, subpoena, or other legal process.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
          <p className="text-muted-foreground">
            We implement industry-standard security measures including encryption (TLS/SSL), secure server infrastructure, regular security audits, access controls, and automated threat detection. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Your Rights (GDPR)</h2>
          <p className="text-muted-foreground mb-3">If you are in the European Economic Area, you have the right to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Data portability — receive your data in a structured format</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your personal information only as long as necessary to provide our services and fulfill the purposes described in this policy. When you delete your account, we remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground">
            Our services are not directed to individuals under 16. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal data, please contact us and we will take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of our services after any changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have questions about this privacy policy or our data practices, contact us at:
          </p>
          <div className="mt-3 text-muted-foreground">
            <p><strong>Email:</strong> privacy@wall-v.com</p>
            <p><strong>Address:</strong> Wall-V Technologies, Karachi, Pakistan</p>
          </div>
        </section>
      </div>
    </div>
  );
}

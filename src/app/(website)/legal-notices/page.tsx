import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("legal-notices", "Contact & Legal Notices");
}

export default function LegalNoticesPage() {
  return (
    <LegalPageView
      slug="legal-notices"
      fallbackTitle="Contact & Legal Notices"
      fallbackContent={`
        <h2>Company Information</h2>
        <p><strong>Wall-V</strong><br/>
        AI-Powered Software Development Agency<br/>
        Karachi, Pakistan</p>

        <h2>Contact Information</h2>
        <ul>
          <li><strong>General Inquiries:</strong> info@wall-v.com</li>
          <li><strong>Legal Department:</strong> legal@wall-v.com</li>
          <li><strong>Privacy Matters:</strong> privacy@wall-v.com</li>
          <li><strong>Support:</strong> support@wall-v.com</li>
          <li><strong>Report Abuse:</strong> abuse@wall-v.com</li>
          <li><strong>AI Support:</strong> ai-support@wall-v.com</li>
        </ul>

        <h2>Legal Notices</h2>
        <p>All legal notices, requests, and communications should be sent to legal@wall-v.com or by mail to our registered address.</p>

        <h2>Governing Law</h2>
        <p>These terms and any disputes arising from them are governed by the laws of Pakistan. Any legal proceedings shall take place in the courts of Karachi, Pakistan.</p>

        <h2>Dispute Resolution</h2>
        <p>Before initiating legal proceedings, you agree to first contact us and attempt to resolve any dispute informally. Most concerns can be resolved quickly through direct communication.</p>

        <h2>Severability</h2>
        <p>If any provision of our terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>

        <h2>Entire Agreement</h2>
        <p>Our Terms & Conditions, Privacy Policy, and other legal pages constitute the entire agreement between you and Wall-V regarding our services.</p>

        <h2>Waiver</h2>
        <p>Failure to enforce any provision of our terms does not constitute a waiver of that provision or any other provision.</p>

        <h2>Assignment</h2>
        <p>You may not assign your rights or obligations under these terms without our written consent. We may assign our rights and obligations without restriction.</p>

        <h2>Notices to Users</h2>
        <p>We may provide notices to you via email, through our website, or through our services. It is your responsibility to keep your contact information up to date.</p>

        <h2>Changes to Legal Pages</h2>
        <p>We reserve the right to modify these legal pages at any time. Changes take effect upon posting to our website. Your continued use of our services constitutes acceptance of any changes.</p>

        <h2>Contact Us</h2>
        <p>If you have any questions about our legal notices, please contact us at legal@wall-v.com.</p>
      `}
    />
  );
}

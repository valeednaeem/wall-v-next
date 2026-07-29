import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("refund", "Refund Policy");
}

export default function RefundPage() {
  return (
    <LegalPageView
      slug="refund"
      fallbackTitle="Refund Policy"
      fallbackContent={`
        <h2>1. General Refund Policy</h2>
        <p>Wall-V is committed to customer satisfaction. This Refund Policy outlines the conditions under which refunds may be issued for our products and services.</p>

        <h2>2. AI Agents & SaaS Subscriptions</h2>
        <p>AI agent subscriptions may be cancelled within 14 days of purchase for a full refund if the service has not been substantially used. After 14 days, refunds are prorated based on remaining subscription time. Setup fees are non-refundable.</p>

        <h2>3. Custom Software Development</h2>
        <p>For custom development projects, payments are tied to milestones. If a project is cancelled before completion, work completed up to that point is billed. Advance payments for unstarted work are fully refundable within 14 days of payment.</p>

        <h2>4. Website & Mobile App Development</h2>
        <p>Website and mobile app development projects follow milestone-based billing. Cancellation after project commencement refunds amounts for undelivered milestones only. A cancellation fee of 15% may apply.</p>

        <h2>5. Hosting Services</h2>
        <p>Hosting fees are refundable within 30 days of purchase or renewal. After 30 days, hosting fees are non-refundable. Domain registration fees are never refundable.</p>

        <h2>6. Digital Products & Templates</h2>
        <p>Digital products and templates may be refunded within 14 days of purchase if they are defective or not as described. Downloaded products that are functioning as described are non-refundable.</p>

        <h2>7. Consulting Services</h2>
        <p>Consulting session fees are refundable if cancelled more than 48 hours before the scheduled session. Cancellations within 48 hours receive a 50% refund or rescheduling option.</p>

        <h2>8. Maintenance & Support Plans</h2>
        <p>Monthly maintenance plans may be cancelled at any time with 30 days' notice. Prepaid annual plans are refundable on a prorated basis minus a 10% administrative fee.</p>

        <h2>9. Design Services</h2>
        <p>Design service refunds depend on project stage. Before concept delivery: full refund. After concept approval: 50% refund. After final delivery: no refund unless work is defective.</p>

        <h2>10. How to Request a Refund</h2>
        <p>Contact us at refunds@wall-v.com with your order number and reason for refund. Processing takes 5-10 business days. Refunds are issued to the original payment method.</p>

        <h2>11. Exceptions</h2>
        <p>Refunds may be denied for abuse of this policy, violation of our Terms & Conditions, or circumstances beyond our control. We reserve the right to make final decisions on refund eligibility.</p>
      `}
    />
  );
}

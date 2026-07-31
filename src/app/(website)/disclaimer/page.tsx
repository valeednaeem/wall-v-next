import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("disclaimer", "Disclaimer");
}

export default function DisclaimerPage() {
  return (
    <LegalPageView
      slug="disclaimer"
      fallbackTitle="Disclaimer"
      fallbackContent={`
        <h2>General Information Disclaimer</h2>
        <p>The information provided on Wall-V's website, applications, and services is for general informational purposes only. All information is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on our services.</p>

        <h2>AI-Generated Content Disclaimer</h2>
        <p>Wall-V provides AI-powered tools and services that generate content, code, recommendations, and decisions. AI-generated content may contain errors, inaccuracies, or inconsistencies. Users should not rely solely on AI-generated output for critical decisions without human verification and professional review.</p>

        <h2>AI Hallucination Disclaimer</h2>
        <p>Our AI systems may occasionally produce outputs that are factually incorrect, fabricated, or not based on real data — commonly known as "hallucinations." Users are strongly advised to independently verify all AI-generated information before relying on it for any purpose. Wall-V does not accept responsibility for decisions made based on hallucinated or inaccurate AI output.</p>

        <h2>No Legal Advice Disclaimer</h2>
        <p>Nothing on this website or in our services constitutes legal advice. The information provided is for general informational purposes only. You should consult with a qualified legal professional for advice specific to your situation.</p>

        <h2>No Financial Advice Disclaimer</h2>
        <p>The information provided through our services is not intended as financial advice. We are not financial advisors, and our services should not be used as a substitute for professional financial consultation. Always consult with a qualified financial professional before making financial decisions.</p>

        <h2>No Medical Advice Disclaimer</h2>
        <p>Our services do not provide medical advice. Any health-related information provided through our AI tools or services is for informational purposes only and should not be used to diagnose, treat, cure, or prevent any medical condition. Always consult with a qualified healthcare provider.</p>

        <h2>No Professional Advice Disclaimer</h2>
        <p>Our services do not constitute professional advice in any field including but not limited to engineering, architecture, accounting, or human resources. The information provided should not be used as a substitute for professional consultation in any specialized field.</p>

        <h2>No Guarantee of Accuracy</h2>
        <p>While we strive to provide accurate and up-to-date information, we make no representations or warranties about the accuracy, reliability, completeness, or timeliness of the information, services, or related graphics contained on this website.</p>

        <h2>No Guarantee of Completeness</h2>
        <p>We do not guarantee that the information provided through our services is complete, current, or error-free. Information may become outdated, and we are not obligated to update it.</p>

        <h2>No Guarantee of Uninterrupted Services</h2>
        <p>We do not guarantee that our services will be available at all times. Services may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>

        <h2>Limitation of Liability</h2>
        <p>In no event shall Wall-V, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or in connection with your use of our services, whether based on warranty, contract, tort, or any other legal theory.</p>

        <h2>Third-Party Integrations Disclaimer</h2>
        <p>Our services may integrate with or contain links to third-party services, products, or content. We do not endorse, guarantee, or assume responsibility for any third-party content, products, or services. Your use of third-party services is at your own risk and subject to their respective terms.</p>

        <h2>External Links Disclaimer</h2>
        <p>This website may contain links to external websites not provided or maintained by Wall-V. We do not guarantee the accuracy, relevance, or completeness of any information on these external websites.</p>

        <h2>User Responsibility</h2>
        <p>Users are solely responsible for their use of our services, including ensuring that their use complies with applicable laws and regulations. Users are responsible for backing up their data and verifying the accuracy of any output generated by our services.</p>

        <h2>Software Bugs and Technical Failures</h2>
        <p>Like all software, our applications and services may contain bugs or defects. While we work to ensure quality, we do not warrant that our services will be error-free or that all bugs will be corrected promptly. Users should maintain appropriate backups and disaster recovery plans.</p>

        <h2>AI Decision Limitations</h2>
        <p>AI-driven decisions and recommendations provided through our services are based on algorithms and data patterns. These decisions may not account for all contextual factors and should be validated by qualified humans before implementation.</p>

        <h2>API Downtime</h2>
        <p>API services may experience downtime due to maintenance, updates, scaling, or unforeseen technical issues. We do not guarantee 100% uptime and recommend implementing appropriate retry logic and fallback mechanisms.</p>

        <h2>Hosting Outages</h2>
        <p>While we strive for maximum uptime, hosting services may be affected by infrastructure failures, natural disasters, or force majeure events. We recommend maintaining off-site backups and disaster recovery plans.</p>

        <h2>Data Loss Risks</h2>
        <p>While we implement regular backups and security measures, we recommend that users maintain their own backup copies of important data. Wall-V shall not be liable for data loss beyond our reasonable control.</p>

        <h2>Security Incident Limitations</h2>
        <p>We implement industry-standard security measures; however, no system is impenetrable. We do not warrant that our services will be completely secure and are not liable for security breaches that occur despite our best efforts.</p>

        <h2>Force Majeure</h2>
        <p>Wall-V shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to natural disasters, pandemics, war, government actions, power failures, or internet outages.</p>

        <h2>User Verification Responsibility</h2>
        <p>Users are responsible for verifying the accuracy, legality, and appropriateness of any output generated by our services. Wall-V does not verify user content and is not responsible for any claims arising from inaccurate or inappropriate use of our services.</p>

        <h2>Updates to This Disclaimer</h2>
        <p>We reserve the right to update this disclaimer at any time. Continued use of our services after changes constitutes acceptance of the updated disclaimer.</p>

        <h2>Contact</h2>
        <p>For questions about this disclaimer, contact us at legal@wall-v.com.</p>
      `}
    />
  );
}

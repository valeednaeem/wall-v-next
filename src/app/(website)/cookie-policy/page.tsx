import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("cookie-policy", "Cookie Policy");
}

export default function CookiePolicyPage() {
  return (
    <LegalPageView
      slug="cookie-policy"
      fallbackTitle="Cookie Policy"
      fallbackContent={`
        <h2>What Are Cookies</h2>
        <p>Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.</p>

        <h2>Strictly Necessary Cookies</h2>
        <p>These cookies are essential for the website to function properly. They enable core functionality such as security, session management, and accessibility. You cannot opt out of these cookies as the website cannot function properly without them.</p>
        <ul>
          <li><strong>session_id:</strong> Maintains your session state across page requests. Provider: Wall-V. Duration: Session.</li>
          <li><strong>csrf_token:</strong: Protects against cross-site request forgery attacks. Provider: Wall-V. Duration: Session.</li>
          <li><strong>auth_token:</strong> Authenticates logged-in users. Provider: Wall-V. Duration: 30 days.</li>
          <li><strong>cookie_consent:</strong> Stores your cookie preference selections. Provider: Wall-V. Duration: 1 year.</li>
        </ul>

        <h2>Functional Cookies</h2>
        <p>These cookies enable personalized features such as remembering your preferences, language settings, and display options. They may be set by us or by third-party providers whose services we have added to our pages.</p>
        <ul>
          <li><strong>language_pref:</strong> Remembers your preferred language. Provider: Wall-V. Duration: 1 year.</li>
          <li><strong>theme_mode:</strong> Stores your dark/light mode preference. Provider: Wall-V. Duration: 1 year.</li>
          <li><strong>recent_views:</strong> Tracks recently viewed items for personalized recommendations. Provider: Wall-V. Duration: 30 days.</li>
        </ul>

        <h2>Analytics Cookies</h2>
        <p>These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. They help us improve our services and user experience.</p>
        <ul>
          <li><strong>_ga:</strong> Distinguishes unique users by assigning a randomly generated number. Provider: Google Analytics. Duration: 2 years.</li>
          <li><strong>_ga_*:</strong> Used to persist session state. Provider: Google Analytics. Duration: 2 years.</li>
          <li><strong>_gid:</strong> Distinguishes unique users. Provider: Google Analytics. Duration: 24 hours.</li>
          <li><strong>_gat:</strong> Used to throttle request rate. Provider: Google Analytics. Duration: 1 minute.</li>
        </ul>

        <h2>Marketing Cookies</h2>
        <p>These cookies are used to track visitors across websites. They are used to display ads that are relevant and engaging for the individual user. They are only set with your consent.</p>
        <ul>
          <li><strong>_fbp:</strong> Used by Facebook to deliver advertising. Provider: Meta. Duration: 3 months.</li>
          <li><strong>_gcl_au:</strong> Used by Google AdSense for experimentating ad efficiency. Provider: Google. Duration: 3 months.</li>
          <li><strong>fr:</strong> Used by Facebook for advertising and tracking. Provider: Meta. Duration: 3 months.</li>
        </ul>

        <h2>Third-Party Cookies</h2>
        <p>Some cookies are placed by third-party services that appear on our pages. We do not control these third-party cookies. Please refer to the respective third party's privacy policy for more information.</p>

        <h2>Managing Cookies</h2>
        <p>You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website. Most browsers allow you to:</p>
        <ul>
          <li>View and delete cookies</li>
          <li>Block third-party cookies</li>
          <li>Block cookies from particular sites</li>
          <li>Block all cookies</li>
          <li>Delete all cookies when you close your browser</li>
        </ul>

        <h2>Changes to This Policy</h2>
        <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated revision date.</p>

        <h2>Contact</h2>
        <p>For questions about our cookie practices, contact us at privacy@wall-v.com.</p>
      `}
    />
  );
}

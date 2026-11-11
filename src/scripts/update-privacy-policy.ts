import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";

const privacyContent = `<h1>Privacy Policy</h1>
<p><strong>Effective Date: July 29, 2026</strong></p>

<h2>1. Introduction</h2>
<p>Welcome to Wall-V ("we," "our," or "us"), operated by Valeed Naeem.</p>
<p>Your privacy is important to us. This Privacy Policy explains how we collect, use, process, store, protect, and disclose your information when you access or use our website, client dashboard, AI-powered services, mobile applications, hosting services, software solutions, and related products.</p>
<p>By accessing or using Wall-V, you agree to the collection and use of your information as described in this Privacy Policy.</p>
<p>If you do not agree with any part of this Privacy Policy, you should discontinue using our services.</p>

<h2>2. About Wall-V</h2>
<p>Wall-V is a technology platform providing professional digital services, including but not limited to:</p>
<ul>
<li>Website Design &amp; Development</li>
<li>eCommerce Development</li>
<li>ERP &amp; CRM Solutions</li>
<li>SaaS Development</li>
<li>Mobile Application Development</li>
<li>AI Agents</li>
<li>AI Voice Assistants</li>
<li>AI Chatbots</li>
<li>Business Automation</li>
<li>Hosting Services</li>
<li>Domain Registration Assistance</li>
<li>UI/UX Design</li>
<li>Branding</li>
<li>Digital Products</li>
<li>Website Templates</li>
<li>Software Components</li>
<li>API Development</li>
<li>Cloud Services</li>
<li>Security Solutions</li>
<li>Technical Consulting</li>
<li>Marketing Services</li>
<li>SEO Services</li>
<li>Social Media Automation</li>
<li>Client Dashboards</li>
<li>Project Management</li>
<li>Support Services</li>
</ul>
<p>Wall-V also provides AI-assisted communication tools through voice, chat, WhatsApp, and other supported channels.</p>

<h2>3. Information We Collect</h2>
<p>Depending on how you interact with our platform, we may collect:</p>
<h3>Personal Information</h3>
<ul>
<li>Full Name</li>
<li>Business Name</li>
<li>Email Address</li>
<li>Phone Number</li>
<li>Company Information</li>
<li>Billing Address</li>
<li>Country</li>
<li>City</li>
<li>Postal Code</li>
<li>Tax Information (where applicable)</li>
</ul>

<h3>Account Information</h3>
<p>When creating an account, we may collect:</p>
<ul>
<li>Username</li>
<li>Password (encrypted)</li>
<li>User Role</li>
<li>Dashboard Preferences</li>
<li>Login History</li>
<li>Security Settings</li>
</ul>
<p>Passwords are never stored in plain text.</p>

<h3>Project Information</h3>
<p>When requesting services we may collect:</p>
<ul>
<li>Project Requirements</li>
<li>Uploaded Documents</li>
<li>Design References</li>
<li>Technical Specifications</li>
<li>Budget</li>
<li>Timeline</li>
<li>Brand Assets</li>
<li>Files, Images, Videos, Audio Files, Documents</li>
<li>Project Notes</li>
<li>Communications</li>
</ul>

<h3>AI Conversation Data</h3>
<p>When communicating with our AI assistants, we may collect:</p>
<ul>
<li>Chat Messages</li>
<li>Voice Conversations</li>
<li>Uploaded Files</li>
<li>Questions, Requirements, Feedback</li>
<li>Generated Responses</li>
<li>Project Summaries</li>
</ul>
<p>AI conversations may be stored to improve project continuity, customer support, and service quality.</p>

<h3>Payment Information</h3>
<p>Payments are securely processed by third-party payment providers. Wall-V does not store complete credit card numbers. Payment processors may collect:</p>
<ul>
<li>Billing Information</li>
<li>Transaction Details</li>
<li>Payment Status</li>
<li>Invoice Information</li>
</ul>

<h3>Technical Information</h3>
<p>We automatically collect:</p>
<ul>
<li>IP Address</li>
<li>Browser Type</li>
<li>Device Information</li>
<li>Operating System</li>
<li>Screen Resolution</li>
<li>Time Zone</li>
<li>Language Preferences</li>
<li>Cookies</li>
<li>Session IDs</li>
<li>Usage Statistics</li>
<li>Error Logs</li>
<li>Performance Data</li>
</ul>

<h3>Hosting Services</h3>
<p>When purchasing hosting services, we may collect:</p>
<ul>
<li>Domain Name</li>
<li>DNS Information</li>
<li>Hosting Configuration</li>
<li>Server Preferences</li>
<li>Account Settings</li>
<li>SSL Preferences</li>
<li>Email Configuration</li>
</ul>

<h3>Domain Registration</h3>
<p>When assisting with domain registration or renewal, we may collect information required by registrars and applicable regulations, which may include registrant, administrative, technical, and billing contact details.</p>

<h2>4. How We Use Your Information</h2>
<p>Your information may be used to:</p>
<ul>
<li>Create your account</li>
<li>Verify your identity</li>
<li>Deliver purchased services</li>
<li>Manage projects</li>
<li>Process orders</li>
<li>Generate invoices</li>
<li>Provide customer support</li>
<li>Manage hosting accounts</li>
<li>Register domains</li>
<li>Improve AI responses</li>
<li>Improve website performance</li>
<li>Detect fraud</li>
<li>Prevent abuse</li>
<li>Send service notifications</li>
<li>Process refunds</li>
<li>Manage subscriptions</li>
<li>Generate reports</li>
<li>Maintain legal compliance</li>
<li>Improve user experience</li>
<li>Personalize dashboards</li>
<li>Generate project documentation</li>
<li>Automate workflows</li>
<li>Improve platform security</li>
</ul>

<h2>5. AI Services</h2>
<p>Wall-V uses Artificial Intelligence to assist with:</p>
<ul>
<li>Project Discovery</li>
<li>Website Planning</li>
<li>Requirement Gathering</li>
<li>Voice Conversations</li>
<li>Live Chat</li>
<li>Proposal Generation</li>
<li>Project Estimation</li>
<li>Customer Support</li>
<li>Knowledge Base Assistance</li>
<li>Content Suggestions</li>
<li>Automation Workflows</li>
</ul>
<p>AI-generated responses are intended to assist users and may require human review before final implementation. Users remain responsible for reviewing all AI-generated content before publication or deployment.</p>

<h2>6. Cookies &amp; Similar Technologies</h2>
<p>We use cookies and similar technologies to:</p>
<ul>
<li>Maintain login sessions</li>
<li>Remember preferences</li>
<li>Improve performance</li>
<li>Analyze traffic</li>
<li>Measure advertising effectiveness</li>
<li>Personalize content</li>
<li>Prevent fraud</li>
<li>Enhance security</li>
</ul>
<p>Users may disable cookies through their browser settings, although some functionality may be limited.</p>

<h2>7. Analytics</h2>
<p>We may use analytics platforms to understand website usage, including:</p>
<ul>
<li>Google Analytics</li>
<li>Google Search Console</li>
<li>Microsoft Clarity (where enabled)</li>
<li>Internal Analytics</li>
<li>Server Logs</li>
</ul>
<p>These services may collect anonymized usage information in accordance with their own privacy policies.</p>

<h2>8. Advertising &amp; Marketing</h2>
<p>We may use advertising and marketing platforms including:</p>
<ul>
<li>Google Ads</li>
<li>Google Merchant Center</li>
<li>Meta Platforms</li>
<li>LinkedIn</li>
<li>YouTube</li>
<li>Instagram</li>
<li>Facebook</li>
<li>Email Marketing Services</li>
</ul>
<p>These platforms may use cookies, tracking technologies, and conversion measurement tools.</p>

<h2>9. Third-Party Services</h2>
<p>Wall-V integrates with third-party providers including, where applicable:</p>
<ul>
<li>Payment Gateways</li>
<li>Hosting Providers</li>
<li>Domain Registrars</li>
<li>Cloud Providers</li>
<li>Email Services</li>
<li>SMS Services</li>
<li>WhatsApp Services</li>
<li>AI Providers</li>
<li>Social Media Platforms</li>
<li>CRM Services</li>
<li>ERP Services</li>
<li>Marketing Platforms</li>
<li>Authentication Providers</li>
</ul>
<p>Each provider operates under its own privacy practices.</p>

<h2>10. Data Sharing</h2>
<p>We do not sell personal information. Information may be shared only when necessary with:</p>
<ul>
<li>Payment Processors</li>
<li>Hosting Providers</li>
<li>Domain Registrars</li>
<li>Cloud Providers</li>
<li>Legal Authorities</li>
<li>Professional Advisors</li>
<li>Service Providers</li>
<li>Contractors working under confidentiality obligations</li>
</ul>

<h2>11. International Data Transfers</h2>
<p>Your information may be processed or stored in countries other than your own where our service providers operate. We take reasonable measures to safeguard personal data during such transfers.</p>

<h2>12. Data Retention</h2>
<p>We retain information only as long as reasonably necessary to:</p>
<ul>
<li>Deliver services</li>
<li>Maintain project history</li>
<li>Meet contractual obligations</li>
<li>Comply with legal requirements</li>
<li>Resolve disputes</li>
<li>Enforce agreements</li>
</ul>
<p>After the applicable retention period, data may be securely deleted or anonymized.</p>

<h2>13. Security</h2>
<p>We implement commercially reasonable safeguards, including:</p>
<ul>
<li>HTTPS Encryption</li>
<li>Secure Authentication</li>
<li>Password Hashing</li>
<li>Role-Based Access Control</li>
<li>Server Security</li>
<li>Database Security</li>
<li>Firewall Protection</li>
<li>Monitoring</li>
<li>Audit Logs</li>
<li>Backup Procedures</li>
<li>Access Controls</li>
</ul>
<p>While we strive to protect your information, no system can guarantee absolute security.</p>

<h2>14. Your Rights</h2>
<p>Subject to applicable law, you may have the right to:</p>
<ul>
<li>Access your personal data</li>
<li>Correct inaccurate information</li>
<li>Request deletion</li>
<li>Restrict processing</li>
<li>Object to processing</li>
<li>Withdraw consent where processing is based on consent</li>
<li>Request a copy of your data (where applicable)</li>
</ul>
<p>Requests may be subject to identity verification.</p>

<h2>15. Children's Privacy</h2>
<p>Wall-V is not intended for children under the age required by applicable law. We do not knowingly collect personal information from children.</p>

<h2>16. Client Dashboard</h2>
<p>Registered users can access a secure dashboard to:</p>
<ul>
<li>Track projects</li>
<li>View milestones</li>
<li>Review invoices</li>
<li>Upload files</li>
<li>Communicate with AI assistants</li>
<li>Receive updates</li>
<li>Access purchased products</li>
<li>Download digital assets</li>
<li>Manage hosting services</li>
<li>Manage domains</li>
<li>View subscriptions</li>
</ul>
<p>Users are responsible for maintaining the confidentiality of their account credentials.</p>

<h2>17. User-Generated Content</h2>
<p>Users retain ownership of content they submit. By uploading content necessary for service delivery, you grant Wall-V a limited, non-exclusive license to process, store, and use that content solely for providing requested services.</p>

<h2>18. Automated Communications</h2>
<p>Wall-V may send:</p>
<ul>
<li>Order Updates</li>
<li>Project Notifications</li>
<li>AI Notifications</li>
<li>Security Alerts</li>
<li>Billing Notices</li>
<li>System Messages</li>
<li>Marketing Communications (where permitted or with consent)</li>
</ul>
<p>You may opt out of promotional communications while continuing to receive essential service-related messages.</p>

<h2>19. Changes to this Privacy Policy</h2>
<p>We may update this Privacy Policy from time to time. Updated versions become effective when published on this website. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>

<h2>20. Contact Information</h2>
<p>If you have questions regarding this Privacy Policy, please contact:</p>
<p><strong>Wall-V</strong><br>Operator: Valeed Naeem</p>
<p>Website: <a href="https://www.wall-v.com">https://www.wall-v.com</a><br>Email: <a href="mailto:info@wall-v.com">info@wall-v.com</a><br>Business Address: 1692, B Block, Master City Housing Society, Near Peoples Colony, Gujranwala, Pakistan</p>

<h2>21. Consent</h2>
<p>By accessing or using Wall-V, creating an account, communicating with our AI assistants, purchasing services or products, or using any of our websites, dashboards, applications, or related services, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>`;

async function updatePrivacyPolicy() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { dbName: "wallvnext" });
  console.log("Connected.\n");

  const { default: LegalPage } = await import("../models/legal-page");
  const { default: LegalVersion } = await import("../models/legal-version");

  const page = await LegalPage.findOne({ slug: "privacy" });
  if (!page) {
    console.log("Privacy Policy page not found. Run seed-legal.ts first.");
    await mongoose.disconnect();
    return;
  }

  const oldContent = page.content;
  page.content = privacyContent;
  page.version = "2.0";
  page.status = "published";
  page.isActive = true;
  page.seo = {
    metaTitle: "Privacy Policy | Wall-V",
    metaDescription: "Privacy Policy for Wall-V - How we collect, use, and protect your information.",
    robots: "index, follow",
    ogTitle: "Privacy Policy | Wall-V",
    ogDescription: "Privacy Policy for Wall-V - How we collect, use, and protect your information.",
    twitterCard: "summary_large_image",
    twitterTitle: "Privacy Policy | Wall-V",
    twitterDescription: "Privacy Policy for Wall-V - How we collect, use, and protect your information.",
  };
  await page.save();

  await LegalVersion.create({
    legalPage: page._id,
    version: "2.0",
    content: privacyContent,
    title: "Privacy Policy",
    changeNote: "Updated with full privacy policy content",
    snapshot: { seo: page.seo, type: page.type, slug: page.slug },
  });

  console.log("Privacy Policy updated successfully!");
  console.log("  - Slug: privacy");
  console.log("  - Version: 2.0");
  console.log("  - Status: published");
  console.log("  - Content length:", privacyContent.length, "characters");

  await mongoose.disconnect();
}

updatePrivacyPolicy().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

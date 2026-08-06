import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";

const pages = [
  {
    slug: "terms",
    title: "Terms & Conditions",
    type: "terms",
    version: "3.0",
    content: `<h2>1. Acceptance of Terms</h2>
<p>By accessing and using Wall-V's services, you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, please do not use our services.</p>

<h2>2. Services Description</h2>
<p>Wall-V provides AI-powered software development, web and mobile application development, hosting services, digital product sales, and consulting services. We reserve the right to modify, suspend, or discontinue any service at any time.</p>

<h2>3. Domain Registration Services</h2>
<p>Wall-V acts as an authorized reseller for domain registration services through PKNIC (Pakistan Network Information Center) and other domain registries. By registering a domain through Wall-V, you acknowledge and agree to the following:</p>

<h3>3.1 PKNIC Domain Registration (.pk domains)</h3>
<p>Domain registrations under the .pk TLD are governed by PKNIC policies and procedures. Key terms include:</p>
<ul>
<li><strong>Pre-payment Required</strong>: Funds must be available in your Wall-V account before domain registration can be processed.</li>
<li><strong>Billing Cycle</strong>: PKNIC domains are billed biennially (2-year terms). Maximum registration period is 10 years.</li>
<li><strong>Pricing</strong>: Current PKNIC pricing is Rs. 2,100/year for Pakistan-based registrants and $15.99/year for international registrants. Prices are subject to change by PKNIC without notice.</li>
<li><strong>No Refunds</strong>: PKNIC does not provide refunds after payment has been processed for domain registration.</li>
</ul>

<h3>3.2 Domain Name Rules</h3>
<ul>
<li>Domain names cannot be modified after registration. To change a domain name, you must cancel the existing registration and register a new one.</li>
<li>You are solely responsible for ensuring that your domain name registration does not infringe upon the rights of any third party.</li>
<li>Wall-V reserves the right to refuse or cancel domain registrations that violate these terms or applicable laws.</li>
<li>Domain names that are prohibited or reserved for technical, ethical, or national considerations cannot be registered.</li>
</ul>

<h3>3.3 Registrant Responsibilities</h3>
<ul>
<li>You must provide accurate and current contact information during registration.</li>
<li>You are responsible for maintaining the accuracy of your registration information.</li>
<li>You must ensure your account has sufficient funds for domain renewals before the expiration date.</li>
<li>Wall-V is not responsible for domain expiration due to insufficient funds or failure to renew.</li>
</ul>

<h3>3.4 Domain Transfer and Cancellation</h3>
<ul>
<li>Domain registrations are non-transferable between registrars.</li>
<li>To transfer a domain away from PKNIC, you must follow PKNIC's transfer procedures.</li>
<li>Cancellation requests must be submitted through your Wall-V account dashboard.</li>
<li>No refunds are provided for cancelled domains unless required by applicable law.</li>
</ul>

<h3>3.5 Limitation of Liability for Domain Services</h3>
<p>Wall-V acts as an intermediary between you and domain registries. We are not responsible for:</p>
<ul>
<li>Domain registration failures or delays caused by registries</li>
<li>Disputes over domain name ownership</li>
<li>Registry-imposed fees or price changes</li>
<li>Loss of domain registration due to registry actions or policies</li>
<li>Technical issues with DNS propagation or domain resolution</li>
</ul>

<h2>4. User Accounts</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

<h2>5. Payment &amp; Billing</h2>
<p>All payments are processed through our secure payment partners. Prices are subject to change with 30 days' notice. Refunds are subject to our Refund Policy. Late payments may incur a 1.5% monthly fee.</p>

<h2>6. Intellectual Property</h2>
<p>All content, trademarks, and intellectual property on this website are owned by Wall-V or its licensors. Custom development work ownership is transferred upon full payment as specified in individual project agreements.</p>

<h2>7. Limitation of Liability</h2>
<p>Wall-V shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.</p>

<h2>8. Indemnification</h2>
<p>You agree to indemnify and hold Wall-V harmless from any claims, losses, or damages, including legal fees, resulting from your use of our services or violation of these terms.</p>

<h2>9. Termination</h2>
<p>Either party may terminate this agreement with 30 days' written notice. We reserve the right to immediately terminate accounts that violate these terms.</p>

<h2>10. Governing Law</h2>
<p>These terms are governed by the laws of Pakistan. Any disputes shall be resolved in the courts of Karachi, Pakistan.</p>

<h2>11. Contact</h2>
<p>For questions about these terms, contact us at legal@wall-v.com.</p>`,
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    type: "disclaimer",
    version: "3.0",
    content: `<h2>General Information Disclaimer</h2>
<p>The information provided on Wall-V's website, applications, and services is for general informational purposes only. All information is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on our services.</p>

<h2>AI-Generated Content Disclaimer</h2>
<p>Wall-V provides AI-powered tools and services that generate content, code, recommendations, and decisions. AI-generated content may contain errors, inaccuracies, or inconsistencies. Users should not rely solely on AI-generated output for critical decisions without human verification and professional review.</p>

<h2>AI Hallucination Disclaimer</h2>
<p>Our AI systems may occasionally produce outputs that are factually incorrect, fabricated, or not based on real data — commonly known as "hallucinations." Users are strongly advised to independently verify all AI-generated information before relying on it for any purpose. Wall-V does not accept responsibility for decisions made based on hallucinated or inaccurate AI output.</p>

<h2>Domain Registration Disclaimer</h2>
<p>Wall-V provides domain registration services as an authorized reseller through PKNIC and other domain registries. By using our domain registration services, you acknowledge and agree to the following:</p>

<h3>3.1 PKNIC Domain Registration</h3>
<ul>
<li><strong>No Control Over Registry Policies</strong>: PKNIC reserves the right to modify domain registration policies, pricing, and procedures at any time without prior notice. Wall-V has no control over these changes.</li>
<li><strong>Registration Delays</strong>: Domain registration times vary and are not guaranteed. Propagation times depend on DNS servers and registry processes beyond Wall-V's control.</li>
<li><strong>Price Increases</strong>: PKNIC has implemented fee increases of approximately 30% every two years. Further increases may occur without notice. Wall-V is not responsible for registry-imposed price changes.</li>
<li><strong>No Refund Guarantee</strong>: PKNIC does not provide refunds after payment has been processed. Wall-V cannot guarantee refunds for domain registrations once submitted to the registry.</li>
</ul>

<h3>3.2 Domain Name Disputes</h3>
<ul>
<li>Wall-V is not responsible for domain name disputes between third parties.</li>
<li>You are solely responsible for ensuring your domain registration does not infringe upon trademarks or other intellectual property rights.</li>
<li>Domain disputes are subject to the registry's dispute resolution policies (e.g., PKNIC's dispute resolution procedures).</li>
<li>Wall-V may be required to comply with court orders or registry decisions regarding domain registration or transfer.</li>
</ul>

<h3>3.3 DNS and Technical Limitations</h3>
<ul>
<li>DNS propagation times vary and are not guaranteed by Wall-V.</li>
<li>Domain availability checks are performed in real-time but may not reflect immediate changes in the registry database.</li>
<li>Wall-V is not responsible for DNS outages, propagation delays, or technical issues beyond our control.</li>
<li>Domain parking, forwarding, or redirection services are provided on an "as-is" basis without warranty.</li>
</ul>

<h3>3.4 Registrant Responsibilities</h3>
<ul>
<li>You are responsible for maintaining accurate contact information in your domain registration.</li>
<li>You must ensure sufficient funds are available in your Wall-V account before domain registration or renewal.</li>
<li>Wall-V is not liable for domain expiration due to insufficient funds or failure to renew.</li>
<li>Domain registrations cannot be modified after submission to the registry. To change a domain name, you must cancel and re-register.</li>
</ul>

<h3>3.5 Limitation of Liability</h3>
<p>Wall-V acts solely as an intermediary between you and domain registries. We are not responsible for:</p>
<ul>
<li>Domain registration failures, rejections, or delays caused by registries</li>
<li>Disputes over domain name ownership or trademark infringement</li>
<li>Registry-imposed fees, penalties, or price increases</li>
<li>Loss of domain registration due to registry actions, policies, or disputes</li>
<li>Technical issues with DNS propagation or domain resolution</li>
<li>Suspension or cancellation of domain registration by the registry</li>
</ul>

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

<h2>Limitation of Liability</h2>
<p>In no event shall Wall-V, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or in connection with your use of our services, whether based on warranty, contract, tort, or any other legal theory.</p>

<h2>Third-Party Integrations Disclaimer</h2>
<p>Our services may integrate with or contain links to third-party services, products, or content. We do not endorse, guarantee, or assume responsibility for any third-party content, products, or services. Your use of third-party services is at your own risk and subject to their respective terms.</p>

<h2>User Responsibility</h2>
<p>Users are solely responsible for their use of our services, including ensuring that their use complies with applicable laws and regulations. Users are responsible for backing up their data and verifying the accuracy of any output generated by our services.</p>

<h2>Software Bugs and Technical Failures</h2>
<p>Like all software, our applications and services may contain bugs or defects. While we work to ensure quality, we do not warrant that our services will be error-free or that all bugs will be corrected promptly. Users should maintain appropriate backups and disaster recovery plans.</p>

<h2>Force Majeure</h2>
<p>Wall-V shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to natural disasters, pandemics, war, government actions, power failures, or internet outages.</p>

<h2>Updates to This Disclaimer</h2>
<p>We reserve the right to update this disclaimer at any time. Continued use of our services after changes constitutes acceptance of the updated disclaimer.</p>

<h2>Contact</h2>
<p>For questions about this disclaimer, contact us at legal@wall-v.com.</p>`,
  },
  {
    slug: "refund",
    title: "Refund Policy",
    type: "refund",
    version: "2.0",
    content: `<h2>1. General Refund Policy</h2>
<p>Wall-V is committed to customer satisfaction. This Refund Policy outlines the conditions under which refunds may be issued for our products and services.</p>

<h2>2. AI Agents &amp; SaaS Subscriptions</h2>
<p>AI agent subscriptions may be cancelled within 14 days of purchase for a full refund if the service has not been substantially used. After 14 days, refunds are prorated based on remaining subscription time. Setup fees are non-refundable.</p>

<h2>3. Custom Software Development</h2>
<p>For custom development projects, payments are tied to milestones. If a project is cancelled before completion, work completed up to that point is billed. Advance payments for unstarted work are fully refundable within 14 days of payment.</p>

<h2>4. Website &amp; Mobile App Development</h2>
<p>Website and mobile app development projects follow milestone-based billing. Cancellation after project commencement refunds amounts for undelivered milestones only. A cancellation fee of 15% may apply.</p>

<h2>5. Hosting Services</h2>
<p>Hosting fees are refundable within 30 days of purchase or renewal. After 30 days, hosting fees are non-refundable. Domain registration fees are never refundable.</p>

<h2>6. Digital Products &amp; Templates</h2>
<p>Digital products and templates may be refunded within 14 days of purchase if they are defective or not as described. Downloaded products that are functioning as described are non-refundable.</p>

<h2>7. Consulting Services</h2>
<p>Consulting session fees are refundable if cancelled more than 48 hours before the scheduled session. Cancellations within 48 hours receive a 50% refund or rescheduling option.</p>

<h2>8. Maintenance &amp; Support Plans</h2>
<p>Monthly maintenance plans may be cancelled at any time with 30 days' notice. Prepaid annual plans are refundable on a prorated basis minus a 10% administrative fee.</p>

<h2>9. Design Services</h2>
<p>Design service refunds depend on project stage. Before concept delivery: full refund. After concept approval: 50% refund. After final delivery: no refund unless work is defective.</p>

<h2>10. How to Request a Refund</h2>
<p>Contact us at refunds@wall-v.com with your order number and reason for refund. Processing takes 5-10 business days. Refunds are issued to the original payment method.</p>

<h2>11. Exceptions</h2>
<p>Refunds may be denied for abuse of this policy, violation of our Terms &amp; Conditions, or circumstances beyond our control. We reserve the right to make final decisions on refund eligibility.</p>`,
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    type: "cookie",
    version: "2.0",
    content: `<h2>What Are Cookies</h2>
<p>Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.</p>

<h2>Strictly Necessary Cookies</h2>
<p>These cookies are essential for the website to function properly. They enable core functionality such as security, session management, and accessibility. You cannot opt out of these cookies as the website cannot function properly without them.</p>
<ul>
<li><strong>session_id:</strong> Maintains your session state across page requests. Provider: Wall-V. Duration: Session.</li>
<li><strong>csrf_token:</strong> Protects against cross-site request forgery attacks. Provider: Wall-V. Duration: Session.</li>
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
<p>For questions about our cookie practices, contact us at privacy@wall-v.com.</p>`,
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    type: "accessibility",
    version: "2.0",
    content: `<h2>Our Commitment</h2>
<p>Wall-V is committed to making our website and services accessible to everyone, including people with disabilities. We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.</p>

<h2>Accessibility Features</h2>
<p>Our website includes the following accessibility features:</p>
<ul>
<li>Semantic HTML structure with proper heading hierarchy</li>
<li>Keyboard navigation support for all interactive elements</li>
<li>ARIA labels and roles for screen reader compatibility</li>
<li>Sufficient color contrast ratios for text readability</li>
<li>Alt text for all meaningful images</li>
<li>Focus indicators for keyboard navigation</li>
<li>Responsive design that works across all device sizes</li>
<li>Text resizing support without loss of functionality</li>
</ul>

<h2>AI-Powered Accessibility</h2>
<p>Our AI tools are designed to assist all users. Voice and chat interfaces provide alternative interaction methods for users who may have difficulty with traditional interfaces.</p>

<h2>Known Limitations</h2>
<p>While we strive for full accessibility, we are aware of some limitations:</p>
<ul>
<li>Some older content may not fully meet WCAG 2.1 AA standards</li>
<li>Third-party embedded content may not be fully accessible</li>
<li>Some complex interactive features may have limited screen reader support</li>
</ul>

<h2>Feedback</h2>
<p>We welcome your feedback on the accessibility of our services. If you encounter accessibility barriers, please contact us at accessibility@wall-v.com. We aim to respond to accessibility feedback within 5 business days.</p>

<h2>Compatibility</h2>
<p>We aim to support the following browsers and assistive technologies:</p>
<ul>
<li>Chrome, Firefox, Safari, and Edge (latest two versions)</li>
<li>JAWS, NVDA, and VoiceOver screen readers</li>
<li>Keyboard-only navigation</li>
<li>Zoom up to 200% without loss of content</li>
</ul>

<h2>Continuous Improvement</h2>
<p>We are continuously working to improve the accessibility of our services. We regularly audit our website and update our accessibility practices.</p>

<h2>Contact</h2>
<p>For accessibility-related inquiries, contact us at accessibility@wall-v.com.</p>`,
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    type: "acceptable-use",
    version: "2.0",
    content: `<h2>1. Introduction</h2>
<p>This Acceptable Use Policy ("AUP") governs your use of Wall-V's services, including our website, AI tools, APIs, hosting, and all related platforms. By using our services, you agree to comply with this policy.</p>

<h2>2. Prohibited Activities</h2>
<p>You may not use our services to:</p>
<ul>
<li>Violate any applicable law, regulation, or third-party rights</li>
<li>Send spam, chain letters, pyramid schemes, or other unsolicited communications</li>
<li>Transmit malware, viruses, worms, or other harmful code</li>
<li>Attempt to gain unauthorized access to any system, network, or account</li>
<li>Interfere with or disrupt the integrity or performance of our services</li>
<li>Engage in denial-of-service attacks or similar abusive behavior</li>
<li>Scrape, crawl, or use automated tools to access our services without permission</li>
<li>Impersonate any person or entity, or misrepresent your affiliation</li>
<li>Collect or harvest personal information of others without consent</li>
</ul>

<h2>3. AI Services Acceptable Use</h2>
<p>When using our AI tools and services, you additionally agree to:</p>
<ul>
<li>Not use AI outputs to create harmful, misleading, or fraudulent content</li>
<li>Not attempt to extract or reverse-engineer our AI models or algorithms</li>
<li>Not use our AI services to generate content that violates intellectual property rights</li>
<li>Not use AI-generated content to impersonate real individuals or organizations</li>
<li>Not overload our AI services with excessive or malicious requests</li>
<li>Verify AI outputs before using them for critical decisions</li>
</ul>

<h2>4. Content Standards</h2>
<p>Content you create, store, or transmit through our services must not:</p>
<ul>
<li>Contain illegal, obscene, defamatory, or threatening material</li>
<li>Infringe on intellectual property rights of others</li>
<li>Contain malware or harmful code</li>
<li>Be misleading, deceptive, or fraudulent</li>
<li>Violate privacy rights of others</li>
</ul>

<h2>5. API Usage</h2>
<p>If you access our APIs:</p>
<ul>
<li>Comply with rate limits and usage quotas</li>
<li>Do not share API keys with unauthorized parties</li>
<li>Implement proper authentication and error handling</li>
<li>Do not cache or store API responses beyond reasonable limits</li>
</ul>

<h2>6. Enforcement</h2>
<p>We reserve the right to investigate and take appropriate action against anyone who violates this policy, including but not limited to suspending or terminating access to our services.</p>

<h2>7. Reporting Violations</h2>
<p>To report a violation of this policy, contact us at abuse@wall-v.com.</p>

<h2>8. Updates</h2>
<p>We may update this policy from time to time. Continued use of our services constitutes acceptance of the updated policy.</p>`,
  },
  {
    slug: "ai-usage",
    title: "AI Usage & Limitations",
    type: "ai-usage",
    version: "2.0",
    content: `<h2>1. AI Services Overview</h2>
<p>Wall-V provides AI-powered tools and services including chatbots, voice agents, content generation, code assistance, and automation features. These services use artificial intelligence to help you accomplish tasks more efficiently.</p>

<h2>2. How Our AI Works</h2>
<p>Our AI systems use machine learning models trained on large datasets to generate responses, recommendations, and content. These models identify patterns and generate outputs based on the input they receive.</p>

<h2>3. AI Capabilities</h2>
<p>Our AI services can help with:</p>
<ul>
<li>Project discovery and requirements gathering</li>
<li>Website and application planning</li>
<li>Content writing and editing</li>
<li>Code generation and review</li>
<li>Data analysis and insights</li>
<li>Customer support and communication</li>
<li>Task automation and workflow optimization</li>
</ul>

<h2>4. Known Limitations</h2>
<p>AI technology has inherent limitations you should be aware of:</p>
<ul>
<li><strong>Accuracy:</strong> AI may produce incorrect or outdated information. Always verify critical information.</li>
<li><strong>Hallucinations:</strong> AI may generate content that appears factual but is actually fabricated.</li>
<li><strong>Bias:</strong> AI systems may reflect biases present in their training data.</li>
<li><strong>Context:</strong> AI may misunderstand nuance, context, or cultural references.</li>
<li><strong>Timeliness:</strong> AI knowledge has a cutoff date and may not reflect recent events.</li>
<li><strong>Creativity:</strong> While AI can generate creative content, it may lack genuine originality.</li>
</ul>

<h2>5. User Responsibilities</h2>
<p>When using our AI services, you are responsible for:</p>
<ul>
<li>Reviewing and verifying all AI-generated output before use</li>
<li>Ensuring AI-generated content complies with applicable laws</li>
<li>Not relying solely on AI for critical business decisions</li>
<li>Understanding that AI is a tool to assist, not replace, human judgment</li>
</ul>

<h2>6. Prohibited Uses</h2>
<p>You may not use our AI services to:</p>
<ul>
<li>Generate misleading or deceptive content</li>
<li>Impersonate real individuals or organizations</li>
<li>Create content that violates intellectual property rights</li>
<li>Engage in harassment, hate speech, or discrimination</li>
<li>Attempt to extract or reverse-engineer our AI models</li>
</ul>

<h2>7. Data and Privacy</h2>
<p>AI interactions may be processed and stored to improve service quality. See our Privacy Policy for details on how we handle your data.</p>

<h2>8. Service Availability</h2>
<p>AI services may experience downtime for maintenance, updates, or due to technical issues. We do not guarantee 100% uptime for AI-powered features.</p>

<h2>9. Updates to AI Features</h2>
<p>We continuously improve our AI services. Features may be added, modified, or removed without prior notice. We will make reasonable efforts to communicate significant changes.</p>

<h2>10. Contact</h2>
<p>For questions about our AI services and their limitations, contact us at ai-support@wall-v.com.</p>`,
  },
  {
    slug: "data-processing",
    title: "Data Processing & Security",
    type: "data-processing",
    version: "2.0",
    content: `<h2>1. Data Processing Overview</h2>
<p>This policy describes how Wall-V collects, processes, stores, and protects your data when you use our services. We are committed to implementing industry-standard security measures to protect your information.</p>

<h2>2. Data Collection</h2>
<p>We collect data necessary to provide our services, including:</p>
<ul>
<li>Account information (name, email, phone)</li>
<li>Payment and billing information</li>
<li>Project specifications and requirements</li>
<li>Communication records</li>
<li>Usage analytics and performance data</li>
</ul>

<h2>3. Data Processing Methods</h2>
<p>Your data is processed using:</p>
<ul>
<li>Automated systems for service delivery</li>
<li>AI tools for content generation and analysis</li>
<li>Analytics tools for service improvement</li>
<li>Security monitoring for threat detection</li>
</ul>

<h2>4. Data Storage</h2>
<p>Data is stored on secure servers with the following protections:</p>
<ul>
<li>AES-256 encryption at rest</li>
<li>TLS 1.3 encryption in transit</li>
<li>Regular automated backups</li>
<li>Geographic redundancy</li>
<li>Access controls and authentication</li>
</ul>

<h2>5. Security Measures</h2>
<p>We implement comprehensive security including:</p>
<ul>
<li>Multi-factor authentication for admin access</li>
<li>Regular security audits and penetration testing</li>
<li>Employee security training</li>
<li>Incident response procedures</li>
<li>Vendor security assessments</li>
</ul>

<h2>6. Data Retention</h2>
<p>Data is retained as follows:</p>
<ul>
<li>Account data: Until account deletion plus 30 days</li>
<li>Project data: 2 years after project completion</li>
<li>Communication records: 1 year</li>
<li>Payment records: 7 years (legal requirement)</li>
<li>Analytics data: 26 months (anonymized)</li>
</ul>

<h2>7. Data Sharing</h2>
<p>Data may be shared with:</p>
<ul>
<li>Service providers who assist in operations</li>
<li>Payment processors for transaction handling</li>
<li>Analytics partners for service improvement</li>
<li>Law enforcement when legally required</li>
</ul>

<h2>8. Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access your personal data</li>
<li>Correct inaccurate data</li>
<li>Request data deletion</li>
<li>Export your data</li>
<li>Object to data processing</li>
</ul>

<h2>9. Breach Notification</h2>
<p>In the event of a data breach, we will notify affected users within 72 hours and provide information about the breach and steps being taken.</p>

<h2>10. Contact</h2>
<p>For data processing and security inquiries, contact us at security@wall-v.com.</p>`,
  },
  {
    slug: "copyright",
    title: "Copyright & IP Policy",
    type: "copyright",
    version: "2.0",
    content: `<h2>1. Copyright Ownership</h2>
<p>All content on Wall-V's website, applications, and services — including text, graphics, logos, icons, images, audio clips, video clips, data compilations, software, and code — is the property of Wall-V or its content suppliers and is protected by international copyright laws.</p>

<h2>2. Trademarks</h2>
<p>The Wall-V name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Wall-V or its affiliates. You may not use these marks without our prior written permission.</p>

<h2>3. Licensed Content</h2>
<p>Some content may be provided under open-source licenses. Such content is subject to its respective license terms, which are available upon request or in the applicable software documentation.</p>

<h2>4. User-Generated Content</h2>
<p>Users retain ownership of content they create and submit to our services. By submitting content, you grant Wall-V a limited, non-exclusive license to process, store, and use that content solely for providing requested services.</p>

<h2>5. Custom Development Work</h2>
<p>Intellectual property rights for custom development work are transferred to the client upon full payment as specified in individual project agreements. Wall-V retains the right to use general knowledge, skills, and non-proprietary techniques.</p>

<h2>6. AI-Generated Content</h2>
<p>Content generated by our AI tools based on user inputs is owned by the user, subject to the terms of the applicable service agreement. Wall-V does not claim ownership over AI-generated outputs.</p>

<h2>7. DMCA Policy</h2>
<p>If you believe that content on our services infringes your copyright, please send a DMCA takedown notice to legal@wall-v.com with:</p>
<ul>
<li>Description of the copyrighted work</li>
<li>Location of the infringing material</li>
<li>Your contact information</li>
<li>Statement of good faith belief</li>
<li>Statement of accuracy under penalty of perjury</li>
</ul>

<h2>8. Open Source</h2>
<p>Some components of our services may use open-source software. Such software is subject to its respective license terms, which are available upon request or in the applicable software documentation.</p>

<h2>9. Infringement Claims</h2>
<p>We will investigate all legitimate claims of copyright infringement and take appropriate action, including removing or disabling access to infringing material.</p>

<h2>10. Contact</h2>
<p>For IP-related inquiries, contact us at legal@wall-v.com.</p>`,
  },
  {
    slug: "legal-notices",
    title: "Contact & Legal Notices",
    type: "contact-legal",
    version: "2.0",
    content: `<h2>Company Information</h2>
<p><strong>Wall-V</strong> — AI-Powered Digital Agency</p>
<p>Operator: Valeed Naeem</p>
<p>Business Address: 1692, B Block, Master City Housing Society, Near Peoples Colony, Gujranwala, Pakistan</p>

<h2>Contact Information</h2>
<ul>
<li><strong>General Inquiries:</strong> info@wall-v.com</li>
<li><strong>Support:</strong> support@wall-v.com</li>
<li><strong>Sales:</strong> sales@wall-v.com</li>
<li><strong>Legal Department:</strong> legal@wall-v.com</li>
<li><strong>Privacy Matters:</strong> privacy@wall-v.com</li>
<li><strong>Billing:</strong> billing@wall-v.com</li>
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
<p>Our Terms &amp; Conditions, Privacy Policy, and other legal pages constitute the entire agreement between you and Wall-V regarding our services.</p>

<h2>Waiver</h2>
<p>Failure to enforce any provision of our terms does not constitute a waiver of that provision or any other provision.</p>

<h2>Assignment</h2>
<p>You may not assign your rights or obligations under these terms without our written consent. We may assign our rights and obligations without restriction.</p>

<h2>Modifications</h2>
<p>We reserve the right to modify these legal pages at any time. Changes take effect upon posting to our website. Your continued use of our services constitutes acceptance of any changes.</p>

<h2>Contact</h2>
<p>If you have any questions about our legal notices, please contact us at legal@wall-v.com.</p>`,
  },
  {
    slug: "copyright",
    title: "Copyright & IP Policy",
    type: "copyright",
    version: "2.0",
    content: `<h2>1. Copyright Ownership</h2>
<p>All content on Wall-V's website, applications, and services — including text, graphics, logos, icons, images, audio clips, video clips, data compilations, software, and code — is the property of Wall-V or its content suppliers and is protected by international copyright laws.</p>

<h2>2. Trademarks</h2>
<p>The Wall-V name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Wall-V or its affiliates. You may not use these marks without our prior written permission.</p>

<h2>3. Licensed Content</h2>
<p>Some content may be provided under open-source licenses. Such content is subject to its respective license terms, which are available upon request or in the applicable software documentation.</p>

<h2>4. User-Generated Content</h2>
<p>Users retain ownership of content they create and submit to our services. By submitting content, you grant Wall-V a limited, non-exclusive license to process, store, and use that content solely for providing requested services.</p>

<h2>5. Custom Development Work</h2>
<p>Intellectual property rights for custom development work are transferred to the client upon full payment as specified in individual project agreements. Wall-V retains the right to use general knowledge, skills, and non-proprietary techniques.</p>

<h2>6. AI-Generated Content</h2>
<p>Content generated by our AI tools based on user inputs is owned by the user, subject to the terms of the applicable service agreement. Wall-V does not claim ownership over AI-generated outputs.</p>

<h2>7. DMCA Policy</h2>
<p>If you believe that content on our services infringes your copyright, please send a DMCA takedown notice to legal@wall-v.com with:</p>
<ul>
<li>Description of the copyrighted work</li>
<li>Location of the infringing material</li>
<li>Your contact information</li>
<li>Statement of good faith belief</li>
<li>Statement of accuracy under penalty of perjury</li>
</ul>

<h2>8. Infringement Claims</h2>
<p>We will investigate all legitimate claims of copyright infringement and take appropriate action, including removing or disabling access to infringing material.</p>

<h2>9. Contact</h2>
<p>For IP-related inquiries, contact us at legal@wall-v.com.</p>`,
  },
];

async function seedAllLegalPages() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { dbName: "wallvnext" });
  console.log("Connected.\n");

  const { default: LegalPage } = await import("../models/legal-page");
  const { default: LegalVersion } = await import("../models/legal-version");

  let updated = 0;
  let skipped = 0;

  for (const page of pages) {
    const existing = await LegalPage.findOne({ slug: page.slug });
    if (!existing) {
      console.log(`  [SKIP] ${page.slug} — not found in DB`);
      skipped++;
      continue;
    }

    const contentChanged = existing.content !== page.content;
    if (!contentChanged) {
      console.log(`  [SKIP] ${page.slug} — content unchanged`);
      skipped++;
      continue;
    }

    const parts = existing.version.split(".").map(Number);
    const newVersion = `${parts[0] + 1}.0`;

    await LegalPage.findOneAndUpdate(
      { slug: page.slug },
      {
        content: page.content,
        version: newVersion,
        status: "published",
        isActive: true,
        updatedAt: new Date(),
      }
    );

    await LegalVersion.create({
      legalPage: existing._id,
      version: newVersion,
      content: page.content,
      title: page.title,
      changeNote: `Seeded with full ${page.title} content`,
      snapshot: { seo: existing.seo, type: existing.type, slug: existing.slug },
    });

    console.log(`  [UPDATED] ${page.slug} → v${newVersion}`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seedAllLegalPages().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

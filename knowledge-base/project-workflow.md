# Project Workflow

## Overview

The Wall-V platform manages the complete client lifecycle from initial visitor engagement through ongoing maintenance. The workflow is designed to be AI-assisted at every stage, reducing manual effort and improving consistency.

## Lifecycle Stages

```
Visitor -> AI Assistant -> Requirement Discovery -> Lead -> CRM -> Proposal -> Demo -> Approval -> Payment -> Development -> Testing -> Deployment -> Maintenance
```

### 1. Visitor Lands on Website

- Public pages are served via the `(website)` route group
- SEO-optimized with dynamic metadata, JSON-LD structured data, and sitemap
- Entry points include home, blog, products, services, and pricing pages

### 2. AI Assistant Engages

- Voice or chat widget activates on the site
- Dograh voice agent handles real-time voice conversations
- OpenAI-powered chatbot handles text-based conversations
- Initial qualification questions are asked
- Visitor intent is captured and categorized

### 3. Requirement Discovery (11-Stage Conversation)

The AI assistant guides the visitor through a structured discovery process:

1. **Project Type** - Website, Mobile App, E-Commerce, CRM, AI Chatbot, AI Voice Agent
2. **Business Goals** - What the client wants to achieve
3. **Target Audience** - Who the product is for
4. **Feature Requirements** - Core features and functionality
5. **Design Preferences** - Visual style, branding, references
6. **Technical Requirements** - Integrations, platforms, constraints
7. **Timeline** - Expected delivery dates
8. **Budget Range** - Investment expectations
9. **Existing Assets** - Current websites, apps, or systems
10. **Competitor Analysis** - Market positioning
11. **Success Metrics** - How success will be measured

### 4. Lead Created in CRM

- Discovery responses are structured and stored
- Lead scoring is applied based on:
  - Budget alignment
  - Timeline urgency
  - Project complexity
  - Decision-maker status
- Lead is assigned a status: new, qualified, proposal-sent, negotiation, won, lost

### 5. Proposal Generated

- AI generates a detailed proposal based on discovery data
- Includes scope, timeline, pricing, and terms
- Pricing is calculated using the project type and feature set
- Proposal is formatted as a professional document
- Sent to the client via email or client portal

### 6. Demo Generated

- AI HTML pages are created to demonstrate the proposed solution
- Visual mockups of key pages and features
- Interactive prototypes where applicable
- Client can review and provide feedback

### 7. Client Approval

- Client reviews proposal and demo
- Feedback is captured and incorporated
- Revisions are made if needed
- Final approval is recorded in the system

### 8. Payment Processing

- Invoice is generated based on approved proposal
- Payment is collected via the configured gateway:
  - **2Checkout** - Fully implemented with buy links, HMAC verification, and IPN webhooks
  - **Stripe** - Stub, configured and ready for activation
  - **PayPal** - Stub, configured and ready for activation
- Payment status is tracked in the CRM
- Receipts are sent via email

### 9. Development with Milestones

- Project is broken into milestones based on project type
- Each milestone has a deliverable, timeline, and payment trigger
- Progress is tracked in the dashboard
- Client receives updates at each milestone completion

### 10. Testing and QA

- Functional testing against requirements
- Cross-browser and cross-device testing
- Performance optimization
- Security review
- Client user acceptance testing (UAT)

### 11. Deployment to Production

- Code is deployed to production environment
- Domain and DNS configuration
- SSL certificate setup
- Monitoring and alerting configured
- Client handoff and training

### 12. Ongoing Maintenance and Support

- Bug fixes and patches
- Security updates
- Performance monitoring
- Feature enhancements
- Support tickets via CRM

---

## Milestone Structure by Project Type

### Website

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Discovery | 15% | Requirements gathering, sitemap, wireframes |
| Design | 20% | UI/UX design, branding, mockups |
| Development | 35% | Frontend and backend implementation |
| Content / SEO | 15% | Content creation, SEO optimization, copywriting |
| Testing / Launch | 15% | QA, bug fixes, deployment, go-live |

### Mobile App

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Discovery / Design | 20% | Requirements, wireframes, UI/UX design |
| Core Development | 40% | App development, core features |
| Integration / Testing | 25% | API integrations, testing, performance |
| Launch | 15% | App store submission, deployment |

### E-Commerce

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Discovery / Design | 15% | Requirements, catalog structure, design |
| Store Setup | 25% | Product setup, categories, inventory |
| Payment / Checkout | 25% | Payment gateway, checkout flow, shipping |
| Features / SEO | 20% | Custom features, SEO, marketing tools |
| Testing / Launch | 15% | QA, load testing, deployment |

### CRM

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Requirements / Design | 15% | Workflow mapping, data model, UI design |
| Core Build | 35% | Core CRM features, data management |
| Integrations | 25% | Third-party integrations, API connections |
| Training / Launch | 25% | User training, data migration, go-live |

### AI Chatbot

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Discovery / Training | 20% | Use case definition, training data prep |
| Bot Development | 35% | Conversation flows, AI model training |
| Integration | 25% | Website integration, API connections |
| Optimization / Launch | 20% | Performance tuning, analytics setup, go-live |

### AI Voice Agent

| Milestone | Percentage | Description |
|-----------|------------|-------------|
| Discovery / Design | 15% | Voice UX design, conversation mapping |
| Agent Development | 35% | Voice agent setup, prompt engineering |
| Integration / Testing | 25% | Phone/SIP integration, testing |
| Optimization / Launch | 20% | Voice quality tuning, analytics, go-live |

# Agent System Prompts and Instructions

## Voice Agent System Prompt

### Greeting

The voice agent opens every conversation with:

> "Welcome to Wall-V! I'm your AI assistant. How can I help you today?"

### Information Collection

The agent collects 7 data points during conversation:

| Field | Description |
|-------|-------------|
| Full Name | Caller's complete name |
| Email | Contact email address |
| Phone | Phone number |
| Company | Company or organization name |
| Project Type | Nature of the project (website, app, ERP, etc.) |
| Budget Range | Estimated budget bracket |
| Timeline | Desired completion date |

### Personalization

- Use the caller's name 1-2 times throughout the conversation
- Integrate names naturally rather than forcing them into every sentence
- Example: "That sounds great, Sarah. Let me walk you through our options."

### Capabilities

- Guide callers to relevant pages on the Wall-V website
- Explain available services and pricing tiers
- Share specific pricing when asked
- Help callers initiate a project engagement

### Behavior

- Friendly, warm, and professional tone
- Keep responses to 2-3 sentences maximum for voice delivery
- Speak naturally without robotic phrasing
- Avoid jargon unless the caller uses it first

### Summary Protocol

Before ending the conversation, summarize all collected details:

- Confirm name, email, phone, and company
- Restate the project type and budget discussed
- Verify timeline expectations
- Ask if anything needs correction

---

## Sales Chat Agent

### Multi-Stage Discovery

The sales chat agent follows an 11-stage discovery process:

1. **Initial Greeting** -- Welcome and identify the visitor
2. **Need Identification** -- Understand what the visitor is looking for
3. **Service Matching** -- Map needs to Wall-V service offerings
4. **Budget Discovery** -- Determine budget range
5. **Timeline Assessment** -- Establish project timeline
6. **Decision Maker** -- Identify who makes purchasing decisions
7. **Competition Check** -- Learn if they are evaluating alternatives
8. **Objection Handling** -- Address concerns and hesitations
9. **Proposal Generation** -- Create a tailored proposal
10. **Call to Action** -- Guide toward the next step
11. **Follow-Up Scheduling** -- Set up follow-up contact

### Budget Detection

The agent detects budget signals from conversation context:

- Direct statements ("Our budget is $10,000")
- Comparative references ("We used to pay $500/month")
- Constraint language ("We need something under $5,000")

### Service Matching

Based on detected needs and budget, the agent recommends:

- Starter websites for basic needs and lower budgets
- Professional websites for growing businesses
- Enterprise solutions for complex requirements
- Mobile apps when cross-platform or native presence is needed
- ERP/CRM systems for operational management

### Demo Generation

When requirements are sufficient, the agent generates:

- A live demo link with pre-populated content
- A summary of recommended features
- A preliminary cost estimate

### CRM Integration

The agent creates an inquiry record containing:

- Visitor contact information
- Stated requirements and preferences
- Budget and timeline details
- Recommended service tier
- Next steps and follow-up date

### Language Support

The sales chat agent supports 13 languages:

English, Urdu, Arabic, French, Spanish, German, Turkish, Bahasa Indonesia, Bahasa Malay, Portuguese, Italian, Dutch, and Chinese.

---

## Project Discovery Engine

### Overview

The Project Discovery Engine is a comprehensive conversation system spanning 1076+ lines of logic. It guides prospects from initial interest through detailed requirement gathering to a final solution recommendation.

### Service Knowledge Base

The engine maintains a complete service catalog with:

- Service descriptions and use cases
- Pricing tiers and included features
- Add-on options and custom pricing rules
- Delivery timelines per service type

### Feature Detection

The engine detects 21 distinct feature categories:

- Authentication and user management
- Payment processing and subscriptions
- Content management systems
- E-commerce functionality
- Booking and scheduling
- Multi-language support
- Analytics and reporting
- Third-party integrations
- Mobile responsiveness
- Accessibility compliance
- And 12 additional categories

### Budget Range Estimation

Based on detected features and requirements, the engine estimates:

- Minimum viable budget for core features
- Recommended budget for full feature set
- Premium budget for advanced integrations and scale

### Timeline Calculation

Timeline estimates factor in:

- Number of detected features
- Complexity of integrations
- Design requirements
- Testing and QA needs
- Client review cycles

### Risk Assessment

The engine evaluates project risks:

- Scope creep potential
- Integration complexity
- Timeline feasibility
- Budget alignment
- Technical debt concerns

### Solution Recommendation

Final output includes:

- Recommended service tier
- Feature priority list
- Estimated timeline and cost
- Risk mitigation suggestions
- Next steps for engagement

---

## Content Writer Agent

### Blog Post Generation

The content writer produces blog posts with:

- SEO-optimized headlines and subheadings
- Structured formatting with headers and lists
- Internal and external link suggestions
- Meta descriptions and title tags
- Call-to-action placement

### Product Descriptions

Product content includes:

- Feature highlights with benefit framing
- Specification tables
- Comparison language for competitive positioning
- Social proof integration points
- Purchase funnel alignment

### SEO Content

SEO-focused writing covers:

- Keyword research integration
- On-page optimization (headers, meta, alt text)
- Content length and depth calibration
- Schema markup suggestions
- Internal linking strategy

### Social Media Content

Social content includes:

- Platform-specific formatting (LinkedIn, Twitter, Facebook)
- Hashtag research and suggestions
- Engagement-driven copywriting
- Content calendar alignment
- Brand voice consistency

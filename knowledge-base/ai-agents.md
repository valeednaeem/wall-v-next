# AI Agents - Wall-V Platform

## Overview

Wall-V provides six specialized AI agent types within the chat interface, each designed for specific use cases. These agents work together through a shared discovery engine to deliver intelligent, context-aware interactions across the platform.

---

## Agent Types

### 1. General Assistant

- General-purpose AI agent for any question or task
- Handles broad inquiries about Wall-V services, capabilities, and general topics
- Routes complex queries to specialized agents when needed
- Maintains conversation context across multiple turns

### 2. Project Discovery

- Multi-stage conversational agent for requirements gathering
- Guides users through a structured discovery process
- Extracts project goals, scope, budget, and timeline
- Generates project briefs from conversation data
- Converts qualified conversations into CRM inquiries

### 3. Sales Agent

- Sales-focused agent leveraging the discovery engine
- Identifies buying signals and qualifies leads
- Recommends Wall-V services based on detected needs
- Generates service estimates and demos
- Manages follow-up sequences

### 4. Support Agent

- Customer support agent for existing clients
- Handles technical support inquiries
- Troubleshoots platform issues
- Escalates complex issues to human agents
- Tracks support ticket status

### 5. Content Writer

- Content generation agent for marketing and documentation
- Produces blog posts, product descriptions, and web copy
- Adapts tone and style based on brand guidelines
- Supports SEO optimization
- Generates content in multiple languages

### 6. Technical Assistant

- Technical consulting agent for architecture and implementation
- Provides code-level guidance and best practices
- Recommends technology stacks
- Analyzes technical requirements
- Supports integration planning

---

## Discovery Engine

The discovery engine is the core conversational framework powering the Project Discovery and Sales agents. It follows a structured 11-stage process to gather requirements and convert conversations into actionable inquiries.

### Stages

| Stage | Name | Description |
|-------|------|-------------|
| 1 | `greeting` | Initial greeting and welcome message |
| 2 | `identify-intent` | Determine the user's primary intent |
| 3 | `understand-goal` | Understand the user's project goals |
| 4 | `discover-requirements` | Gather detailed functional requirements |
| 5 | `identify-scope` | Determine project scope and complexity |
| 6 | `budget-timeline` | Discuss budget range and timeline expectations |
| 7 | `recommend-solution` | Recommend Wall-V services matching needs |
| 8 | `generate-brief` | Generate a comprehensive project summary |
| 9 | `user-confirmation` | Confirm the generated brief with the user |
| 10 | `create-inquiry` | Save the conversation as a CRM inquiry |
| 11 | `completed` | Conversation complete |

### Stage Transitions

```
greeting -> identify-intent -> understand-goal -> discover-requirements
    -> identify-scope -> budget-timeline -> recommend-solution
    -> generate-brief -> user-confirmation -> create-inquiry -> completed
```

---

## Supported Languages

The AI agents support 13 languages for multilingual interactions:

| Language | Code |
|----------|------|
| English | `en` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Arabic | `ar` |
| Chinese | `zh` |
| Japanese | `ja` |
| Korean | `ko` |
| Portuguese | `pt` |
| Russian | `ru` |
| Hindi | `hi` |
| Turkish | `tr` |
| Urdu | `ur` |

Language detection is automatic based on user input. The system maintains conversation context in the detected language.

---

## Project Type Detection

The discovery engine can detect and classify the following project types from conversation context:

| Category | Types |
|----------|-------|
| Web | `website`, `web-application`, `redesign` |
| Mobile | `mobile-app` |
| E-commerce | `ecommerce` |
| Software | `saas`, `crm`, `erp` |
| AI | `ai-integration` |
| Infrastructure | `hosting`, `domain` |
| Digital | `digital-product` |
| Marketing | `seo-marketing` |
| Services | `consulting`, `other` |

---

## Detectable Features

The discovery engine can identify 21 feature types from user requirements:

| Feature | Description |
|---------|-------------|
| User Authentication | Login, registration, role-based access |
| Payment Processing | Stripe, PayPal, 2Checkout integration |
| E-commerce | Product catalogs, carts, checkout |
| Booking System | Scheduling, reservations, calendar |
| Messaging | Real-time chat, direct messages |
| Notifications | Push, email, in-app alerts |
| Dashboards | Analytics panels, admin interfaces |
| Search | Full-text search, filtering |
| File Uploads | Document and media handling |
| User Roles | Permissions, access control |
| AI Features | Machine learning, automation |
| API Integration | Third-party API connections |
| Multi-Language | Localization, internationalization |
| Responsive Design | Mobile-first, cross-device |
| SEO | Search engine optimization |
| Social Media Integration | Social login, sharing |
| Email Integration | SMTP, transactional email |
| Maps | Location services, geolocation |
| Reporting | Data visualization, exports |
| Real-time Updates | WebSockets, live data |
| Offline Support | Service workers, caching |

---

## Architecture

```
+------------------+     +------------------+     +------------------+
|   Chat Widget    | --> |   AI Gateway     | --> |  Agent Router    |
+------------------+     +------------------+     +------------------+
                                                          |
                         +------------------+     +------------------+
                         | Discovery Engine | <-- |   Agent Pool     |
                         +------------------+     +------------------+
                                |
                         +------------------+
                         |  CRM Integration |
                         +------------------+
```

### Component Interaction

1. User initiates chat via the floating widget
2. AI Gateway authenticates and routes the request
3. Agent Router selects the appropriate agent
4. Discovery Engine processes conversation through stages
5. Results are stored in CRM as inquiries

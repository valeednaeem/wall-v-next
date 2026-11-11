# Chat Agent - Sales Chatbot

## Overview

The Wall-V Sales Chat Agent is a floating widget deployed on all public pages. It provides AI-powered project discovery, service recommendation, and CRM integration through a multi-stage conversational interface.

---

## Features

- Floating widget with position control (bottom-left or bottom-right)
- AI-powered project discovery with 11 conversation stages
- Budget detection and parsing from natural language
- Service recommendation based on detected requirements
- Demo generation from conversation context
- Automatic CRM inquiry creation
- 13 language support with auto-detection
- Timezone-based auto-detection for scheduling

---

## Chat Agent Tiers

### Basic - $2,499

| Feature | Included |
|---------|----------|
| Architecture | Rule-based + AI hybrid |
| Knowledge Base | FAQ training |
| Widget | Yes |
| Analytics | Basic |
| Multi-Language | No |
| CRM Integration | No |
| Custom Workflows | No |
| Support Level | Email |

### Professional - $4,999

| Feature | Included |
|---------|----------|
| Architecture | RAG (Retrieval-Augmented Generation) |
| Knowledge Base | Custom knowledge base |
| Widget | Yes |
| Analytics | Advanced |
| Multi-Language | Yes (13 languages) |
| CRM Integration | Yes |
| Custom Workflows | No |
| Support Level | Priority email + chat |

### Enterprise - $9,999

| Feature | Included |
|---------|----------|
| Architecture | Fine-tuned LLM |
| Knowledge Base | Custom knowledge base |
| Widget | Yes |
| Analytics | Advanced + custom reports |
| Multi-Language | Yes (13 languages) |
| CRM Integration | Yes (multi-system) |
| Custom Workflows | Yes (human-in-the-loop) |
| Support Level | Dedicated account manager |

---

## Components

### SalesChatbot

Main chatbot component managing the overall conversation state and UI rendering.

```
<SalesChatbot position="bottom-right" theme="light" />
```

Props:

| Prop | Type | Description |
|------|------|-------------|
| `position` | `bottom-left \| bottom-right` | Widget position on viewport |
| `theme` | `light \| dark` | Color scheme |

### ChatInterface

Renders the conversation messages, input field, and quick replies. Manages message history and streaming responses.

### FloatingVoiceWidget

Optional voice input component integrated into the chat interface. Enables voice-to-text for hands-free interaction.

---

## Discovery Process

The chat agent follows the same 11-stage discovery engine as the AI agents:

1. **greeting** - Initial greeting and welcome
2. **identify-intent** - Determine user intent
3. **understand-goal** - Understand project goals
4. **discover-requirements** - Gather functional requirements
5. **identify-scope** - Determine project scope
6. **budget-timeline** - Discuss budget and timeline
7. **recommend-solution** - Recommend Wall-V services
8. **generate-brief** - Generate project summary
9. **user-confirmation** - Confirm brief with user
10. **create-inquiry** - Save as CRM inquiry
11. **completed** - Conversation complete

---

## Budget Detection

The chat agent parses budget information from natural language input:

| Input Pattern | Detected Value |
|---------------|----------------|
| "around 10k" | $10,000 |
| "budget is $25,000" | $25,000 |
| "50k to 75k" | $50,000 - $75,000 |
| "less than 5k" | Under $5,000 |
| "enterprise budget" | $50,000+ |

Budget ranges are mapped to service tiers for recommendation accuracy.

---

## Service Recommendation

Based on detected requirements and budget, the agent recommends:

| Service | Trigger |
|---------|---------|
| Website Development | Static or informational site needs |
| Web Application | Interactive application requirements |
| E-commerce | Product catalog and checkout needs |
| Mobile App | iOS/Android application requirements |
| AI Integration | Machine learning or automation needs |
| CRM/ERP | Business process management |
| Hosting | Infrastructure and deployment |
| SEO/Marketing | Digital marketing requirements |
| Consulting | Technical guidance and strategy |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Send message and receive AI response |
| `/api/ai/discover` | POST | Process discovery stage transitions |
| `/api/ai/inquiry` | POST | Create CRM inquiry from conversation |
| `/api/ai/demo` | POST | Generate project demo |
| `/api/ai/create-project` | POST | Create project record from inquiry |
| `/api/ai/estimate` | POST | Generate cost estimate |

### Request/Response Format

**POST /api/ai/chat**

```json
{
  "message": "I need an e-commerce site",
  "conversationId": "abc123",
  "language": "en"
}
```

Response:

```json
{
  "reply": "Great! I'd love to help with your e-commerce project...",
  "stage": "understand-goal",
  "context": {
    "projectType": "ecommerce",
    "detectedFeatures": ["payment-processing", "user-authentication"]
  }
}
```

---

## AI Providers

| Provider | Model | Usage |
|----------|-------|-------|
| OpenAI | `gpt-4o-mini` | General chat and conversation |
| Anthropic | `claude-sonnet-4-20250514` | Technical content and analysis |

### Provider Selection

- OpenAI handles general conversation, discovery, and response generation
- Anthropic handles technical requirements analysis, architecture recommendations, and code-related content

---

## Language Support

| Language | Code | Auto-Detection |
|----------|------|----------------|
| English | `en` | Yes |
| Spanish | `es` | Yes |
| French | `fr` | Yes |
| German | `de` | Yes |
| Arabic | `ar` | Yes |
| Chinese | `zh` | Yes |
| Japanese | `ja` | Yes |
| Korean | `ko` | Yes |
| Portuguese | `pt` | Yes |
| Russian | `ru` | Yes |
| Hindi | `hi` | Yes |
| Turkish | `tr` | Yes |
| Urdu | `ur` | Yes |

---

## Timezone Detection

The chat agent auto-detects the user's timezone from the browser:

- Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Maps timezone to business hours for scheduling
- Stores timezone with inquiry for follow-up coordination
- Adjusts recommended meeting times accordingly

---

## Widget Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for widget initialization |
| `OPENAI_API_KEY` | Yes | OpenAI API key for chat |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for technical content |

### Widget Placement

Add the widget to any page:

```tsx
import { SalesChatbot } from "@/components/ai/SalesChatbot";

export default function Page() {
  return (
    <>
      {/* Page content */}
      <SalesChatbot position="bottom-right" />
    </>
  );
}
```

---

## Analytics and Tracking

The chat agent tracks:

- Conversation count and completion rate
- Average conversation duration
- Stage progression and drop-off points
- Budget ranges detected
- Project types identified
- Inquiry conversion rate
- Language distribution

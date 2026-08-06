# Voice Agent - Dograh Integration

## Overview

Wall-V integrates Dograh, a Docker-based voice AI platform, to provide intelligent voice agent capabilities. The voice agent enables phone-based interactions with AI-powered call handling, transcription, and CRM integration.

---

## Architecture

```
+------------------+     +------------------+     +------------------+
|  Browser Widget  | --> |  Dograh Server   | --> |   Wall-V API     |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|  Floating Panel  |     |  Voice Engine    |     |   CRM Backend    |
+------------------+     +------------------+     +------------------+
```

### Data Flow

1. Browser loads Dograh widget script
2. Widget establishes connection to Dograh server
3. Dograh server processes voice via speech-to-text and LLM
4. Wall-V API receives webhooks for call events
5. Call data and transcripts stored in CRM

---

## Widget Components

### Floating Voice Widget

- Attaches to bottom-left or bottom-right of the viewport
- Click-to-call interface
- Call status indicator
- Position configurable via component props

### Inline Voice Panel

- Embedded within page layouts
- Suitable for dedicated contact pages
- Customizable dimensions and styling
- Full call controls within the panel

### Headless Mode

- Provides hooks and state management only
- No default UI rendering
- Enables fully custom voice interfaces
- Useful for branded implementations

---

## Call Lifecycle

Voice calls follow a defined state machine:

```
idle -> connecting -> connected -> failed
                \-> idle (timeout)
                        \-> idle (user hangup)
```

| State | Description |
|-------|-------------|
| `idle` | No active call |
| `connecting` | Establishing connection to Dograh |
| `connected` | Active call in progress |
| `failed` | Connection failed or call dropped |

### Call Duration Tracking

- Timer starts on `connected` state
- Timer pauses on `failed` or disconnect
- Duration logged to billing and analytics
- Displayed in call history

---

## Pre-Call Client Details

Before initiating a call, the widget collects:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Caller's full name |
| Email | Yes | Caller's email address |
| Phone | Yes | Caller's phone number |

Details are stored and associated with the call record for CRM purposes.

---

## Post-Call Demo Generation

After a call completes, the system can generate a project demo:

1. Call transcript is processed
2. Requirements are extracted from conversation
3. Wall-V services are matched to requirements
4. A demo project summary is generated
5. Demo is stored and can be sent to the caller

---

## Webhook Events

Wall-V receives the following webhook events from Dograh:

| Endpoint | Event | Description |
|----------|-------|-------------|
| `/api/voice-agent/call-ended` | Call completion | Stores transcript and call data |
| `/api/voice-agent/pre-call` | Pre-call setup | Validates caller and prepares session |
| `/api/voice-agent/generate-demo` | Post-call | Generates project demo from transcript |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice-agent/billing` | GET | Retrieve billing and usage data |
| `/api/voice-agent/call-ended` | POST | Handle call completion webhook |
| `/api/voice-agent/check-account` | GET | Verify Dograh account status |
| `/api/voice-agent/pre-call` | POST | Initialize pre-call session |
| `/api/voice-agent/generate-demo` | POST | Generate demo from transcript |

---

## Billing Tracking

The system tracks:

- Total call minutes per account
- Call count by date range
- Cost per minute by tier
- Monthly usage summaries
- Overage charges

---

## Voice Agent Tiers

### Starter - $3,999

| Feature | Included |
|---------|----------|
| Agent Count | Single agent |
| Phone Answering | Yes |
| Basic Routing | Yes |
| Transcripts | Yes |
| CRM Integration | No |
| Appointment Booking | No |
| Custom Voice | No |
| Support Level | Email |

### Professional - $7,999

| Feature | Included |
|---------|----------|
| Agent Count | Multi-agent |
| Phone Answering | Yes |
| Basic Routing | Yes |
| Transcripts | Yes |
| CRM Integration | Yes |
| Appointment Booking | Yes |
| Call Analytics | Yes |
| Support Level | Priority email + chat |

### Enterprise - $14,999

| Feature | Included |
|---------|----------|
| Agent Count | Unlimited |
| Phone Answering | Yes |
| Basic Routing | Yes |
| Transcripts | Yes |
| CRM Integration | Yes |
| Appointment Booking | Yes |
| Call Analytics | Yes |
| Custom Voice Cloning | Yes |
| Multi-Language | Yes |
| Complex Workflows | Yes |
| API Access | Yes |
| Support Level | Dedicated account manager |

---

## Setup

### Prerequisites

- Docker and Docker Compose installed
- Port 3010 available for Dograh dashboard
- Port 8000 available for Dograh API

### Installation

1. Start the Dograh services:

```bash
docker compose -f docker-compose.sip.yaml up -d
```

2. Open the Dograh dashboard at `http://localhost:3010`
3. Create a new agent in the dashboard
4. Navigate to Agent Settings > "Add to website"
5. Copy the widget script URL

### Configuration

Update the following environment variables in `.env.local`:

```
NEXT_PUBLIC_DOGRAH_WIDGET_URL=<widget-script-url>
DOGRAH_API_URL=http://localhost:3010
DOGRAH_API_KEY=<optional-api-key>
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DOGRAH_WIDGET_URL` | Yes | Widget script URL from Dograh dashboard |
| `DOGRAH_API_URL` | Yes | Dograh dashboard and API base URL |
| `DOGRAH_API_KEY` | No | API key for server-side management |

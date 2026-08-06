# Integrations

## Payment Gateways

### 2Checkout

**Status:** Fully Implemented

- Buy link generation for one-time and recurring payments
- HMAC signature verification for request integrity
- IPN (Instant Payment Notification) webhooks for order status updates
- Environment variables: `TWOCHECKOUT_MERCHANT_CODE`, `TWOCHECKOUT_SECRET_KEY`, `TWOCHECKOUT_BUY_LINK_SECRET`
- API routes: `/api/payments/2checkout/*`

### Stripe

**Status:** Stub (Ready for activation)

- Content Security Policy configured for Stripe domains
- Environment variables prepared: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Implementation pending activation

### PayPal

**Status:** Stub (Ready for activation)

- Environment variables prepared: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`
- Implementation pending activation

---

## AI Services

### OpenAI

**Model:** gpt-4o-mini

- Powers the AI chatbot for real-time conversation
- Drives the 11-stage requirement discovery process
- Handles visitor qualification and intent capture
- Environment variable: `OPENAI_API_KEY`

### Anthropic

**Model:** claude-sonnet-4-20250514

- Generates technical content and blog posts
- SEO content optimization
- Long-form document generation
- Environment variable: `ANTHROPIC_API_KEY`

---

## Voice AI

### Dograh

**Status:** Full Integration

- Docker-based voice AI platform
- Real-time voice conversations with visitors
- Webhook endpoints for call events and transcripts
- Widget integration via `NEXT_PUBLIC_DOGRAH_WIDGET_URL`

**Components:**

- `useDograh` hook for React integration
- `FloatingVoiceWidget` for floating voice button
- `InlineVoicePanel` for embedded voice interface

**API Endpoints:**

- `/api/voice/*` - Voice agent management
- `/api/webhooks/dograh` - Webhook receiver

**Environment Variables:**

- `NEXT_PUBLIC_DOGRAH_WIDGET_URL` - Widget script URL
- `DOGRAH_API_URL` - Dograh API base URL (default: `http://localhost:3010`)
- `DOGRAH_API_KEY` - API authentication key (optional)

---

## OAuth Providers

All OAuth providers are conditionally loaded - only initialized if environment variables are set.

| Provider | Environment Variables |
|----------|----------------------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |

---

## Email

### Nodemailer (SMTP)

- Transactional email sending
- Password reset emails
- Proposal and invoice delivery
- Notification emails
- Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Analytics

### Vercel Analytics

- Traffic monitoring
- Page view tracking
- User behavior insights

### Vercel Speed Insights

- Core Web Vitals tracking
- Performance metrics
- LCP, FID, CLS monitoring

---

## Hosting Providers

### Vercel (Frontend)

- Automatic deployment from GitHub `master` branch
- Serverless functions for API routes
- Edge middleware for request handling
- Built-in CDN and SSL

### MongoDB Atlas (Database)

- Cloud-hosted MongoDB cluster
- Connection via `MONGODB_URI` environment variable
- Default: `mongodb://localhost:27017/wallvnext` (local development)

### Reseller Panel (RSP)

**Status:** Stub

- Hosting management for client projects
- Environment variables prepared for activation

---

## Domain Providers

### PKNIC

**Status:** Stub

- Domain registration for `.pk` TLD
- DNS management
- Environment variables prepared for activation

---

## Backend Proxy

The Next.js middleware (`src/middleware.ts`) proxies API requests to a separate backend server:

- **Proxy prefix:** `/api/backend/*`
- **Target:** `BACKEND_URL` (default: `http://localhost:8080`)
- **Purpose:** Backend-for-Frontend (BFF) pattern

Additional API routes are also proxied based on configuration.

---

## CORS Configuration

Allowed origins for cross-origin requests:

| Origin | Purpose |
|--------|---------|
| dograh.vercel.app | Dograh voice platform |
| app.dograh.com | Dograh application |
| api.dograh.com | Dograh API |
| www.wall-v.com | Production site |
| wall-v.com | Production site (bare) |
| localhost:3000 | Local development |

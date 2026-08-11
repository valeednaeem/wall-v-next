# Software Architecture Guide

> Wall-V Architecture Patterns and Design Decisions

---

## Current Architecture

### Stack Overview
```
Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS
Backend: Next.js API Routes (Serverless)
Database: MongoDB + Mongoose
Auth: NextAuth v5 + Custom JWT
AI: OpenAI (GPT-4o-mini, GPT-4o, gpt-image-2) + Anthropic (Claude)
Payments: 2Checkout
Voice: Dograh
Deployment: Vercel
```

### Architecture Pattern
**Modular Monolith** with clear separation:
- `/app` - Routes and pages
- `/components` - Reusable UI components
- `/lib` - Core business logic
- `/models` - Database schemas
- `/services` - External integrations
- `/api` - API endpoints

---

## Design Principles

### 1. Component-Based UI
- Reusable React components
- Atomic design where appropriate
- Tailwind CSS for styling
- No component libraries (raw HTML/styled)

### 2. API-First Design
- RESTful API endpoints
- Consistent response format
- Authentication on all endpoints
- Input validation with Zod

### 3. Service Layer Pattern
- AI services (OpenAI, Anthropic)
- Payment services (2Checkout)
- Email services (Nodemailer)
- External APIs (ResellersPanel, WebSouls)

### 4. Repository Pattern (via Mongoose)
- Models define schema
- Controllers handle requests
- Services contain business logic

---

## Data Flow Patterns

### Client Request Flow
```
Client → Next.js Middleware → API Route → Auth Check
→ Service/Model → Database → Response → Client
```

### AI Request Flow
```
User Input → Chat Interface → AI API Route
→ Prompt Construction → OpenAI/Anthropic
→ Response Processing → Display to User
```

### Payment Flow
```
Checkout → 2Checkout → Payment Processing
→ Webhook → Verification → Order Update
→ Project Update → Email Notification
```

---

## Scalability Considerations

### Current Scale
- Single Vercel deployment
- MongoDB Atlas cluster
- In-memory rate limiting

### Scaling Path
1. **Vertical**: Upgrade Vercel plan, MongoDB tier
2. **Horizontal**: Add edge functions, read replicas
3. **Distributed**: Microservices extraction

### Bottlenecks
- MongoDB connection limits
- Vercel function duration (30s)
- AI API rate limits
- In-memory rate limiting (not shared)

---

## Security Architecture

### Authentication Layers
1. NextAuth v5 (frontend sessions)
2. Custom JWT (API authentication)
3. Cookie-based tokens (legacy)

### Authorization
- Role-based access control (RBAC)
- Admin/Manager/Customer roles
- Resource-level permissions

### Data Protection
- TLS in transit
- MongoDB encryption at rest
- bcrypt for passwords
- Environment variables for secrets

---

## Integration Architecture

### External Services
```
┌─────────────────────────────────────────┐
│              Wall-V Platform            │
├─────────────────────────────────────────┤
│  AI: OpenAI + Anthropic                │
│  Voice: Dograh                         │
│  Payments: 2Checkout                   │
│  Email: Gmail SMTP                     │
│  Domains: ResellersPanel + WebSouls    │
│  Database: MongoDB Atlas               │
│  Auth: Google + GitHub OAuth           │
└─────────────────────────────────────────┘
```

### Webhook Handling
- Dograh: Voice call events
- 2Checkout: Payment events
- Future: Social media, analytics

---

## Performance Architecture

### Caching Strategy
- Static pages: ISR
- API responses: Not cached (dynamic)
- Database: Query optimization
- CDN: Vercel Edge Network

### Optimization
- Image optimization (next/image)
- Code splitting (dynamic imports)
- Font optimization
- Bundle analysis

---

## Future Architecture Considerations

### Microservices Candidates
- AI service (rate limiting, cost tracking)
- Payment service (multi-provider)
- Notification service (email, SMS, push)
- Analytics service

### Event-Driven Architecture
- Project status changes
- Payment events
- User actions
- System events

### Multi-Tenant Support
- Client isolation
- Data separation
- Resource limits
- Billing integration

---

## Architecture Decision Records

### ADR-001: Use Next.js App Router
- **Decision**: Use App Router over Pages Router
- **Rationale**: Server components, streaming, better DX
- **Status**: Accepted

### ADR-002: MongoDB over PostgreSQL
- **Decision**: Use MongoDB with Mongoose
- **Rationale**: Flexible schema, rapid development, Atlas managed
- **Status**: Accepted

### ADR-003: Dual Auth System
- **Decision**: NextAuth + Custom JWT
- **Rationale**: NextAuth for frontend, JWT for API routes
- **Status**: Accepted (technical debt to consolidate)

### ADR-004: Tailwind CSS over Component Libraries
- **Decision**: Raw HTML/styled components with Tailwind
- **Rationale**: Full control, no library bloat, consistent design
- **Status**: Accepted

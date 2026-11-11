# Technologies

## Core Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.3.4 | React framework, App Router, API routes, middleware |
| React | 19 | UI library |
| TypeScript | 5.8 (strict) | Type safety, static analysis |
| Tailwind CSS | 4.1 | Utility-first styling, CSS-based config via `@theme` |

## Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | - | Primary database |
| Mongoose | 9.7.4 | ODM, schema validation, query building |

- **43 Mongoose models** in `src/models/`
- Connection singleton in `src/lib/mongodb.ts` uses `global.mongooseCache` for hot-reload survival
- Default connection: `mongodb://localhost:27017/wallvnext`

## Authentication

| Technology | Purpose |
|------------|---------|
| NextAuth v5 | JWT-based session auth for dashboard pages |
| bcryptjs | Password hashing |
| jsonwebtoken | Custom JWT token creation and verification |

### Dual Auth System

- **NextAuth v5** (`src/lib/auth.ts`) - JWT strategy, used by dashboard pages via `useSession()`
- **Custom cookie JWT** - Used by most API routes, cookie name: `token`
  - `getAuthUser()`, `getFullUser()`, `requireAuth()`, `requireRole()` helper functions

## UI Components

| Technology | Purpose |
|------------|---------|
| lucide-react | Icon library |
| framer-motion | Animations and transitions |
| recharts | Chart and data visualization |
| TipTap | Rich text editor |
| sonner | Toast notifications |
| next-themes | Dark/light theme switching |

## Forms and Validation

| Technology | Purpose |
|------------|---------|
| react-hook-form | Form state management and validation |
| Zod 4 | Schema validation (schemas in `src/lib/validations/`) |
| @hookform/resolvers | Zod-to-React Hook Form integration |

## Email

| Technology | Purpose |
|------------|---------|
| Nodemailer | SMTP email sending |

## Analytics

| Technology | Purpose |
|------------|---------|
| Vercel Analytics | Traffic and usage analytics |
| Vercel Speed Insights | Core Web Vitals and performance metrics |

## Security

| Technology | Purpose |
|------------|---------|
| DOMPurify | HTML sanitization for user-generated content |
| CSRF protection | Cross-site request forgery prevention |
| Rate limiting | API abuse prevention |

## AI Services

| Technology | Model | Purpose |
|------------|-------|---------|
| OpenAI | gpt-4o-mini | Chatbot conversation, requirement discovery |
| Anthropic | claude-sonnet-4-20250514 | Technical content, blog generation, SEO |

## Voice AI

| Technology | Purpose |
|------------|---------|
| Dograh | Docker-based voice AI platform |

- Dashboard: http://localhost:3010
- API: http://localhost:8000
- Components: `useDograh` hook, `FloatingVoiceWidget`, `InlineVoicePanel`

## Payments

| Technology | Status | Purpose |
|------------|--------|---------|
| 2Checkout | Implemented | Buy links, HMAC verification, IPN webhooks |
| Stripe | Stub | CSP configured, env vars ready |
| PayPal | Stub | Env vars ready |

## Deployment and Hosting

| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting, auto-deploy from GitHub master branch |
| MongoDB Atlas | Cloud database hosting |
| GitHub | Version control (`valeednaeem/wall-v-next`) |

## Domain Management

| Provider | Status | Purpose |
|----------|--------|---------|
| PKNIC | Stub | .pk domain registration and management |

## Other

| Technology | Purpose |
|------------|---------|
| Docker | Dograh voice agent containerization |
| docker-compose | Multi-container orchestration for Dograh |

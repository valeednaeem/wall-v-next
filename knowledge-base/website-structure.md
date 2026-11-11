# Website Structure

Complete routing map for the Next.js App Router application.

## Public Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/about` | About page |
| `/services` | Service catalog |
| `/products` | Product marketplace |
| `/hosting` | Hosting plans |
| `/pricing` | Pricing page |
| `/portfolio` | Portfolio showcase |
| `/blog` | Blog listing and posts |
| `/voice-agent` | Voice agent demo |
| `/contact` | Contact form |
| `/cart` | Shopping cart |
| `/checkout` | Payment checkout |
| `/client-portal/[id]` | Client portal |
| `/preview/[id]` | Project preview |
| `/sitemap` | HTML sitemap |

## Legal Pages

| Route | Description |
|-------|-------------|
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/refund` | Refund policy |
| `/cookie-policy` | Cookie policy |
| `/disclaimer` | Disclaimer |
| `/accessibility` | Accessibility statement |
| `/acceptable-use` | Acceptable use policy |
| `/ai-usage` | AI usage policy |
| `/data-processing` | Data processing agreement |
| `/copyright` | Copyright notice |
| `/legal-notices` | Legal notices |

## Auth Pages

| Route | Description |
|-------|-------------|
| `/login` | User login |
| `/signup` | User registration |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |

## Dashboard

The dashboard is a client-facing admin panel with 26+ sections. All dashboard pages are client-rendered (`"use client"`) and require authentication.

| Route | Description |
|-------|-------------|
| `/dashboard` | Dashboard home |
| `/dashboard/projects` | Project management |
| `/dashboard/blog` | Blog management |
| `/dashboard/ecommerce/products` | Product management |
| `/dashboard/crm` | CRM module |
| `/dashboard/invoices` | Invoice management |
| `/dashboard/orders` | Order management |
| `/dashboard/hosting` | Hosting management |
| `/dashboard/domains` | Domain management |
| `/dashboard/support` | Support tickets |
| `/dashboard/users` | User management |
| `/dashboard/settings` | General settings |
| `/dashboard/settings/pricing` | Pricing configuration |
| `/dashboard/marketing` | Marketing tools |
| `/dashboard/gdpr` | GDPR compliance |

Additional sections include tasks, messages, notifications, downloads, subscriptions, licenses, billing, teams, leads, clients, inquiries, and AI assistant.

## API Routes

Over 50 API endpoints organized by domain.

### Auth

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth v5 handlers |
| `/api/auth/login` | POST | Custom login |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/forgot-password` | POST | Password recovery |
| `/api/auth/reset-password` | POST | Password reset |
| `/api/auth/google` | GET | Google OAuth callback |
| `/api/auth/github` | GET | GitHub OAuth callback |
| `/api/auth/facebook` | GET | Facebook OAuth callback |
| `/api/auth/linkedin` | GET | LinkedIn OAuth callback |

### AI

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/ai/chat` | POST | AI chat assistant |
| `/api/ai/discover` | POST | AI discovery |
| `/api/ai/estimate` | POST | Cost estimation |
| `/api/ai/demo` | POST | AI demo generation |
| `/api/ai/content` | POST | Content generation |

### Blog

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/blog/posts` | GET, POST | List and create posts |
| `/api/blog/posts/[id]` | GET, PUT, DELETE | Single post CRUD |
| `/api/blog/categories` | GET, POST | Category management |
| `/api/blog/comments` | GET, POST | Comment system |

### Products

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products` | GET, POST | List and create products |
| `/api/products/[id]` | GET, PUT, DELETE | Single product CRUD |
| `/api/products/categories` | GET, POST | Product categories |

### Projects

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/projects` | GET, POST | List and create projects |
| `/api/projects/[id]` | GET, PUT, DELETE | Single project CRUD |
| `/api/projects/checkout` | POST | Project checkout |
| `/api/projects/preview` | GET | Project preview |

### Orders

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/orders` | GET, POST | List and create orders |
| `/api/orders/[id]` | GET, PUT, DELETE | Single order CRUD |

### Settings

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/settings/general` | GET, PUT | General settings |
| `/api/settings/pricing` | GET, PUT | Pricing rules |
| `/api/settings/profile` | GET, PUT | User profile |
| `/api/settings/security` | GET, PUT | Security settings |

### Voice Agent

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/voice-agent/billing` | GET | Voice billing |
| `/api/voice-agent/call-ended` | POST | Call completion webhook |
| `/api/voice-agent/generate-demo` | POST | Demo generation |

### Webhooks

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/webhooks/2checkout` | POST | 2Checkout payment webhook |
| `/api/webhooks/dograh` | POST | Dograh voice agent webhook |

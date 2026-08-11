# DevOps & Deployment Guide

> Wall-V Infrastructure, CI/CD, and Operations

---

## Infrastructure Overview

| Component | Service | Status |
|-----------|---------|--------|
| Hosting | Vercel | Active |
| Database | MongoDB Atlas | Active |
| DNS | Domain Registrar | Active |
| CDN | Vercel Edge | Active |
| Email | Gmail SMTP | Active |
| Version Control | GitHub | Active |

---

## Deployment Pipeline

```
Code Push (master)
↓
GitHub Repository
↓
Vercel Build Trigger
↓
Build & Test
↓
Deploy to Production
↓
Health Check
```

### Build Steps
1. Install dependencies (`npm ci`)
2. TypeScript compilation
3. Next.js build
4. Static optimization
5. Deploy to Edge

### Rollback Procedure
1. Identify problematic deployment
2. Vercel dashboard → Deployments
3. Find previous stable deployment
4. Click "Promote to Production"
5. Verify rollback

---

## Environment Variables

### Production (Vercel)
| Variable | Purpose | Encrypted |
|----------|---------|-----------|
| MONGODB_URI | Database connection | Yes |
| NEXTAUTH_SECRET | Auth encryption | Yes |
| OPENAI_API_KEY | AI services | Yes |
| AI_API_KEY | Anthropic AI | Yes |
| TWOCHECKOUT_MERCHANT_CODE | Payments | Yes |
| TWOCHECKOUT_SECRET_KEY | Payments | Yes |
| SMTP_* | Email service | Yes |

### Client-Side (NEXT_PUBLIC_)
| Variable | Purpose |
|----------|---------|
| NEXT_PUBLIC_APP_URL | Application URL |
| NEXT_PUBLIC_DOGRAH_WIDGET_URL | Voice agent |

---

## Monitoring

### Key Metrics
- Response time (p95 < 500ms)
- Error rate (< 1%)
- Uptime (> 99.9%)
- Core Web Vitals

### Error Tracking
- Centralized error logging (error-logger.ts)
- MongoDB ErrorLog collection
- Admin dashboard (/dashboard/errors)

### Health Checks
- API: `/api/health` (if implemented)
- Database: Connection status
- External services: Provider status

---

## Backup Strategy

### Database
- MongoDB Atlas: Automatic continuous backups
- Point-in-time recovery: 30 days
- Export: Daily to separate region

### Application
- Git repository: Full history
- Vercel: Deployment history
- Environment variables: Vercel encrypted

### Recovery Time
- Database restore: < 1 hour
- Application rollback: < 5 minutes
- Full recovery: < 2 hours

---

## Performance Optimization

### Frontend
- Image optimization (next/image)
- Code splitting (dynamic imports)
- Font optimization
- Bundle analysis

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Response caching

### Infrastructure
- Edge functions (Vercel)
- CDN caching
- Static generation where possible
- ISR for dynamic content

---

## Security Operations

### Access Control
- Vercel: Team-based access
- GitHub: Branch protection
- MongoDB: IP whitelisting
- SMTP: App-specific passwords

### Secret Rotation
- API keys: Quarterly
- Database passwords: Quarterly
- JWT secret: Annually
- SMTP password: Quarterly

---

## Troubleshooting

### Common Issues

#### Build Failures
1. Check TypeScript errors
2. Check ESLint errors
3. Check missing dependencies
4. Check environment variables

#### Runtime Errors
1. Check error logs (/dashboard/errors)
2. Check MongoDB connection
3. Check API rate limits
4. Check external service status

#### Performance Issues
1. Check Core Web Vitals
2. Check database query times
3. Check bundle size
4. Check CDN cache hit rate

---

## Cost Optimization

### Vercel
- Hobby plan: Free for personal
- Pro plan: $20/month per member
- Monitor function invocations
- Optimize build times

### MongoDB Atlas
- M10 cluster recommended
- Monitor storage usage
- Optimize queries
- Use indexes effectively

### External APIs
- Monitor OpenAI usage
- Track Anthropic usage
- Optimize AI calls
- Implement caching

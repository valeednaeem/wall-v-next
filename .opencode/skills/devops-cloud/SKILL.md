# DevOps & Cloud Skill

You are a DevOps engineer capable of managing infrastructure, CI/CD, deployment, and monitoring.

---

## DevOps Principles

1. **Infrastructure as Code**: Version-controlled infrastructure
2. **CI/CD**: Automated build, test, deploy
3. **Monitoring**: Observable systems
4. **Security**: DevSecOps practices
5. **Collaboration**: Breaking silos between dev and ops

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Build successful
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Rollback plan documented

### Deployment
- [ ] Deploy to staging first
- [ ] Smoke test critical paths
- [ ] Monitor error rates
- [ ] Deploy to production
- [ ] Verify deployment

### Post-Deployment
- [ ] Monitor logs
- [ ] Check performance metrics
- [ ] Verify user-facing features
- [ ] Notify stakeholders

---

## Vercel Deployment

### Configuration
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**": {
      "maxDuration": 30
    }
  }
}
```

### Environment Variables
- Production: Set in Vercel dashboard
- Preview: Set per-branch
- Development: `.env.local`

### Best Practices
- Use `NEXT_PUBLIC_` prefix for client-side vars
- Never commit secrets
- Use Vercel encrypted env vars
- Separate dev/staging/prod environments

---

## Docker

### Dockerfile Template (Next.js)
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose Template
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/wallv
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## GitHub Actions CI/CD

### Basic Workflow
```yaml
name: CI/CD

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Monitoring & Observability

### Three Pillars
1. **Logs**: Application events and errors
2. **Metrics**: Performance and usage data
3. **Traces**: Request flow through services

### Key Metrics to Monitor
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Throughput (requests/second)
- CPU/Memory usage
- Database query time
- Cache hit rate

### Error Tracking
- Centralized error logging (error-logger.ts)
- Stack traces
- User context
- Environment info
- Alert thresholds

---

## SSL/TLS

### Vercel Managed
- Automatic SSL for `*.vercel.app`
- Custom domains: Enable in dashboard
- Let's Encrypt certificates
- Auto-renewal

### Best Practices
- Force HTTPS
- HSTS headers
- Certificate monitoring
- Key rotation

---

## DNS

### Record Types
| Type | Purpose | Example |
|------|---------|---------|
| A | Point to IP | @ → 76.76.21.21 |
| CNAME | Point to domain | www → cname.vercel-dns.com |
| MX | Email routing | @ → mail.wall-v.com |
| TXT | Verification | @ → v=spf1 ... |

### Wall-V DNS
- Domain: wall-v.com
- Vercel: A record → 76.76.21.21
- www: CNAME → cname.vercel-dns.com
- Email: MX → mail provider

---

## Backup Strategy

### Database Backups
- MongoDB Atlas: Automatic backups
- Point-in-time recovery
- Export to S3/GCS

### Application Backups
- Git repository (GitHub)
- Environment variables (Vercel)
- Configuration files

### Recovery Plan
1. Identify failure scope
2. Restore from latest backup
3. Verify data integrity
4. Resume operations
5. Post-incident review

---

## Performance Optimization

### Frontend
- Image optimization (next/image)
- Code splitting
- Lazy loading
- Bundle analysis
- Core Web Vitals

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Caching (Redis)
- CDN for static assets

### Infrastructure
- Edge functions
- Region selection
- Auto-scaling
- Load balancing

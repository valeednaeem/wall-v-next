# Software Architecture Skill

You are a software architect capable of designing systems from simple websites to complex distributed platforms.

---

## Architecture Patterns

### Monolithic
**When to use:** Small to medium projects, MVPs, tight timelines
**Pros:** Simple deployment, easy debugging, fast development
**Cons:** Scaling limitations, technology lock-in

### Modular Monolith
**When to use:** Medium projects, need for future microservices migration
**Pros:** Clean boundaries, easier testing, simpler than microservices
**Cons:** Requires discipline, deployment coupling

### Microservices
**When to use:** Large systems, multiple teams, independent scaling needs
**Pros:** Independent deployment, technology flexibility, fault isolation
**Cons:** Operational complexity, network overhead, distributed transactions

### Serverless
**When to use:** Variable traffic, event-driven, rapid prototyping
**Pros:** Auto-scaling, pay-per-use, no infrastructure management
**Cons:** Cold starts, vendor lock-in, debugging difficulty

### Event-Driven
**When to use:** Real-time systems, decoupled components, audit requirements
**Pros:** Loose coupling, scalability, auditability
**Cons:** Eventual consistency, complexity, debugging difficulty

---

## Architecture Decision Framework

When designing a system, evaluate:

1. **Scale Requirements**
   - Concurrent users
   - Data volume
   - Traffic patterns (steady vs spiky)

2. **Team Structure**
   - Team size
   - Skill distribution
   - Communication needs

3. **Business Requirements**
   - Time to market
   - Budget constraints
   - Compliance needs

4. **Technical Requirements**
   - Latency requirements
   - Availability targets
   - Data consistency needs

5. **Operational Requirements**
   - Deployment frequency
   - Monitoring needs
   - Support model

---

## System Design Template

```markdown
# System Design: [Project Name]

## Requirements
### Functional
- User story 1
- User story 2

### Non-Functional
- Performance: < 200ms p95
- Availability: 99.9%
- Scale: 10K concurrent users

## Architecture
### High-Level
[Diagram]

### Components
1. **Frontend**: Next.js + React
2. **API**: Node.js + Express
3. **Database**: MongoDB
4. **Cache**: Redis
5. **Queue**: Bull/BullMQ

### Data Flow
1. User action
2. API request
3. Validation
4. Business logic
5. Database operation
6. Response

### Database Schema
[ER Diagram]

### API Design
[Endpoint list]

### Security
- Authentication: JWT + OAuth
- Authorization: RBAC
- Data encryption: TLS + AES

### Deployment
- Platform: Vercel/AWS
- CI/CD: GitHub Actions
- Monitoring: Datadog

### Cost Estimate
- Compute: $X/month
- Database: $X/month
- Storage: $X/month
```

---

## Design Patterns Reference

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Repository | Data access abstraction | Database models |
| Service | Business logic isolation | Service classes |
| Controller | Request handling | API routes |
| Middleware | Cross-cutting concerns | Express/Next.js middleware |
| Factory | Object creation | Service factories |
| Strategy | Algorithm selection | Payment providers |
| Observer | Event notification | Webhooks, events |
| Cache | Performance optimization | Redis, in-memory |

---

## API Design Principles

### RESTful Design
```
GET    /api/resources        - List
GET    /api/resources/:id    - Read
POST   /api/resources        - Create
PUT    /api/resources/:id    - Update
DELETE /api/resources/:id    - Delete
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
```

---

## Database Design Principles

### Schema Design
- Normalize to 3NF unless performance requires denormalization
- Use appropriate data types
- Add indexes for frequent queries
- Include timestamps (createdAt, updatedAt)
- Use soft deletes for critical data

### Indexing Strategy
- Index fields used in WHERE clauses
- Index fields used in JOINs
- Index fields used in ORDER BY
- Avoid over-indexing (write performance impact)
- Use compound indexes for multi-field queries

---

## Scalability Patterns

### Horizontal Scaling
- Stateless services
- Load balancing
- Database replication
- Cache distribution

### Vertical Scaling
- Database optimization
- Query optimization
- Connection pooling
- Resource allocation

### Caching Strategy
- Application-level caching
- Database query caching
- CDN for static assets
- Redis for session/data caching

---

## Security Architecture

### Defense in Depth
1. Network security (firewall, VPC)
2. Application security (auth, validation)
3. Data security (encryption, access control)
4. Monitoring (logging, alerting)

### Authentication Flow
```
User → Login → Validate Credentials → Generate JWT → Return Token
→ API Request + Token → Validate JWT → Check Permissions → Process Request
```

### Authorization Flow
```
Request → Extract User → Load Permissions → Check Role → Check Resource Access → Allow/Deny
```

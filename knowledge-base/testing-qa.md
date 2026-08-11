# Testing & Quality Assurance Guide

> Wall-V Testing Strategy and Best Practices

---

## Testing Philosophy

Quality is not a phase — it is a continuous practice integrated throughout development.

### Testing Pyramid

```
         /\
        /  \  E2E Tests (5%)
       /    \
      /------\  Integration Tests (15%)
     /        \
    /----------\  Unit Tests (80%)
```

---

## Framework Selection

| Framework | Use Case | Status |
|-----------|----------|--------|
| Vitest | Unit & Integration Tests | RECOMMENDED |
| Playwright | E2E Tests | RECOMMENDED |
| React Testing Library | Component Tests | RECOMMENDED |

### Why Vitest?
- Native TypeScript support
- Fast execution
- Jest-compatible API
- Works great with Next.js
- Built-in coverage

---

## Test File Structure

```
src/
├── app/
│   └── api/
│       └── projects/
│           └── route.test.ts
├── components/
│   └── ai/
│       └── chat-interface.test.tsx
├── lib/
│   └── auth.test.ts
└── services/
    └── ai.test.ts

tests/
├── setup.ts
├── e2e/
│   ├── preview.spec.ts
│   └── checkout.spec.ts
└── fixtures/
    └── projects.json
```

---

## Test Categories

### Unit Tests
Test individual functions in isolation.

```typescript
import { describe, it, expect } from 'vitest'
import { slugify } from '../utils'

describe('slugify', () => {
  it('converts text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('handles special characters', () => {
    expect(slugify('Hello & World!')).toBe('hello-world')
  })
})
```

### API Tests
Test API routes with mocked dependencies.

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({ userId: '123', role: 'admin' }),
}))

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn(),
}))

describe('/api/projects', () => {
  it('returns 200 with projects', async () => {
    const request = new Request('http://localhost/api/projects')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Component Tests
Test React components with user interactions.

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from './chat-interface'

describe('ChatInterface', () => {
  it('renders input field', () => {
    render(<ChatInterface />)
    expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument()
  })

  it('displays messages', async () => {
    render(<ChatInterface />)
    // Test message display
  })
})
```

### E2E Tests
Test complete user flows.

```typescript
import { test, expect } from '@playwright/test'

test('preview flow', async ({ page }) => {
  // Visit preview
  await page.goto('/preview/valid-token')
  
  // Check content loads
  await expect(page.locator('text=Demo Preview')).toBeVisible()
  
  // Check countdown timer
  await expect(page.locator('[data-testid=countdown]')).toBeVisible()
  
  // Click checkout
  await page.click('text=Proceed to Checkout')
  await expect(page).toHaveURL(/\/checkout\//)
})
```

---

## Critical Test Scenarios

### Authentication
- Login with valid credentials
- Login with invalid credentials
- Session expiration
- Role-based access
- Protected routes

### Payments
- Checkout flow
- Payment verification
- Webhook handling
- Failed payments
- Refunds

### Preview System
- Valid token access
- Expired token rejection
- Invalid token handling
- Access count limits
- Watermark display

### AI Features
- Chat response generation
- Image generation
- Code generation
- Discovery engine
- Multi-language support

---

## Coverage Targets

| Area | Target | Critical Paths |
|------|--------|----------------|
| API Routes | 90% | Auth, Payments, Projects |
| Auth Logic | 95% | Login, JWT, Roles |
| Payment Logic | 95% | Checkout, Webhooks |
| AI Services | 80% | Chat, Image, Code |
| UI Components | 70% | Forms, Navigation |
| Utilities | 90% | All helpers |

---

## Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

---

## CI/CD Integration

```yaml
# In GitHub Actions
- name: Run Tests
  run: |
    npm run lint
    npm run typecheck
    npm run test
    npm run build
```

---

## Bug Reporting

### Bug Report Template
```markdown
**Title**: [Brief description]

**Severity**: S1/S2/S3/S4

**Environment**: Production/Development

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: What should happen

**Actual Result**: What actually happens

**Screenshots**: If applicable

**Additional Context**: Any other relevant info
```

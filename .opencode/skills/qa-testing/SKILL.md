# QA & Testing Skill

You are a QA engineer responsible for ensuring software quality through comprehensive testing strategies.

---

## Testing Pyramid

```
         /\
        /  \  E2E Tests (few, slow, high confidence)
       /    \
      /------\  Integration Tests (moderate, medium speed)
     /        \
    /----------\  Unit Tests (many, fast, focused)
```

---

## Test Types

### Unit Tests
- Test individual functions/methods
- Fast execution
- Mock external dependencies
- High coverage target: 80%+

### Integration Tests
- Test component interactions
- Test API endpoints
- Test database operations
- Moderate execution time

### E2E Tests
- Test complete user flows
- Test critical paths
- Slow execution
- High confidence

### API Tests
- Test endpoint responses
- Test authentication
- Test error handling
- Test rate limiting

### Performance Tests
- Load testing
- Stress testing
- Endurance testing
- Spike testing

### Security Tests
- Authentication testing
- Authorization testing
- Input validation testing
- Session management testing

### Accessibility Tests
- WCAG compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast

---

## Test Framework Setup

### For Next.js Projects (Current Stack)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:security": "npm audit && semgrep --config auto src/"
  }
}
```

---

## Test Patterns

### API Route Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/projects/route'

describe('/api/projects', () => {
  it('returns 401 when unauthorized', async () => {
    const request = new Request('http://localhost/api/projects')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns projects for authenticated user', async () => {
    // Mock auth
    vi.mock('@/lib/auth', () => ({
      getAuthUser: vi.fn().mockResolvedValue({ userId: '123', role: 'admin' }),
    }))

    const request = new Request('http://localhost/api/projects')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from '@/components/ai/chat-interface'

describe('ChatInterface', () => {
  it('renders message input', () => {
    render(<ChatInterface />)
    expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument()
  })

  it('sends message on enter', async () => {
    render(<ChatInterface />)
    const input = screen.getByPlaceholderText(/type/i)
    await fireEvent.keyDown(input, { key: 'Enter' })
    // Assert message was sent
  })
})
```

### E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('user can view project preview', async ({ page }) => {
  await page.goto('/preview/valid-token')
  await expect(page.locator('text=Demo Preview')).toBeVisible()
})

test('expired preview shows expiration message', async ({ page }) => {
  await page.goto('/preview/expired-token')
  await expect(page.locator('text=Preview Expired')).toBeVisible()
})
```

---

## Test Coverage Targets

| Area | Target | Priority |
|------|--------|----------|
| API Routes | 90% | Critical |
| Auth Logic | 95% | Critical |
| Payment Logic | 95% | Critical |
| AI Services | 80% | High |
| UI Components | 70% | Medium |
| Utilities | 90% | High |
| Models | 80% | Medium |

---

## Bug Severity Classification

| Severity | Description | Example |
|----------|-------------|---------|
| S1 Critical | System down, data loss, security breach | Auth bypass, data leak |
| S2 High | Major feature broken, no workaround | Payment fails, can't login |
| S3 Medium | Feature broken, workaround exists | Filter not working |
| S4 Low | Minor issue, cosmetic | Typo, alignment |

---

## Test Documentation

### Test Plan Template

```markdown
# Test Plan: [Feature Name]

## Objective
What this test plan covers.

## Scope
- In scope
- Out of scope

## Test Cases
| ID | Description | Steps | Expected | Priority |
|----|-------------|-------|----------|----------|
| TC01 | Description | Steps | Result | P1 |

## Environment
- Browser requirements
- Test data needs
- Special configurations

## Acceptance Criteria
- [ ] All P1 tests pass
- [ ] No S1/S2 bugs open
- [ ] Coverage meets target
```

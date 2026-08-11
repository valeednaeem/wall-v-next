# Project Management Skill

You are a project manager capable of planning, executing, and tracking projects from initiation to completion.

---

## Project Lifecycle

```
Initiation
↓
Planning
↓
Execution
↓
Monitoring & Controlling
↓
Closure
```

---

## Agile Methodology

### Scrum Framework
- **Sprints**: 1-4 week iterations
- **Daily Standups**: Quick progress updates
- **Sprint Planning**: Define sprint goals
- **Sprint Review**: Demo completed work
- **Sprint Retrospective**: Process improvement

### Kanban Board
```
| To Do | In Progress | Review | Done |
|-------|-------------|--------|------|
| Task 1 | Task 3      | Task 5 | Task 7|
| Task 2 | Task 4      | Task 6 | Task 8|
```

### User Story Format
```
As a [user type]
I want [action/goal]
So that [benefit/value]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

---

## Estimation Techniques

### Story Points (Fibonacci)
1, 2, 3, 5, 8, 13, 21

### T-Shirt Sizing
XS (1 day), S (2-3 days), M (1 week), L (2 weeks), XL (1 month)

### Time Estimates
- Optimistic: Best case scenario
- Most Likely: Realistic estimate
- Pessimistic: Worst case scenario
- Expected: (O + 4M + P) / 6

---

## Project Plan Template

```markdown
# Project Plan: [Project Name]

## Overview
**Objective**: What we're building
**Timeline**: Start - End
**Budget**: Estimated cost
**Team**: Roles and responsibilities

## Scope
### In Scope
- Feature 1
- Feature 2

### Out of Scope
- Feature X
- Feature Y

## Milestones
| Milestone | Target Date | Deliverables |
|-----------|-------------|--------------|
| M1: Planning | Week 1 | Requirements, Design |
| M2: MVP | Week 4 | Core Features |
| M3: Beta | Week 8 | Complete Features |
| M4: Launch | Week 10 | Production Deploy |

## Tasks
| ID | Task | Assignee | Estimate | Dependencies |
|----|------|----------|----------|--------------|
| T1 | Design UI | Designer | 3 days | - |
| T2 | Build API | Developer | 5 days | T1 |
| T3 | Write Tests | QA | 3 days | T2 |

## Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk 1 | High | Medium | Mitigation plan |

## Budget
| Category | Estimated | Actual |
|----------|-----------|--------|
| Development | $X | - |
| Design | $X | - |
| Infrastructure | $X | - |
```

---

## Risk Management

### Risk Assessment Matrix
| | Low Impact | Medium Impact | High Impact |
|---|------------|---------------|-------------|
| **High Probability** | Monitor | Mitigate | Escalate |
| **Medium Probability** | Accept | Monitor | Mitigate |
| **Low Probability** | Accept | Accept | Monitor |

---

## Communication Plan

| Stakeholder | Frequency | Method | Content |
|-------------|-----------|--------|---------|
| Client | Weekly | Email | Status Report |
| Team | Daily | Standup | Progress, Blockers |
| Management | Bi-weekly | Presentation | Metrics, Risks |

---

## Status Report Template

```markdown
# Status Report: [Project]
**Date**: [Date]
**Period**: [Week/Sprint]

## Summary
Overall status: 🟢 On Track / 🟡 At Risk / 🔴 Off Track

## Accomplishments
- Completed Task 1
- Completed Task 2

## In Progress
- Task 3 (70% complete)
- Task 4 (30% complete)

## Blockers
- Blocker 1: Description and mitigation

## Next Steps
- Task 5: Starting next week
- Task 6: Scheduled for review

## Metrics
- Velocity: X points/sprint
- Burn-down: On track
- Budget: X% consumed
```

---

## Wall-V Project Integration

### Project Creation Flow
```
AI Conversation → Discovery Engine → Requirements → Budget Estimate
→ Project Created → Milestones Defined → First Milestone Generated
→ Preview Created → Client Reviews → Payment → Development Begins
```

### Project Statuses
- planning → in-progress → review → testing → completed
- Also: on-hold, cancelled, demo, pending-payment

### Milestone Statuses
- pending → in-progress → generated → review → approved
- Also: changes-requested

### Payment Integration
- 2Checkout for processing
- Milestone-based payments
- Payment verification via webhook
- Automatic status updates

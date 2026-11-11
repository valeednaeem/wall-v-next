// Project lifecycle state machine
// Enforces valid status transitions per the Wall-V project lifecycle

export const PROJECT_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["planning", "on-hold", "cancelled"],
  planning: ["in-progress", "on-hold", "cancelled"],
  "in-progress": ["review", "testing", "on-hold", "cancelled"],
  review: ["in-progress", "testing", "completed", "on-hold"],
  testing: ["in-progress", "review", "completed", "on-hold"],
  completed: ["maintenance"],
  "on-hold": ["planning", "in-progress", "cancelled"],
  cancelled: [],
  demo: ["planning", "in-progress", "pending-payment"],
  "pending-payment": ["in-progress", "planning"],
};

export const LIFECYCLE_STATUS_TRANSITIONS: Record<string, string[]> = {
  request: ["inquiry"],
  inquiry: ["project-created"],
  "project-created": ["requirements-gathered"],
  "requirements-gathered": ["quoted"],
  quoted: ["scope-approved"],
  "scope-approved": ["invoiced"],
  invoiced: ["paid"],
  paid: ["executing"],
  executing: ["completed"],
  completed: ["maintenance"],
  maintenance: ["executing"],
};

export function canTransitionStatus(current: string, next: string): boolean {
  const allowed = PROJECT_STATUS_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function canTransitionLifecycle(current: string, next: string): boolean {
  const allowed = LIFECYCLE_STATUS_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function getValidStatusTransitions(current: string): string[] {
  return PROJECT_STATUS_TRANSITIONS[current] || [];
}

export function getValidLifecycleTransitions(current: string): string[] {
  return LIFECYCLE_STATUS_TRANSITIONS[current] || [];
}

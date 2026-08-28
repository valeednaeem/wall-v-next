import mongoose from "mongoose";

export interface DataScope {
  userId?: string;
  userRole?: string;
  includeAll: boolean;
}

const PRIVILEGED_ROLES = ["super-admin", "admin", "project-manager"];

export function getDataScope(user: { userId: string; role: string } | null): DataScope {
  if (!user) return { includeAll: false };
  return {
    userId: user.userId,
    userRole: user.role,
    includeAll: PRIVILEGED_ROLES.includes(user.role),
  };
}

export function applyUserScope(
  baseQuery: Record<string, unknown>,
  scope: DataScope,
  userField = "requestedBy"
): Record<string, unknown> {
  if (scope.includeAll) return baseQuery;
  if (!scope.userId) return { ...baseQuery, [userField]: null }; // anonymous gets nothing

  return {
    ...baseQuery,
    $or: [
      { [userField]: new mongoose.Types.ObjectId(scope.userId) },
      { [userField]: { $exists: false } },
      { [userField]: null },
    ],
  };
}

export function applyVisitorScope(
  baseQuery: Record<string, unknown>,
  visitorId: string,
  visitorEmail?: string
): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [
    { "visitor.id": visitorId },
  ];
  if (visitorEmail) {
    conditions.push({ "visitor.email": visitorEmail });
  }
  return {
    ...baseQuery,
    $or: conditions,
  };
}

export function filterSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  userRole: string
): Partial<T> {
  if (PRIVILEGED_ROLES.includes(userRole)) return obj;

  const filtered = { ...obj };
  const sensitiveFields = ["ip", "userAgent", "tokenUsage", "cost"];
  for (const field of sensitiveFields) {
    if (field in filtered) delete filtered[field];
  }
  return filtered;
}

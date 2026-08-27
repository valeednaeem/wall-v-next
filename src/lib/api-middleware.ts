import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getFullUser } from "./auth";
import { getAuthUserFromCookie } from "./auth-cookie";
import type { JWTPayload } from "./jwt";
import Role from "@/models/role";
import { connectToDatabase } from "@/lib/mongodb";
import { hasAnyPermission, getRolePermissions } from "./permissions";

export interface AuthContext {
  user: JWTPayload;
  fullUser: Awaited<ReturnType<typeof getFullUser>>;
}

export type ApiResponse = NextResponse;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message },
    { status }
  );
}

// ─── Core Auth ───────────────────────────────────────────────────────────────

export async function requireAuth(
  _request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  const user = await getAuthUser();
  if (!user) {
    return { auth: null as unknown as AuthContext, error: jsonError("Unauthorized", 401) };
  }
  const fullUser = await getFullUser();
  return { auth: { user, fullUser } };
}

export async function requireAuthFromCookie(
  _request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  const user = await getAuthUserFromCookie();
  if (!user) {
    return { auth: null as unknown as AuthContext, error: jsonError("Unauthorized", 401) };
  }
  const fullUser = await getFullUser();
  return { auth: { user, fullUser } };
}

// ─── Role-Based Access ───────────────────────────────────────────────────────
// Use these for simple role-gating where permission granularity isn't needed.

const SUPER_ADMIN_ROLES = ["super-admin"];
const ADMIN_ROLES = ["super-admin", "admin"];
const INTERNAL_ROLES = ["super-admin", "admin", "project-manager", "staff", "developer", "designer", "marketing", "sales", "support"];
const ALL_AUTHENTICATED = ["super-admin", "admin", "project-manager", "staff", "developer", "designer", "marketing", "sales", "support", "customer"];

export function requireRole(
  user: JWTPayload,
  allowedRoles: string[]
): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return jsonError("Forbidden: insufficient permissions", 403);
  }
  return null;
}

export function requireSuperAdmin(user: JWTPayload): NextResponse | null {
  return requireRole(user, SUPER_ADMIN_ROLES);
}

export function requireAdmin(user: JWTPayload): NextResponse | null {
  return requireRole(user, ADMIN_ROLES);
}

export function requireInternal(user: JWTPayload): NextResponse | null {
  return requireRole(user, INTERNAL_ROLES);
}

export function requireAuthenticated(user: JWTPayload): NextResponse | null {
  return requireRole(user, ALL_AUTHENTICATED);
}

export function isAdmin(user: JWTPayload): boolean {
  return ADMIN_ROLES.includes(user.role);
}

export function isInternal(user: JWTPayload): boolean {
  return INTERNAL_ROLES.includes(user.role);
}

// ─── Permission-Based Access ─────────────────────────────────────────────────
// Use these for fine-grained resource access control. Preferred over role checks.

export async function requirePermission(
  user: JWTPayload,
  permission: string
): Promise<NextResponse | null> {
  await connectToDatabase();
  const role = await Role.findOne({ slug: user.role }).select("permissions").lean();
  const permissions = role?.permissions || (user.role === "super-admin" ? ["*"] : []);
  if (!permissions.includes("*") && !permissions.includes(permission)) {
    return jsonError("You do not have permission to perform this action.", 403);
  }
  return null;
}

export async function requireAnyPermission(
  user: JWTPayload,
  permissions: string[]
): Promise<NextResponse | null> {
  await connectToDatabase();
  const role = await Role.findOne({ slug: user.role }).select("permissions").lean();
  const userPerms = role?.permissions || (user.role === "super-admin" ? ["*"] : []);
  if (!userPerms.includes("*") && !hasAnyPermission(userPerms, permissions)) {
    return jsonError("You do not have permission to perform this action.", 403);
  }
  return null;
}

// ─── Resolve permissions for a user (from DB or hierarchy) ───────────────────

export async function resolveUserPermissions(user: JWTPayload): Promise<string[]> {
  await connectToDatabase();
  const role = await Role.findOne({ slug: user.role }).select("permissions").lean();
  if (role?.permissions) return role.permissions;
  // Fallback to hierarchy
  return getRolePermissions(user.role);
}

// ─── Combined Auth + Role/Permission ─────────────────────────────────────────

export async function requireAuthAndRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  const { auth, error } = await requireAuth(request);
  if (error) return { auth, error };
  const roleError = requireRole(auth.user, allowedRoles);
  if (roleError) return { auth, error: roleError };
  return { auth };
}

export async function requireAdminAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  return requireAuthAndRole(request, ADMIN_ROLES);
}

export async function requireSuperAdminAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  return requireAuthAndRole(request, SUPER_ADMIN_ROLES);
}

// ─── Convenience Response Helpers ────────────────────────────────────────────

export function successResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

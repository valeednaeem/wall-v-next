import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getFullUser } from "./auth";
import { getAuthUserFromCookie } from "./auth-cookie";
import type { JWTPayload } from "./jwt";

export interface AuthContext {
  user: JWTPayload;
  fullUser: Awaited<ReturnType<typeof getFullUser>>;
}

export type ApiResponse = NextResponse;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  const user = await getAuthUser();
  if (!user) {
    return { auth: null as unknown as AuthContext, error: jsonError("Unauthorized", 401) };
  }
  const fullUser = await getFullUser();
  return { auth: { user, fullUser } };
}

export async function requireAuthFromCookie(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  const user = await getAuthUserFromCookie();
  if (!user) {
    return { auth: null as unknown as AuthContext, error: jsonError("Unauthorized", 401) };
  }
  const fullUser = await getFullUser();
  return { auth: { user, fullUser } };
}

const SUPER_ADMIN_ROLES = ["super-admin"];
const ADMIN_ROLES = ["super-admin", "admin"];
const MANAGER_ROLES = ["super-admin", "admin", "manager"];
const STAFF_ROLES = ["super-admin", "admin", "manager", "staff"];

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

export function requireManager(user: JWTPayload): NextResponse | null {
  return requireRole(user, MANAGER_ROLES);
}

export function requireStaff(user: JWTPayload): NextResponse | null {
  return requireRole(user, STAFF_ROLES);
}

export function isAdmin(user: JWTPayload): boolean {
  return ADMIN_ROLES.includes(user.role);
}

export function isStaff(user: JWTPayload): boolean {
  return STAFF_ROLES.includes(user.role);
}

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

export async function requireManagerAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  return requireAuthAndRole(request, MANAGER_ROLES);
}

export async function requireStaffAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; error?: NextResponse }> {
  return requireAuthAndRole(request, STAFF_ROLES);
}

export function successResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

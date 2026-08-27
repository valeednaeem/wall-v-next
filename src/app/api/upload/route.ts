import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, validateFileType, sanitizeFilename, logSecurityEvent } from "@/lib/security";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];
// SVG removed from allowed types — poses stored XSS risk when rendered by consumers
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    // Rate limit: 10 uploads per hour per user
    const rl = checkRateLimit("file-upload:" + user.userId, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      await logSecurityEvent({
        type: "file_upload_blocked",
        severity: "medium",
        userId: user.userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        path: "/api/upload",
        method: "POST",
        details: { reason: "Rate limit exceeded" },
        blocked: true,
      });
      return NextResponse.json({ error: "Upload limit exceeded. Try again later." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate MIME type against allowlist
    if (!ALLOWED_TYPES.includes(file.type)) {
      await logSecurityEvent({
        type: "file_upload_blocked",
        severity: "medium",
        userId: user.userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        path: "/api/upload",
        method: "POST",
        details: { reason: "Disallowed MIME type", mimeType: file.type, filename: file.name },
        blocked: true,
      });
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Read file bytes for magic-byte validation
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uint8 = new Uint8Array(buffer);

    // Validate file content matches declared MIME type
    const typeValidation = validateFileType(file.type, uint8);
    if (!typeValidation.valid) {
      await logSecurityEvent({
        type: "file_upload_blocked",
        severity: "high",
        userId: user.userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        path: "/api/upload",
        method: "POST",
        details: { reason: typeValidation.reason, declaredType: file.type, filename: file.name },
        blocked: true,
      });
      return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
    }

    // Sanitize filename and use UUID for storage
    const safeOriginalName = sanitizeFilename(file.name);
    const ext = safeOriginalName.split(".").pop() || "bin";
    const filename = `${uuidv4()}.${ext}`;

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUrl,
        filename,
        originalName: safeOriginalName,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

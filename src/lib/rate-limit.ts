// Re-export from centralized security module for backward compatibility.
// New code should import directly from "@/lib/security".
export { checkRateLimit, getClientIp } from "./security";

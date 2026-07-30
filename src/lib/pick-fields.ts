export function pickFields<T extends Record<string, unknown>>(
  body: T,
  allowedFields: string[]
): Partial<T> {
  const filtered: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      filtered[field] = body[field];
    }
  }
  return filtered as Partial<T>;
}

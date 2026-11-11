/**
 * Product availability utilities.
 *
 * Products are available when their status is "published".
 * If status is undefined (e.g. fetched from API where it's implicit),
 * treat as available.
 */

export function isProductAvailable(status?: string): boolean {
  if (status && status !== "published") return false;
  return true;
}

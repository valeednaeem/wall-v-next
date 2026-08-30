/**
 * Product availability utilities.
 *
 * Digital/service products (type !== "product") are always available
 * when published — stock is not meaningful for them.
 * Only physical products ("product" type) use stock-based availability.
 */

const PHYSICAL_PRODUCT_TYPE = "product";

export type ProductType =
  | "product"
  | "service"
  | "digital"
  | "hosting"
  | "domain"
  | "saas"
  | "ai-service";

/**
 * Returns true if the product type is a physical product that uses inventory.
 */
export function isPhysicalProduct(type?: string): boolean {
  return type === PHYSICAL_PRODUCT_TYPE;
}

/**
 * Returns true if the product is available for purchase.
 * - Digital/service products are always available (stock is meaningless).
 * - Physical products require sufficient stock.
 * - If status is provided and not "published", product is unavailable.
 * - If status is undefined (e.g. fetched from API where it's implicit), treat as available.
 */
export function isProductAvailable(
  status?: string,
  type?: string,
  stock?: number
): boolean {
  // Explicitly unpublished/draft/archived = unavailable
  if (status && status !== "published") return false;
  // Non-physical products: always available (stock doesn't apply)
  if (!isPhysicalProduct(type)) return true;
  // Physical product: available if stock is untracked (undefined) or > 0
  return stock === undefined || stock > 0;
}

/**
 * Returns true if stock should be decremented for this product type.
 * Only physical products decrement stock on order.
 */
export function shouldDecrementStock(type?: string): boolean {
  return isPhysicalProduct(type);
}

/**
 * Returns true if stock validation should be enforced at checkout.
 * Only physical products are stock-checked.
 */
export function shouldValidateStock(type?: string): boolean {
  return isPhysicalProduct(type);
}

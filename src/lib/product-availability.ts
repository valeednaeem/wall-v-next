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
export function isPhysicalProduct(type?: ProductType): boolean {
  return type === PHYSICAL_PRODUCT_TYPE;
}

/**
 * Returns true if the product is available for purchase.
 * - Digital/service products are available when status is "published".
 * - Physical products also require sufficient stock.
 */
export function isProductAvailable(
  status?: string,
  type?: ProductType,
  stock?: number
): boolean {
  if (status !== "published") return false;
  if (!isPhysicalProduct(type)) return true;
  // Physical product: available if stock is undefined (untracked) or > 0
  return stock === undefined || stock > 0;
}

/**
 * Returns true if stock should be decremented for this product type.
 * Only physical products decrement stock on order.
 */
export function shouldDecrementStock(type?: ProductType): boolean {
  return isPhysicalProduct(type);
}

/**
 * Returns true if stock validation should be enforced at checkout.
 * Only physical products are stock-checked.
 */
export function shouldValidateStock(type?: ProductType): boolean {
  return isPhysicalProduct(type);
}

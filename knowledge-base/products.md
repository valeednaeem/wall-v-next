# Wall-V — Product Catalog

Overview of the Wall-V product system, including product types, features, categories, and commerce functionality.

---

## Product Types

Wall-V supports seven distinct product types:

| Type | Description |
|---|---|
| **Product** | Physical or tangible goods shipped to customers |
| **Service** | Professional services delivered by the Wall-V team |
| **Digital** | Downloadable files such as ebooks, guides, or design assets |
| **Hosting** | Cloud hosting plans including VPS, shared, and dedicated servers |
| **Domain** | Domain name registration, transfer, and renewal services |
| **SaaS** | Software-as-a-service subscriptions with recurring billing |
| **AI-Service** | AI-powered solutions such as chatbots, voice agents, and automation tools |

---

## Product Features

Every product supports the following features:

- **Variants** — Multiple versions of a product (e.g., size, color, tier) with independent pricing and inventory
- **Badges** — Visual labels such as "New", "Best Seller", or "Limited Offer" displayed on product listings
- **Ratings** — Star-based rating system (1-5 stars) aggregated from customer reviews
- **Reviews** — Written customer reviews with optional images and verified purchase badges
- **Specifications** — Structured key-value attributes (e.g., "Storage: 256GB", "Framework: React")
- **SEO Metadata** — Custom title, description, and Open Graph tags for search engine optimization

---

## Product Statuses

Products progress through three statuses:

| Status | Description |
|---|---|
| **Draft** | Product is being created or edited. Not visible to customers. |
| **Published** | Product is live and available for purchase. Visible in the store. |
| **Archived** | Product has been removed from the store. Historical orders are preserved. |

---

## Promotional Products

Wall-V supports promotional products with the following capabilities:

- Time-limited discounts with start and end dates
- Coupon codes for percentage-based or fixed-amount discounts
- Bundle pricing for multiple products sold together
- Featured placement on the homepage and category pages

---

## Categories

Products are organized into a hierarchical category system:

- Categories support parent-child relationships (nested navigation)
- Each product can belong to multiple categories
- Categories have their own SEO metadata and descriptions
- Category ordering is configurable via the admin dashboard

---

## Digital Downloads

Digital products include download tracking and management:

- Unique download links generated per order
- Download count tracking per customer
- Optional download limits (e.g., 5 downloads per purchase)
- Expiration dates for download links
- File versioning for product updates

---

## Product Categories for Digital Goods

Wall-V offers digital products across four primary categories:

| Category | Description | Examples |
|---|---|---|
| **UI Kits** | Pre-built user interface component libraries and design kits | React component libraries, Tailwind UI kits, Figma design systems |
| **Templates** | Ready-to-use website and application templates | Next.js starters, admin dashboards, landing pages, e-commerce themes |
| **Plugins** | Extendable add-ons for existing platforms and frameworks | WordPress plugins, VS Code extensions, Chrome extensions |
| **APIs** | Accessible API products and integrations | REST API access, webhook services, third-party API wrappers |

---

## Shopping Cart

The Wall-V shopping cart includes the following functionality:

- Add, update, and remove items
- Variant selection per item
- Quantity adjustment
- Cart persistence across sessions (logged-in users)
- **Tax calculation: 8% applied to all applicable items**
- Coupon code application at checkout
- Order summary with itemized breakdown

---

## Supported Currencies

Wall-V accepts payments in four currencies:

| Currency | Code | Symbol |
|---|---|---|
| US Dollar | USD | $ |
| Euro | EUR | EUR |
| British Pound | GBP | GBP |
| Pakistani Rupee | PKR | PKR |

Currency selection is available at checkout and persists throughout the shopping session.

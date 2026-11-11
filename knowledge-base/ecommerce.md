# E-Commerce System

The e-commerce module handles product management, shopping cart, checkout, and order fulfillment.

## Product Types

| Type | Description |
|------|-------------|
| `product` | Physical product |
| `service` | Service listing |
| `digital` | Digital download |
| `hosting` | Hosting plan |
| `domain` | Domain service |
| `saas` | SaaS subscription |
| `ai-service` | AI-powered service |

## Product Features

- **Variants** - Individual pricing per variant (size, color, tier)
- **Badges and Labels** - Visual indicators (new, sale, popular)
- **Ratings and Reviews** - 0-5 star rating system with written reviews
- **Specifications** - Key-value attribute pairs
- **SEO Metadata** - Per-product title, description, and Open Graph data
- **Promotional Pricing** - `salePrice` field for discounted rates
- **Featured Products** - Highlighted items on homepage and listings
- **Stock Management** - Inventory tracking with low-stock alerts
- **SKU Tracking** - Unique stock-keeping unit identifiers

## Shopping Cart

- **Persistence** - localStorage-based, survives browser sessions
- **Tax Rate** - 8% applied at checkout
- **Guest Checkout** - Supported, no account required
- **Currencies** - USD, EUR, GBP, PKR

## Order Lifecycle

```
pending -> confirmed -> processing -> completed
```

Orders move through each stage sequentially. Status updates trigger notifications and webhook events.

## Payment Methods

| Method | Status | Description |
|--------|--------|-------------|
| 2Checkout | Implemented | Primary payment gateway |
| Stripe | Stub | Placeholder implementation |
| PayPal | Stub | Placeholder implementation |
| Manual Payment | Implemented | Bank transfer or manual verification |
| JazzCash | Mentioned | Referenced in FAQ |
| EasyPaisa | Mentioned | Referenced in FAQ |

## Digital Downloads

- **Download Tracking** - Records each download event per user
- **License Keys** - Unique keys generated per purchase
- **Access Control** - Downloads restricted to verified purchasers with valid license

# Epic 2: Product Catalog System

## Overview
Build comprehensive product management system with search, filtering, and inventory tracking specifically for pharmaceutical products in the Nigerian market.

## Nigerian Market Requirements

### Product Information
- **NAFDAC Registration**: Display NAFDAC registration numbers
- **Local Brands**: Support for Nigerian pharmaceutical brands
- **Generic vs Brand**: Clear distinction between generic and branded medicines
- **Prescription Requirements**: Mark prescription-only medicines

### Pricing Structure
- **Dual Pricing**: Wholesale and retail pricing in Naira (₦)
- **Minimum Order Quantities**: Different MOQs for different customer types
- **Bulk Discounts**: Wholesale pricing tiers
- **Currency Display**: Always show Naira symbol (₦)

### Search and Discovery
- **Medicine Search**: Search by generic name, brand name, active ingredient
- **Category Browse**: Antibiotics, analgesics, supplements, etc.
- **NAFDAC Search**: Search by NAFDAC registration number
- **Stock Availability**: Real-time stock status display

## Functional Requirements

### FR-CAT-001: Product Display
- Product cards with image, name, brand, pricing
- Clear wholesale vs retail price indication
- Stock availability status
- NAFDAC registration display

### FR-CAT-002: Search Functionality
- Text search across product names, brands, generic names
- Category filtering
- Price range filtering
- Stock availability filtering
- Search result pagination

### FR-CAT-003: Product Details
- Detailed product information page
- Multiple product images
- Usage instructions and dosage
- Expiry date information
- Related products suggestions

### FR-CAT-004: Inventory Integration
- Real-time stock level display
- Low stock indicators
- Out of stock handling
- Reorder notifications for admin

## User Stories

### Customer Stories
- As a retail customer, I want to browse medicines by category
- As a pharmacy owner, I want to see wholesale prices
- As a customer, I want to search for specific medicines by name
- As a patient, I want to see which medicines require prescription

### Admin Stories
- As an admin, I want to add new products to the catalog
- As an admin, I want to update product information and pricing
- As an admin, I want to manage product images
- As an admin, I want to set different pricing for different customer types

## Technical Specifications

### Product Data Structure
```typescript
interface Product {
  id: string
  name: string
  genericName?: string
  brand: string
  category: string
  nafdacRegNumber?: string
  description: string
  images: string[]
  wholesalePrice: number // In Naira
  retailPrice: number // In Naira
  stockQuantity: number
  minOrderQty: number
  isPrescriptionRequired: boolean
  isActive: boolean
}
```

### Search Implementation
- Full-text search across product fields
- Elasticsearch or database-based search
- Search result ranking by relevance
- Auto-complete suggestions

## Success Criteria
- [x] Product catalog displays all required information
- [x] Search functionality works across all product fields
- [x] Pricing displays correctly for different customer types
- [x] Stock levels update in real-time
- [x] Admin can manage products effectively
- [x] Mobile-responsive product browsing
- [x] Page load times under 3 seconds
- [x] Shopping cart integration
- [x] Bulk pricing rules implementation
- [x] Product image management with signed URLs
- [x] Prescription handling integration

## Budget: ₦300,000
## Timeline: 3 weeks
## Dependencies: Epic 1 (Database Schema)
## Status: Completed ✅ (Plus E-commerce Features)
## Implementation Notes: Product catalog extended with full e-commerce capabilities including shopping cart, bulk pricing rules, image management, and prescription integration. Exceeds original requirements.

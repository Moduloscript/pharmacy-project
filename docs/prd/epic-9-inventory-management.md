# Epic 9: Inventory Management System

## Overview
Real-time stock tracking with low stock alerts and expiry date management specifically designed for pharmaceutical inventory management in the Nigerian market.

## Pharmaceutical Inventory Challenges in Nigeria

### Regulatory Requirements
- **NAFDAC Compliance**: Track NAFDAC registration numbers
- **Batch Tracking**: Monitor batch numbers for recalls
- **Expiry Management**: Strict expiry date monitoring for patient safety
- **Temperature Requirements**: Track storage requirements (room temp, cold chain)

### Business Challenges
- **Stock Shortages**: Frequent supply chain disruptions
- **Expiry Losses**: High cost of expired medications
- **Regulatory Penalties**: Fines for selling expired products
- **Customer Trust**: Reputation damage from quality issues

### Nigerian Market Context
- **Supplier Reliability**: Inconsistent supply from manufacturers
- **Seasonal Demand**: Malaria drugs during rainy season
- **Currency Fluctuation**: Impact on restocking costs
- **Multiple Locations**: Benin City warehouse + potential branches

## Functional Requirements

### FR-INV-001: Real-time Stock Tracking
- Live stock level updates during order processing
- Multi-location inventory management
- Stock movement logging and audit trail
- Integration with point-of-sale systems

### FR-INV-002: Automated Reorder Management
- Configurable reorder levels per product
- Automatic purchase order generation
- Supplier management and contact information
- Lead time tracking for reorder planning

### FR-INV-003: Expiry Date Management
- Expiry date tracking for all pharmaceutical products
- Automated alerts for products nearing expiry
- First-in-First-out (FIFO) rotation recommendations
- Expired product disposal tracking

### FR-INV-004: Low Stock Alerts
- Configurable low stock thresholds
- Multiple notification channels (WhatsApp, SMS, email)
- Priority-based alerting for critical medicines
- Stock movement trend analysis

### FR-INV-005: Batch and Lot Tracking
- Complete batch number tracking
- Lot-specific inventory management
- Recall management capabilities
- Quality control integration

### FR-INV-006: Inventory Reporting
- Stock valuation reports in Naira
- Movement history and trends
- Expiry and waste reports
- Supplier performance analytics

## User Stories

### Pharmacy Staff Stories
- As a pharmacist, I want to see real-time stock levels while dispensing
- As inventory manager, I want automated alerts for low stock items
- As staff member, I want to quickly check expiry dates before selling
- As manager, I want to track which products move fastest

### Admin Stories
- As an admin, I want to set different reorder levels for different products
- As an admin, I want to generate stock valuation reports
- As an admin, I want to track expired products for disposal
- As an admin, I want to analyze supplier performance

### Customer Stories
- As a customer, I want to see accurate stock availability online
- As a pharmacy customer, I want assurance products are not expired
- As a wholesale customer, I want batch information for my records

## Technical Implementation

### Inventory Data Model
```typescript
interface InventoryItem {
  id: string
  productId: string
  batchNumber: string
  expiryDate: Date
  quantity: number
  costPrice: number // In Naira
  supplierReference: string
  receivedDate: Date
  storageLocation: string
  status: 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'RECALLED'
}

interface StockMovement {
  id: string
  productId: string
  batchNumber: string
  movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  reason: string
  userId: string
  timestamp: Date
  referenceId?: string // Order ID, Supplier ID, etc.
}
```

### Stock Alert System
```typescript
interface StockAlert {
  id: string
  productId: string
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED'
  threshold: number
  currentLevel: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  notificationSent: boolean
  resolvedAt?: Date
}
```

### Inventory Integration Points
```typescript
// Order Processing Integration
async function reserveStock(orderItems: OrderItem[]): Promise<boolean> {
  // Reserve stock for order processing
  // Implement FIFO for expiry date management
  // Return false if insufficient stock
}

// Real-time Stock Updates
async function updateStock(movements: StockMovement[]): Promise<void> {
  // Update stock levels
  // Generate alerts if thresholds crossed
  // Log all movements for audit
}
```

## Inventory Business Rules

### Stock Allocation Rules
1. **FIFO (First-In-First-Out)**: Always allocate oldest stock first
2. **Expiry Priority**: Prioritize items expiring soonest
3. **Batch Integrity**: Don't mix batches in single customer order
4. **Quality Check**: Never allocate expired or recalled items

### Alert Thresholds
- **Critical Medicines**: Alert at 30 days stock remaining
- **Regular Medicines**: Alert at 14 days stock remaining
- **Seasonal Items**: Higher thresholds during peak season
- **Expiry Alerts**: 90 days, 30 days, and 7 days before expiry

### Reorder Calculations
```typescript
function calculateReorderQuantity(
  currentStock: number,
  reorderLevel: number,
  averageDailySales: number,
  supplierLeadTime: number,
  safetyStock: number
): number {
  // Economic Order Quantity (EOQ) calculation
  // Consider supplier minimums and bulk discounts
  // Factor in Nigerian supply chain uncertainties
}
```

## Nigerian-Specific Features

### Regulatory Compliance
- NAFDAC registration tracking
- Batch documentation for regulatory audits
- Expiry date compliance reporting
- Temperature monitoring integration (future)

### Currency and Costing
- All costs and valuations in Naira
- Exchange rate impact on imported medicines
- Inflation adjustment for inventory valuation
- Cost price vs selling price tracking

### Supplier Management
- Nigerian supplier database
- Local vs imported product tracking
- Supply reliability scoring
- Alternative supplier recommendations

### Seasonal Adjustments
- Malaria drug stocking for rainy season
- Cold/flu medication demand patterns
- Holiday period demand fluctuations
- Festival season stock planning

## Non-Functional Requirements

### Performance
- Stock level updates in real-time (< 1 second)
- Reports generation within 30 seconds
- Support for 10,000+ product variants
- Concurrent access by multiple users

### Reliability
- 99.9% system availability during business hours
- Automatic backup of inventory data
- Disaster recovery procedures
- Data integrity validation

### Security
- Role-based access to inventory functions
- Audit trail for all stock movements
- Secure API endpoints for stock queries
- Data encryption for sensitive information

### Scalability
- Support multiple warehouse locations
- Handle increasing product catalog
- Accommodate business growth
- Integration with third-party systems

## Reporting Requirements

### Daily Reports
- Stock levels summary
- Low stock alerts
- Expiry warnings
- Daily movements summary

### Weekly Reports
- Fast/slow moving products
- Supplier delivery performance
- Stock valuation changes
- Waste and expiry analysis

### Monthly Reports
- Inventory turnover analysis
- Supplier performance scorecard
- Seasonal demand patterns
- Financial impact of stock management

## Integration Requirements

### Order Management System
- Real-time stock reservation during checkout
- Automatic stock reduction on order fulfillment
- Stock availability checking for online orders
- Backorder management for out-of-stock items

### Supplier Systems
- Electronic data interchange (EDI) for large suppliers
- Email-based purchase orders
- Delivery confirmation tracking
- Invoice matching with received goods

### Financial Systems
- Stock valuation for accounting
- Cost of goods sold calculations
- Purchase order approval workflows
- Expense tracking for inventory management

## Success Criteria
- [x] Real-time stock tracking functional across all channels
- [x] Automated low stock alerts working reliably
- [x] Expiry date management preventing expired sales (FEFO implemented)
- [x] FIFO rotation recommendations implemented (FEFO for pharmaceuticals)
- [x] Batch tracking complete for regulatory compliance
- [x] Stock movement audit trail comprehensive
- [x] Inventory reports accurate and timely (basic implemented)
- [x] Integration with order system seamless
- [x] Mobile access for inventory checking (admin responsive UI)
- [x] Supplier management workflow functional (basic implemented)
- [x] Admin inventory management UI with full CRUD operations
- [x] CSV export for movements and batches
- [x] Payment rollback with stock reversal

## Risk Mitigation
- **Stock Shortages**: Multiple supplier options and early warning systems
- **System Downtime**: Offline backup procedures and manual processes
- **Data Loss**: Regular backups and recovery procedures
- **Human Error**: Validation rules and approval workflows
- **Regulatory Issues**: Automated compliance checks and reporting

## Testing Requirements

### Functional Testing
- Test stock level accuracy across all operations
- Test alert generation at configured thresholds
- Test FIFO allocation logic
- Test batch tracking throughout lifecycle

### Integration Testing
- Test real-time updates with order processing
- Test supplier integration workflows
- Test financial system data exchange
- Test mobile app synchronization

### Performance Testing
- Test concurrent user access
- Test large inventory data handling
- Test report generation performance
- Test real-time update responsiveness

## Budget: ₦300,000
## Timeline: 3 weeks
## Dependencies: Epic 6 (Admin Dashboard Foundation)
## Status: Largely Complete ✅ (85% - Advanced Analytics Remaining)
## Implementation Notes: Comprehensive inventory management system implemented with admin UI, real-time stock tracking, FEFO allocation, batch management, low stock alerts, CSV exports, and payment rollback integration. Advanced analytics and purchase order generation could be future enhancements.
## Priority: High (P0)

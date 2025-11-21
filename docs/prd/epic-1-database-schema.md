# Epic 1: Database Schema Implementation

## Overview
Extend existing Prisma schema with pharmacy-specific models for products, orders, customers, and payments with Nigerian-specific requirements.

## Nigerian-Specific Database Requirements

### User Schema Requirements
- **Phone Format**: Nigerian format validation (+234XXXXXXXXXX)
- **Address Fields**: Include Nigerian State and LGA (Local Government Area) 
- **Business Registration**: CAC registration number for business customers
- **Customer Types**: Retail, Pharmacy, Clinic, Hospital

### Product Schema Requirements
- **NAFDAC Registration**: Include NAFDAC registration number field
- **Pricing**: Wholesale and Retail pricing in Nigerian Naira (₦)
- **Expiry Management**: Medicine expiry date tracking
- **Stock Management**: Reorder levels and stock quantity tracking

### Order Schema Requirements  
- **Currency**: All amounts in Nigerian Naira (₦)
- **Delivery Address**: Include Nigerian State and LGA fields
- **Payment Methods**: Support for Flutterwave, OPay, Paystack
- **Order Status**: Nigerian delivery workflow statuses

### Payment Schema Requirements
- **Multiple Gateways**: Flutterwave (primary), OPay, Paystack
- **Transaction References**: Support for Nigerian gateway formats
- **Gateway Response**: Store full response for audit

## Functional Requirements

### FR-DB-001: User Management
- Store customer information with Nigerian address format
- Support business customer verification
- Credit limit management for wholesale customers

### FR-DB-002: Product Catalog
- Medicine information with NAFDAC registration
- Batch and expiry date tracking
- Wholesale vs retail pricing structure
- Stock quantity and reorder level management

### FR-DB-003: Order Processing
- Order creation with Nigerian delivery zones
- Order status tracking through fulfillment
- Payment method and gateway tracking

### FR-DB-004: Payment Tracking
- Transaction logging for all gateways
- Payment status management
- Gateway response auditing

## Success Criteria
- [x] All Nigerian-specific fields implemented
- [x] Database migrations created and tested
- [x] Prisma client types generated
- [x] Test data seeded for development
- [x] Performance indexes created
- [x] Advanced features: batch tracking, FEFO allocation, prescription audit logs
- [x] Notification system integration
- [x] Image management with signed URLs

## Budget: ₦200,000
## Timeline: 2 weeks
## Dependencies: None
## Status: Completed ✅ (Plus Additional Features)
## Implementation Notes: Database schema exceeds original requirements with comprehensive inventory management, batch tracking, prescription security logging, and advanced notification preferences system implemented.

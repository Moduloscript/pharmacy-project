# BenPharm Online - Product Requirements Document

## Company Overview
**Company:** Small Pharmaceutical Distribution Company  
**Location:** Benin City, Edo State, Nigeria  
**Business:** Wholesale & Retail pharmaceutical distribution  
**Target Launch:** Q3 2025  
**Budget:** ₦2-5 million development budget  

---

## 1. Current Business Reality

### What We Have:
- Physical pharmacy/warehouse in Benin City
- Existing wholesale customers (pharmacies, clinics, patent medicine stores)
- Retail walk-in customers
- Manual order processing (WhatsApp/phone calls)
- Basic inventory tracking (Excel sheets)
- Established supplier relationships

### What We Want:
- Online platform for customers to browse and order
- Better inventory management
- Streamlined order processing
- Expand customer reach across Nigeria
- Reduce manual work and errors

---

## 2. Realistic Product Goals

### Phase 1: Digital Catalog & Ordering (Months 1-3)
**Budget: ₦1.5M**

**Core Features:**
- Product catalog with prices (wholesale & retail)
- Customer registration (pharmacies & individuals)
- Basic shopping cart and checkout
- WhatsApp/SMS order notifications
- Simple admin panel for inventory updates

**Target Users:**
- 50 existing wholesale customers
- 200 local retail customers
- 5 admin staff members

### Phase 2: Enhanced Operations (Months 4-6)
**Budget: ₦1.5M**

**Additional Features:**
- Basic inventory tracking
- Order history and tracking
- Customer credit management
- Simple reporting dashboard
- Mobile-responsive design

### Phase 3: Growth Features (Months 7-12)
**Budget: ₦2M**

**Expansion Features:**
- Customer mobile app
- Delivery tracking integration
- Basic analytics
- Customer loyalty program
- Payment gateway integration (Flutterwave primary)

---

## 3. MVP Feature Set (Start Here)

### 3.1 Product Catalog
```
- Medicine search (by name, brand, generic)
- Categories (antibiotics, analgesics, supplements, etc.)
- Product photos and descriptions
- Stock availability (In Stock/Out of Stock)
- Wholesale vs Retail pricing
- Minimum order quantities
```

### 3.2 Customer Management
```
- Simple registration (Name, Phone, Business Type)
- Customer types: Pharmacy, Clinic, Individual
- Basic profile management
- Order history
```

### 3.3 Order Processing
```
- Add to cart functionality
- Basic checkout (no payment gateway initially)
- Order confirmation via WhatsApp/SMS
- Admin order management dashboard
- Order status updates (Received, Processing, Ready, Delivered)
```

### 3.4 Simple Inventory
```
- Product list with stock levels
- Low stock alerts
- Basic product management (add/edit/delete)
- Simple stock updates
```

---

## 4. Technical Specifications (Realistic)

### 4.1 Platform Choice
- **Web-based:** Responsive website (mobile-friendly)
- **Framework:** Use existing supastarter foundation
- **Database:** PostgreSQL (already set up)
- **Hosting:** Shared hosting initially (₦50,000/year)

### 4.2 Payment Gateway Integration (Priority Order)
**Primary Choice: Flutterwave**
- **Transaction Fee:** 1.4% + ₦50 per transaction
- **Supported Methods:** Cards, Bank Transfer, USSD, Mobile Money
- **Settlement:** T+1 working days
- **Benefits:** Strong Nigerian presence, excellent API documentation

**Secondary Choice: OPay**
- **Transaction Fee:** 1.5% per transaction
- **Supported Methods:** Cards, Bank Transfer, OPay Wallet
- **Settlement:** Instant to T+1
- **Benefits:** Popular in Nigeria, good mobile integration

**Tertiary Choice: Paystack**
- **Transaction Fee:** 1.5% + ₦100 per transaction
- **Supported Methods:** Cards, Bank Transfer, USSD, QR Codes
- **Settlement:** T+2 working days
- **Benefits:** Reliable service, good documentation

### 4.3 Other Essential Integrations
- **WhatsApp Business API:** Order notifications
- **SMS Gateway:** Order confirmations (₦10/SMS)
- **Google Maps:** Delivery location picking

### 4.4 Data Requirements
```sql
-- Simple product table
products (
  id, name, generic_name, brand, 
  category, description, image_url,
  wholesale_price, retail_price, 
  stock_quantity, min_order_qty,
  is_prescription_required,
  created_at, updated_at
)

-- Customer table
customers (
  id, name, phone, email, 
  business_name, customer_type,
  address, city, state,
  credit_limit, created_at
)

-- Simple orders
orders (
  id, customer_id, order_number,
  total_amount, payment_status, order_status,
  payment_method, payment_reference,
  delivery_address, notes,
  created_at, updated_at
)

-- Payment transactions
payments (
  id, order_id, amount, 
  gateway_used, transaction_reference,
  status, gateway_response,
  created_at, updated_at
)
```

---

## 5. Pricing Strategy (Benin City Reality)

### 5.1 No Subscription Model
- **Free for customers** to use the platform
- **Revenue from product sales** (existing business model)
- **Delivery fees** (₦500-2000 depending on location)
- **Payment processing fees** absorbed into product pricing

### 5.2 Customer Segments & Payment Options
```
Retail Customers:
- Individual buyers
- Walk-in replacement with online ordering
- Minimum order: ₦2,000
- Delivery within Benin City: ₦500
- Payment: Flutterwave (Cards, Bank Transfer, USSD)

Wholesale Customers:
- Registered pharmacies
- Patent medicine stores
- Clinics/hospitals
- Minimum order: ₦50,000
- Free delivery above ₦100,000
- Payment: Bank Transfer (preferred) or Flutterwave
```

### 5.3 Payment Method Priority
1. **Bank Transfer** (no fees for wholesale customers)
2. **Flutterwave Card Payment** (retail customers)
3. **Flutterwave Bank Transfer** (backup option)
4. **OPay** (if Flutterwave issues)
5. **Cash on Delivery** (local Benin City only)

---

## 6. Realistic Development Plan

### Month 1: Foundation
- Set up basic product catalog (100 most-sold items)
- Create customer registration system
- Build simple shopping cart
- **Cost: ₦500,000 (developer + designer)**

### Month 2: Order System
- Order processing workflow
- WhatsApp integration for notifications
- Basic admin dashboard
- **Cost: ₦500,000**

### Month 3: Testing & Launch
- Test with 10 existing customers
- Fix bugs and improve UX
- Soft launch to existing customer base
- **Cost: ₦500,000**

### Months 4-6: Payment & Improvements
- **Flutterwave integration** (primary focus)
- **OPay integration** (secondary)
- Mobile optimization
- Inventory management features
- Customer feedback implementation
- **Cost: ₦1,500,000**

---

## 7. Payment Integration Strategy

### 7.1 Flutterwave Implementation (Phase 2)
```typescript
// Payment flow priority
paymentMethods: [
  {
    provider: 'flutterwave',
    methods: ['card', 'bank_transfer', 'ussd', 'mobile_money'],
    fees: '1.4% + ₦50',
    priority: 1,
    customerTypes: ['retail', 'wholesale']
  },
  {
    provider: 'opay',
    methods: ['card', 'bank_transfer', 'wallet'],
    fees: '1.5%',
    priority: 2,
    customerTypes: ['retail']
  },
  {
    provider: 'paystack',
    methods: ['card', 'bank_transfer', 'ussd'],
    fees: '1.5% + ₦100',
    priority: 3,
    customerTypes: ['retail']
  }
]
```

### 7.2 Payment Flow Design
1. **Customer selects items** → Add to cart
2. **Checkout page** → Shows payment options based on customer type
3. **Payment selection** → Flutterwave first, fallback options available
4. **Payment processing** → Real-time status updates
5. **Confirmation** → WhatsApp + SMS notification
6. **Order fulfillment** → Admin dashboard notification

---

## 8. Marketing Strategy (Local Focus)

### 8.1 Existing Customer Base
- Announce platform to current customers
- Offer first-order discount (5%)
- Train customers on how to use platform
- Highlight convenient payment options (Flutterwave)

### 8.2 Local Expansion
- Partner with local pharmacies for referrals
- Social media presence (Instagram, Facebook)
- WhatsApp status updates for promotions
- Local healthcare provider partnerships
- Emphasize secure payment processing

### 8.3 Benin City Focus First
- Perfect local delivery system
- Build reputation and reviews
- Expand to other Edo State cities
- Then consider Lagos/Abuja expansion

---

## 9. Success Metrics (Realistic)

### Year 1 Targets:
- **100 online orders/month** by Month 6
- **300 online orders/month** by Month 12
- **₦2M monthly online revenue** by end of Year 1
- **80% customer satisfaction** rate
- **50% repeat order rate**
- **70% successful payment completion rate**

### Payment Performance Metrics:
- **Flutterwave transaction success rate:** >95%
- **Average payment processing time:** <2 minutes
- **Payment dispute rate:** <1%
- **Customer payment method preference:** Track and optimize

### Cost Savings:
- **Reduce phone order processing time** by 60%
- **Decrease order errors** by 40%
- **Expand customer reach** beyond walk-ins
- **Better inventory visibility**

---

## 10. Risk Management

### 10.1 Business Risks
- **Low adoption:** Focus on customer training and incentives
- **Competition:** Leverage existing relationships and local knowledge
- **Technical issues:** Start simple, improve gradually
- **Cash flow:** No upfront costs to customers

### 10.2 Payment Risks
- **Payment gateway downtime:** Multiple gateway options (Flutterwave, OPay, Paystack)
- **Transaction failures:** Automatic retry mechanism and customer support
- **Fraud prevention:** Use gateway security features and order verification
- **Chargeback protection:** Clear refund policies and transaction tracking

### 10.3 Technical Risks
- **Internet connectivity:** Ensure platform works on slow connections
- **Power issues:** Use reliable hosting with backup
- **Mobile compatibility:** Mobile-first design approach

---

## 11. Implementation Priorities

### Must Have (Phase 1):
1. Product catalog with search
2. Customer registration
3. Shopping cart and checkout
4. WhatsApp order notifications
5. Basic admin panel

### Should Have (Phase 2):
6. **Flutterwave payment integration**
7. Inventory tracking
8. Order history
9. Customer credit management
10. Mobile optimization
11. Basic reporting

### Nice to Have (Phase 3):
12. **OPay and Paystack integration**
13. Mobile app
14. Delivery tracking
15. Advanced analytics
16. Loyalty program

---

## 12. Budget Breakdown

### Development Costs:
- **Frontend Developer:** ₦1,500,000 (6 months)
- **Backend Developer:** ₦1,000,000 (4 months)
- **UI/UX Designer:** ₦500,000 (2 months)
- **Payment Integration Specialist:** ₦400,000 (2 months)
- **Project Management:** ₦300,000

### Operational Costs (Year 1):
- **Hosting & Domain:** ₦100,000
- **Flutterwave Transaction Fees:** ₦200,000 (estimated)
- **WhatsApp Business API:** ₦200,000
- **SMS Gateway:** ₦150,000
- **Maintenance:** ₦300,000

**Total Year 1 Budget:** ₦4,650,000

---

## 13. Payment Gateway Setup Timeline

### Month 4: Primary Integration
- **Flutterwave account setup and verification**
- **API integration and testing**
- **Webhook configuration**
- **Test transactions with small amounts**

### Month 5: Secondary Options
- **OPay integration** (fallback option)
- **Payment flow optimization**
- **User experience testing**
- **Customer payment preference analysis**

### Month 6: Final Integration
- **Paystack integration** (tertiary option)
- **Payment method switching logic**
- **Comprehensive payment testing**
- **Payment analytics dashboard**

---

## 14. Next Steps (This Month)

### Week 1-2:
1. **Define exact product list** (start with top 50 medicines)
2. **Gather product photos and descriptions**
3. **Document current pricing structure**
4. **List existing customer contacts**
5. **Contact Flutterwave for business account setup**

### Week 3-4:
6. **Hire local developer** (or contract development team)
7. **Create wireframes/mockups** for key pages including payment flow
8. **Set up development environment**
9. **Define exact workflow** for order and payment processing
10. **Complete Flutterwave business verification process**

---

## Conclusion

This is a practical, achievable plan for a small Benin City pharmaceutical company to go digital with robust payment processing. It focuses on:

- **Realistic budget** (₦4.65M total)
- **Achievable timeline** (6 months to full operation)
- **Local focus** (Benin City first, then expand)
- **Existing business model** (no subscription fees)
- **Multiple payment options** (Flutterwave primary, OPay/Paystack backup)
- **Simple technology** (web-based, mobile-responsive)
- **Gradual growth** (start with existing customers)

**Key Success Factor:** Focus on solving real problems for your existing customers first, then expand gradually based on success and learning.

**Payment Strategy:** Start with Flutterwave for its competitive rates and strong Nigerian market presence, with OPay and Paystack as reliable alternatives.

**Immediate Action:** Start with a simple product catalog and order form, then integrate Flutterwave payments. You can build this in 4-6 weeks and start taking online orders immediately.

# BenPharm Online - User Journey Flow Diagram

## Complete User Journey Flow (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            BENPHARM ONLINE PLATFORM                                 │
│                      (Based on Supastarter Architecture)                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │  HOMEPAGE   │
                                    │ (Marketing) │
                                    │   /[locale] │
                                    └─────┬───────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                   ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
                   │  LOGIN  │      │  SIGNUP   │    │  BROWSE   │
                   │ /login  │      │ /signup   │    │ PRODUCTS  │
                   │         │      │           │    │  (Guest)  │
                   └────┬────┘      └─────┬─────┘    └─────┬─────┘
                        │                 │                │
                        └─────────────────┼────────────────┘
                                          │
                                    ┌─────▼─────┐
                                    │   USER    │
                                    │   TYPE    │
                                    │ SELECTION │
                                    └─────┬─────┘
                           ┌──────────────┼──────────────┐
                           │              │              │
                    ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
                    │   RETAIL    │ │WHOLESALE/ │ │   ADMIN   │
                    │  CUSTOMER   │ │ PHARMACY  │ │   USER    │
                    │             │ │ CUSTOMER  │ │           │
                    └──────┬──────┘ └─────┬─────┘ └─────┬─────┘
                           │              │             │
                           │              │             │
        ┌──────────────────┼──────────────┼─────────────┼──────────────────┐
        │                  │              │             │                  │
        │                  │              │             │                  │

═══════════════════════════════════════════════════════════════════════════════════════
                                RETAIL CUSTOMER JOURNEY
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   PRODUCT   │───▶│   SEARCH &   │───▶│   PRODUCT   │───▶│   ADD TO     │
│   CATALOG   │    │   FILTER     │    │   DETAILS   │    │   CART       │
│    /app     │    │   /search    │    │  /products/ │    │   /cart      │
│             │    │              │    │   [id]      │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
      │                    │                   │                 │
      │            ┌───────▼───────┐          │                 │
      │            │   ADVANCED    │          │                 │
      └────────────┤   FILTERS     │──────────┘                 │
                   │ - Category    │                            │
                   │ - Brand       │                            │
                   │ - Price Range │                            │
                   │ - Availability│                            │
                   └───────────────┘                            │
                                                                │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐         │
│  CHECKOUT   │◀───┤  VIEW CART   │◀───┤ CONTINUE    │◀────────┘
│  /checkout  │    │  /cart       │    │ SHOPPING    │
│             │    │              │    │             │
└─────┬───────┘    └──────────────┘    └─────────────┘
      │
┌─────▼─────┐
│ CUSTOMER  │
│   INFO    │
│ FORM      │
│ - Name    │
│ - Phone   │
│ - Address │
│ - Email   │
└─────┬─────┘
      │
┌─────▼─────┐
│ DELIVERY  │
│ OPTIONS   │
│ - Standard│ (₦500 Benin City)
│ - Express │ (₦1000 same day)
│ - Pickup  │ (Free)
└─────┬─────┘
      │
┌─────▼─────┐
│ PAYMENT   │
│ METHOD    │
│ SELECTION │
└─────┬─────┘
      │
      ├─────────────┬─────────────┬─────────────┐
      │             │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│FLUTTERWAVE│ │   OPAY    │ │ PAYSTACK  │ │CASH ON    │
│(Primary)  │ │(Secondary)│ │(Tertiary) │ │DELIVERY   │
│Card/USSD/ │ │Card/Bank  │ │Card/Bank  │ │(Local     │
│Bank/Mobile│ │Transfer/  │ │Transfer/  │ │Only)      │
│Money      │ │Wallet     │ │USSD/QR    │ │           │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │             │
      └─────────────┼─────────────┼─────────────┘
                    │             │
              ┌─────▼─────┐       │
              │  PAYMENT  │       │
              │PROCESSING │       │
              │  SCREEN   │       │
              │ (Real-time│       │
              │  status)  │       │
              └─────┬─────┘       │
                    │             │
              ┌─────▼─────┐       │
              │ PAYMENT   │       │
              │ SUCCESS/  │       │
              │  FAILED   │       │
              └─────┬─────┘       │
                    │             │
                    └─────────────┼─────────────┐
                                  │             │
                            ┌─────▼─────┐       │
                            │   ORDER   │       │
                            │CONFIRMATION│      │
                            │  SCREEN   │       │
                            │           │       │
                            └─────┬─────┘       │
                                  │             │
                            ┌─────▼─────┐       │
                            │WHATSAPP & │       │
                            │SMS ALERTS │       │
                            │NOTIFICATION│      │
                            │           │       │
                            └─────┬─────┘       │
                                  │             │
                            ┌─────▼─────┐       │
                            │   ORDER   │       │
                            │ TRACKING  │       │
                            │  STATUS   │       │
                            │/orders/[id]│      │
                            └─────┬─────┘       │
                                  │             │
                    ┌─────────────┼─────────────┼─────────────┐
                    │             │             │             │
            ┌───────▼───────┐┌────▼────┐┌──────▼──────┐┌─────▼─────┐
            │   RECEIVED    ││PROCESSING││    READY    ││ DELIVERED │
            │               ││         ││             ││           │
            │ (Order placed)││(Picking)││(Out for     ││(Completed)│
            │               ││         ││ delivery)   ││           │
            └───────────────┘└─────────┘└─────────────┘└───────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                             WHOLESALE/PHARMACY CUSTOMER JOURNEY
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   BUSINESS  │───▶│ VERIFICATION │───▶│   PRODUCT   │───▶│ BULK/WHOLESALE│
│REGISTRATION │    │   PROCESS    │    │   CATALOG   │    │   PRICING     │
│/signup      │    │              │    │   /app      │    │   DISPLAY     │
│- Business   │    │- License Doc │    │             │    │               │
│  Name       │    │- Tax ID      │    │             │    │- Min Order    │
│- License #  │    │- Address     │    │             │    │  Qty          │
│- Address    │    │  Verification│    │             │    │- Bulk Pricing │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
                                                                 │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐           │
│   ADVANCED  │───▶│   PRODUCT    │───▶│   ADD TO    │◀──────────┘
│   SEARCH    │    │   DETAILS    │    │   CART      │
│/search      │    │ /products/   │    │   /cart     │
│- NDC Number │    │   [id]       │    │             │
│- Generic    │    │              │    │- Qty Check │
│- Brand      │    │- Full specs  │    │- Min Order │
│- Category   │    │- Batch info  │    │  Validation │
│- Supplier   │    │- Expiry      │    │             │
└─────────────┘    └──────────────┘    └─────┬───────┘
                                             │
┌─────────────┐    ┌──────────────┐         │
│  CHECKOUT   │◀───┤  CART REVIEW │◀────────┘
│  /checkout  │    │  /cart       │
│             │    │              │
└─────┬───────┘    │- Bulk        │
      │            │  Discount    │
      │            │  Applied     │
      │            │- Credit      │
      │            │  Terms       │
      │            │  Available   │
      │            └──────────────┘
      │
┌─────▼─────┐
│ BUSINESS  │
│   INFO    │
│CONFIRMATION│
│- Delivery │
│  Address  │
│- Contact  │
│  Person   │
│- PO Number│
└─────┬─────┘
      │
┌─────▼─────┐
│ PAYMENT   │
│ OPTIONS   │
└─────┬─────┘
      │
      ├─────────────┬─────────────┬─────────────┐
      │             │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│   BANK    │ │FLUTTERWAVE│ │   OPAY    │ │  CREDIT   │
│ TRANSFER  │ │  (Card/   │ │  (Wallet/ │ │   TERMS   │
│(Preferred)│ │  Transfer)│ │  Transfer)│ │ (Approved │
│  No Fees  │ │  1.4%+₦50 │ │   1.5%    │ │ Customers)│
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │             │
      └─────────────┼─────────────┼─────────────┘
                    │             │
              ┌─────▼─────┐       │
              │   ORDER   │       │
              │CONFIRMATION│      │
              │  & ADMIN  │       │
              │NOTIFICATION│      │
              └─────┬─────┘       │
                    │             │
              ┌─────▼─────┐       │
              │WHATSAPP & │       │
              │SMS ALERTS │       │
              │TO CUSTOMER│       │
              │& ADMIN    │       │
              └─────┬─────┘       │
                    │             │
              ┌─────▼─────┐       │
              │   ORDER   │       │
              │ TRACKING  │       │
              │& DELIVERY │       │
              │COORDINATION│      │
              └───────────┘       │
                                  │
                            ┌─────▼─────┐
                            │  CREDIT   │
                            │ TERMS     │
                            │ APPLIED   │
                            │- 30 days  │
                            │- Invoice  │
                            │  Sent     │
                            └───────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                                   ADMIN USER JOURNEY
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   ADMIN     │───▶│   DASHBOARD  │───▶│   ORDER     │───▶│   INVENTORY  │
│   LOGIN     │    │   /app/admin │    │ MANAGEMENT  │    │ MANAGEMENT   │
│  /admin     │    │              │    │/admin/orders│    │/admin/       │
│             │    │- Daily Stats │    │             │    │ inventory    │
└─────────────┘    │- Revenue     │    │             │    │              │
                   │- Orders      │    └─────┬───────┘    └──────┬───────┘
                   │- Alerts      │          │                   │
                   └──────────────┘          │                   │
                                            │                   │
                   ┌─────────────────────────┼───────────────────┼─────────────────┐
                   │                         │                   │                 │
           ┌───────▼────────┐    ┌──────────▼──────────┐    ┌───▼────────┐   ┌───▼────────┐
           │    ORDER       │    │      INVENTORY      │    │  CUSTOMER  │   │   REPORTS  │
           │   PROCESSING   │    │      UPDATES        │    │ MANAGEMENT │   │& ANALYTICS │
           │                │    │                     │    │            │   │            │
           │- New Orders    │    │- Stock Levels       │    │- Approve   │   │- Sales     │
           │- Status Update │    │- Add New Products   │    │  Business  │   │- Inventory │
           │- Customer Info │    │- Update Prices      │    │  Accounts  │   │- Customer  │
           │- Picking List  │    │- Low Stock Alerts   │    │- Credit    │   │- Financial │
           │- Packaging     │    │- Expiry Tracking    │    │  Limits    │   │            │
           │- Dispatch      │    │- Supplier Orders    │    │- Order     │   │            │
           └────┬───────────┘    └─────────────────────┘    │  History   │   │            │
                │                                           └────────────┘   └────────────┘
                │
    ┌───────────▼───────────┐
    │     ORDER STATUS      │
    │      WORKFLOW         │
    │                       │
    │ NEW → PROCESSING →    │
    │ READY → DISPATCHED →  │
    │     DELIVERED         │
    └───────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                             NOTIFICATION & COMMUNICATION FLOW
═══════════════════════════════════════════════════════════════════════════════════════

                              ┌─────────────────┐
                              │      ORDER      │
                              │     PLACED      │
                              └─────────┬───────┘
                                        │
                          ┌─────────────▼─────────────┐
                          │    NOTIFICATION ENGINE    │
                          │   (WhatsApp Business &    │
                          │        SMS Gateway)       │
                          └─────────┬───────┬─────────┘
                                    │       │
                      ┌─────────────▼───┐   └─────────────┐
                      │    CUSTOMER     │                 │
                      │  NOTIFICATION   │                 │
                      │                 │                 │
                      │- Order Confirm  │                 │
                      │- Payment Status │                 │
                      │- Dispatch Alert │                 │
                      │- Delivery Update│                 │
                      └─────────────────┘                 │
                                                          │
                                              ┌─────────▼─────────┐
                                              │      ADMIN        │
                                              │   NOTIFICATION    │
                                              │                   │
                                              │- New Order Alert  │
                                              │- Payment Received │
                                              │- Low Stock Alert  │
                                              │- Customer Query   │
                                              └───────────────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                                    ERROR HANDLING FLOW
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    PAYMENT      │───▶│     PAYMENT      │───▶│    FALLBACK     │
│    FAILURE      │    │   RETRY LOGIC    │    │   PAYMENT       │
│  (Flutterwave)  │    │                  │    │   GATEWAY       │
└─────────────────┘    │- Auto retry 3x   │    │    (OPay)       │
                       │- Different card  │    └─────────────────┘
                       │- Bank transfer   │              │
                       └──────────────────┘              │
                                                         │
┌─────────────────┐    ┌──────────────────┐              │
│    SYSTEM       │───▶│    GRACEFUL      │              │
│     ERROR       │    │     FALLBACK     │              │
│                 │    │                  │              │
└─────────────────┘    │- Offline mode    │              │
                       │- Cache orders    │              │
                       │- Sync on return  │              │
                       └──────────────────┘              │
                                                         │
                                          ┌─────────────▼──────────────┐
                                          │     MANUAL FALLBACK        │
                                          │                            │
                                          │- Cash on Delivery          │
                                          │- Bank Transfer             │
                                          │- Call Customer Service     │
                                          │- WhatsApp Support          │
                                          └────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                               MOBILE RESPONSIVENESS FLOW
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE-FIRST DESIGN                                       │
│                        (80% Android Users Nigeria)                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   MOBILE    │───▶│   OPTIMIZED  │───▶│   TOUCH     │───▶│   OFFLINE    │
│   ACCESS    │    │   LAYOUTS    │    │  FRIENDLY   │    │  CAPABILITY  │
│             │    │              │    │    UI       │    │              │
│- WhatsApp   │    │- Single      │    │             │    │- Cache       │
│  Integration│    │  Column      │    │- Large      │    │  Products    │
│- Progressive│    │- Compressed  │    │  Buttons    │    │- Save        │
│  Web App    │    │  Images      │    │- Swipe      │    │  Orders      │
│- Fast Load  │    │- Minimal     │    │  Actions    │    │- Sync Later  │
│- Low Data   │    │  JavaScript  │    │- Thumb      │    │              │
│  Usage      │    │              │    │  Navigation │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                                  CODEBASE MAPPING
═══════════════════════════════════════════════════════════════════════════════════════

FILE STRUCTURE MAPPING:

Marketing Pages:     /apps/web/app/(marketing)/[locale]/
├── Homepage        /apps/web/app/(marketing)/[locale]/(home)/page.tsx
├── About          /apps/web/app/(marketing)/[locale]/about/page.tsx
└── Contact        /apps/web/app/(marketing)/[locale]/contact/page.tsx

SaaS Application:   /apps/web/app/(saas)/app/
├── Dashboard      /apps/web/app/(saas)/app/(account)/page.tsx
├── Products       /apps/web/app/(saas)/app/(account)/products/page.tsx
├── Cart           /apps/web/app/(saas)/app/(account)/cart/page.tsx
├── Checkout       /apps/web/app/(saas)/app/(account)/checkout/page.tsx
├── Orders         /apps/web/app/(saas)/app/(account)/orders/page.tsx
├── Profile        /apps/web/app/(saas)/app/(account)/settings/general/page.tsx
└── Admin Panel    /apps/web/app/(saas)/app/(account)/admin/

Authentication:     /apps/web/app/(saas)/auth/
├── Login          /apps/web/app/(saas)/auth/login/page.tsx
├── Signup         /apps/web/app/(saas)/auth/signup/page.tsx
├── Reset Password /apps/web/app/(saas)/auth/reset-password/page.tsx
└── Forgot Password /apps/web/app/(saas)/auth/forgot-password/page.tsx

API Routes:         /packages/api/src/routes/
├── Products       /packages/api/src/routes/products.ts
├── Orders         /packages/api/src/routes/orders.ts  
├── Payments       /packages/api/src/routes/payments/router.ts
├── Auth           /packages/api/src/routes/auth.ts
├── Inventory      /packages/api/src/routes/inventory.ts
└── Notifications  /packages/api/src/routes/notifications.ts

Database Models:    /packages/database/prisma/schema.prisma
├── User           - Customer accounts
├── Organization   - Business accounts (wholesale customers)
├── Product        - Medicine catalog
├── Order          - Order tracking
├── Payment        - Payment transactions
├── Inventory      - Stock management
└── Notification   - WhatsApp/SMS alerts

Components:         /apps/web/modules/
├── UI Components  /apps/web/modules/ui/components/
├── Auth           /apps/web/modules/saas/auth/components/
├── Products       /apps/web/modules/saas/products/components/
├── Orders         /apps/web/modules/saas/orders/components/
├── Payments       /apps/web/modules/saas/payments/components/
├── Admin          /apps/web/modules/saas/admin/components/
└── Shared         /apps/web/modules/shared/components/

Payment Integration: /packages/payments/
├── Flutterwave    /packages/payments/provider/flutterwave/index.ts
├── OPay           /packages/payments/provider/opay/index.ts  
├── Paystack       /packages/payments/provider/paystack/index.ts
└── Handler        /packages/payments/src/lib/

Notifications:      /packages/mail/
├── WhatsApp       /packages/mail/src/provider/whatsapp.ts
├── SMS            /packages/mail/src/provider/sms.ts
├── Templates      /packages/mail/emails/
└── Utils          /packages/mail/src/util/

═══════════════════════════════════════════════════════════════════════════════════════
```

## Key User Journey Features Summary:

### **1. Retail Customer Flow:**
- Browse products → Search/Filter → Add to cart → Checkout → Payment (Flutterwave primary) → Order tracking → Delivery

### **2. Wholesale Customer Flow:**
- Business registration → Verification → Bulk pricing view → Large orders → Credit terms → Bank transfer preferred → Invoice management

### **3. Admin Management Flow:**
- Order processing → Inventory management → Customer approval → Reports & analytics → Notification management

### **4. Payment Processing:**
- Primary: Flutterwave (1.4% + ₦50)
- Secondary: OPay (1.5%)
- Tertiary: Paystack (1.5% + ₦100)
- Fallback: Cash on Delivery (Benin City only)

### **5. Mobile-First Design:**
- Progressive Web App
- Offline capability
- WhatsApp integration
- Touch-friendly interface
- Minimal data usage

### **6. Notification System:**
- WhatsApp Business API
- SMS Gateway
- Real-time order updates
- Admin alerts
- Customer communication

This comprehensive flow maps directly to your existing supastarter codebase structure and incorporates all the specific requirements from your BENIN_PHARMA_PRD.md file.

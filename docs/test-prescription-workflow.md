# Prescription Management System Test Plan

## Overview
This document outlines the test scenarios for the newly implemented prescription management system.

## Test Scenarios

### 1. Customer Prescription Submission
- **Objective**: Test that customers can submit prescriptions for orders with prescription-required items
- **Steps**:
  1. Create an order with prescription-required products
  2. Navigate to order details page
  3. Upload prescription document using PrescriptionUpload component
  4. Verify prescription is created in database
  5. Check that admin notification is sent

### 2. Admin Prescription Review
- **Objective**: Test admin can view and review prescriptions
- **Steps**:
  1. Login as admin user
  2. Navigate to `/admin/prescriptions`
  3. Verify prescriptions table loads with pending prescriptions
  4. Click "Review" on a prescription
  5. Verify prescription details dialog opens

### 3. Prescription Approval Flow
- **Objective**: Test prescription approval updates order status
- **Steps**:
  1. Open prescription in admin panel
  2. Click "Approve"
  3. Add optional notes
  4. Confirm approval
  5. Verify:
     - Prescription status changes to APPROVED
     - Order status changes to PROCESSING
     - Customer receives approval notification
     - Audit log entry is created

### 4. Prescription Rejection Flow
- **Objective**: Test prescription rejection cancels order
- **Steps**:
  1. Open prescription in admin panel
  2. Click "Reject"
  3. Enter rejection reason (required)
  4. Confirm rejection
  5. Verify:
     - Prescription status changes to REJECTED
     - Order status changes to CANCELLED
     - Customer receives rejection notification with reason
     - Audit log entry is created

### 5. Clarification Request Flow
- **Objective**: Test requesting additional information
- **Steps**:
  1. Open prescription in admin panel
  2. Click "Request Clarification"
  3. Enter clarification details
  4. Submit request
  5. Verify:
     - Prescription status changes to CLARIFICATION
     - Customer receives notification with request details
     - Order remains on hold

### 6. File Upload Validation
- **Objective**: Test file upload restrictions
- **Test Cases**:
  - Upload valid image (JPEG, PNG, WebP) < 10MB ✅
  - Upload valid PDF < 10MB ✅
  - Upload invalid file type (e.g., .docx) ❌
  - Upload file > 10MB ❌
  - Upload without file selected ❌

### 7. Security & Permissions
- **Objective**: Test access control
- **Test Cases**:
  - Customer can only view/upload their own prescriptions ✅
  - Non-admin users cannot access /admin/prescriptions ✅
  - Admin can view all prescriptions ✅
  - Rate limiting on prescription endpoints ✅

### 8. Audit Trail
- **Objective**: Test audit logging
- **Test Cases**:
  - All prescription views are logged
  - Status changes are logged with previous/new values
  - Failed access attempts are logged
  - IP address and user agent captured

## API Endpoints to Test

### Customer Endpoints
- `GET /api/prescriptions` - List prescriptions (admin only)
- `GET /api/prescriptions/:id` - Get prescription details
- `POST /api/prescriptions` - Create prescription
- `POST /api/prescriptions/:id/upload` - Upload prescription document

### Admin Endpoints
- `PATCH /api/prescriptions/:id` - Update prescription status
- `GET /api/prescriptions/stats` - Get prescription statistics

## Database Verification

### Tables Created
- `prescription` - Main prescription records
- `prescription_audit_log` - Audit trail for all actions

### Relationships
- Prescription -> Order (many-to-one)
- Prescription -> PrescriptionAuditLog (one-to-many)

## Integration Points

### Notification System
- Admin notifications for new prescriptions
- Customer notifications for status updates
- SMS/Email/WhatsApp channels based on preferences

### Order Management
- Order status updates based on prescription approval
- Order tracking entries created

### Security Middleware
- CSRF protection on state-changing endpoints
- Rate limiting on prescription endpoints
- Session security validation

## Performance Considerations
- Prescriptions list paginated (10 per page default)
- Audit logs limited to last 10 entries in detail view
- Image preview generation client-side

## Known Limitations
- File upload currently saves placeholder URL (needs S3/Cloudinary integration)
- No prescription expiry validation implemented yet
- No OCR for automatic prescription data extraction

## Next Steps
1. Integrate with actual file storage service (S3/Cloudinary)
2. Add prescription expiry validation
3. Implement prescription renewal flow
4. Add bulk prescription management for admins
5. Create customer prescription history view

# BenPharm Online - Project Workflow Rules

## 🎯 **Core Development Workflow**

This document establishes the standardized workflow for developing BenPharm Online using both the comprehensive TASKS.md planning document and TaskMaster AI for task management.

---

## 📋 **Rule 1: Reference TASKS.md for Implementation Details**

### **When to Use TASKS.md:**
- ✅ **Before starting any new feature** - Read the full task specification
- ✅ **During coding** - Reference exact file paths, code examples, and technical specifications
- ✅ **For database changes** - Use provided schema definitions and Nigerian-specific fields
- ✅ **For API development** - Follow endpoint specifications and request/response formats
- ✅ **For UI components** - Reference component structure and file organization
- ✅ **For environment setup** - Use provided environment variable configurations

### **TASKS.md Contains:**
- 📊 **Complete technical specifications** with code examples
- 🗂️ **Exact file paths** for every component to create/modify
- 💰 **Budget and timeline estimates** for planning
- 🇳🇬 **Nigerian-specific requirements** (LGA, States, NAFDAC, etc.)
- 🔗 **Payment gateway integration details** (Flutterwave, OPay, Paystack)
- 📱 **WhatsApp/SMS notification templates**

### **Action Items:**
```bash
# Before starting development
1. Open TASKS.md
2. Navigate to the specific task section (e.g., "1.1 Database Schema Implementation")
3. Read the full specification including file paths and code examples
4. Bookmark the relevant section for reference during coding
```

---

## ⚙️ **Rule 2: Use TaskMaster AI to Track Progress on Individual Tasks**

### **When to Use TaskMaster AI:**
- ✅ **Daily task management** - Get next priority task
- ✅ **Progress tracking** - Update task status as work progresses
- ✅ **Dependency management** - Ensure prerequisites are completed
- ✅ **Team coordination** - Track who's working on what
- ✅ **Status reporting** - Generate progress reports

### **TaskMaster AI Commands:**

#### **Get Next Task:**
```bash
# Get the highest priority pending task
taskmaster next-task
```

#### **Start Working on a Task:**
```bash
# Set task status to "in progress"
taskmaster set-status --task-id 1 --status "in progress"
```

#### **Check Task Dependencies:**
```bash
# Verify all dependencies are completed before starting
taskmaster list-tasks --filter dependencies
```

#### **Update Task Progress:**
```bash
# Add progress notes or update details
taskmaster update-task --task-id 1 --notes "Database schema 50% complete"
```

### **Status Workflow:**
```
pending → in progress → review → completed
```

---

## 🔄 **Rule 3: Update Individual Task Status as Work Progresses**

### **Required Status Updates:**

#### **When Starting a Task:**
```bash
taskmaster set-status --task-id [ID] --status "in progress"
```

#### **Daily Progress Updates:**
```bash
# Update with specific progress notes
taskmaster update-task --task-id [ID] --notes "Completed Product model, working on Order model"
```

#### **When Blocked:**
```bash
taskmaster set-status --task-id [ID] --status "blocked"
taskmaster update-task --task-id [ID] --notes "Blocked: Need Flutterwave API credentials"
```

#### **Ready for Review:**
```bash
taskmaster set-status --task-id [ID] --status "review"
```

#### **Task Completion:**
```bash
taskmaster set-status --task-id [ID] --status "completed"
taskmaster update-task --task-id [ID] --notes "All deliverables completed, tests passing"
```

### **Progress Tracking Checklist:**
- [ ] Status updated at start of work session
- [ ] Daily progress notes added
- [ ] Dependencies marked as completed
- [ ] Blockers immediately flagged
- [ ] Review status set when ready for testing
- [ ] Completion status set with final notes

---

## 📖 **Rule 4: Return to TASKS.md for Technical Specifications When Coding**

### **During Active Development:**

#### **Before Writing Code:**
1. **Check TASKS.md section** for the specific task
2. **Copy exact file paths** to ensure consistency
3. **Reference code examples** for patterns and structure
4. **Follow naming conventions** specified in the document

#### **For Database Changes:**
```typescript
// Always reference TASKS.md for schema definitions
// Example from TASKS.md Section 1.1:
model Product {
  id                    String   @id @default(cuid())
  name                  String
  nafdac_reg_number     String?  // Nigerian-specific field
  // ... rest from TASKS.md
}
```

#### **For API Endpoints:**
```typescript
// Follow exact endpoint specifications from TASKS.md
// Example from Section 1.2:
GET    /api/products - List products with filters
POST   /api/products - Create product (admin only)
// ... implement as specified
```

#### **For React Components:**
```typescript
// Use exact file paths from TASKS.md
// apps/web/modules/saas/products/components/ProductCatalog.tsx
// Follow component structure patterns provided
```

### **Technical Reference Workflow:**
```
1. Start task in TaskMaster AI
2. Open TASKS.md to relevant section
3. Copy file paths and technical specifications
4. Implement following provided patterns
5. Update progress in TaskMaster AI
6. Return to TASKS.md for any clarifications
```

---

## 🔧 **Additional Workflow Rules**

### **Rule 5: Environment and Configuration Management**
- ✅ **Always use Nigerian-specific configurations** from TASKS.md Section "Technical Setup Tasks"
- ✅ **Set up payment gateways in priority order**: Flutterwave (primary) → OPay → Paystack
- ✅ **Use Nigerian Naira (₦) currency** throughout the application
- ✅ **Include State and LGA fields** for Nigerian addresses

### **Rule 6: Code Quality and Patterns**
- ✅ **Follow existing codebase patterns** in the pharmacy-project structure
- ✅ **Use TypeScript** for all new code
- ✅ **Implement error handling** for Nigerian network conditions
- ✅ **Add Nigerian phone number validation** (+234 format)
- ✅ **Include NAFDAC registration** fields for medicines

### **Rule 7: Testing and Validation**
- ✅ **Test with Nigerian data** (states, LGAs, phone numbers)
- ✅ **Validate payment integrations** with Nigerian test accounts
- ✅ **Test SMS/WhatsApp** with Nigerian phone numbers
- ✅ **Verify currency formatting** (₦) throughout the application

### **Rule 8: Communication and Documentation**
- ✅ **Update both TASKS.md and TaskMaster AI** when requirements change
- ✅ **Document Nigerian-specific implementations** in code comments
- ✅ **Report blockers immediately** in TaskMaster AI
- ✅ **Keep progress notes detailed** for knowledge transfer

---

## 📊 **Daily Workflow Checklist**

### **Morning Routine:**
```bash
# 1. Get today's priority task
taskmaster next-task

# 2. Check dependencies
taskmaster list-tasks --filter dependencies

# 3. Set task status
taskmaster set-status --task-id [ID] --status "in progress"

# 4. Open TASKS.md to relevant section
# Reference technical specifications
```

### **During Development:**
- [ ] Reference TASKS.md for implementation details
- [ ] Follow exact file paths and naming conventions
- [ ] Use provided code examples as patterns
- [ ] Update progress every 2-3 hours in TaskMaster AI

### **End of Day:**
```bash
# Update progress with detailed notes
taskmaster update-task --task-id [ID] --notes "Detailed progress summary"

# Update status if completed or blocked
taskmaster set-status --task-id [ID] --status "review" # or "blocked"
```

---

## 🚨 **Emergency Procedures**

### **When Blocked:**
1. **Immediately update TaskMaster AI** with blocked status
2. **Document the blocker** in detail
3. **Check TASKS.md** for alternative approaches
4. **Escalate if external dependency** (API keys, credentials, etc.)

### **When Requirements Change:**
1. **Update TASKS.md** with new requirements
2. **Update corresponding task** in TaskMaster AI
3. **Notify team** of changes
4. **Re-estimate timeline** if significant changes

### **When Behind Schedule:**
1. **Review task dependencies** for optimization
2. **Check TASKS.md** for scope reduction options
3. **Update budget/timeline estimates**
4. **Prioritize critical features** (P0 over P1/P2)

---

## 💡 **Best Practices Summary**

| **Planning & Strategy** | **Task Management** | **Implementation** |
|------------------------|-------------------|-------------------|
| Use TASKS.md | Use TaskMaster AI | Reference both |
| Strategic decisions | Progress tracking | Technical specs |
| Technical specifications | Status updates | Code examples |
| Nigerian requirements | Dependencies | File paths |
| Budget/timeline | Team coordination | Patterns |

---

## 🎯 **Success Metrics**

Track these metrics to ensure workflow effectiveness:
- [ ] **Task completion rate** (target: 95% on time)
- [ ] **Code quality** (follows TASKS.md specifications)
- [ ] **Nigerian compliance** (all local requirements met)
- [ ] **Documentation accuracy** (TASKS.md and TaskMaster AI in sync)

---

**Remember: TASKS.md is your implementation Bible, TaskMaster AI is your progress tracker. Use both consistently for maximum effectiveness!** 🚀

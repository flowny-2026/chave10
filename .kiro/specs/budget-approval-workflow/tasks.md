# Implementation Tasks - Budget Approval Workflow

## Phase 1: Database & Backend Core

### Task 1.1: Create Database Migrations
**Status:** pending
**Description:** Create SQL migration to add approval workflow tables
**Files:**
- Create `backend/src/migrations/add-approval-tables.sql`
**Acceptance:** All 4 new tables created with proper indexes

### Task 1.2: Implement Token Generation Service
**Status:** pending
**Description:** Create service for generating secure approval tokens
**Files:**
- Create `backend/src/services/approval-links.js`
**Acceptance:** Generates cryptographically secure 43-char tokens

### Task 1.3: Implement Audit Logger Service
**Status:** pending
**Description:** Create service for logging all approval actions
**Files:**
- Create `backend/src/services/audit-logger.js`
**Acceptance:** Logs all action types with proper metadata

### Task 1.4: Create Approval Routes
**Status:** pending
**Description:** Create API endpoints for approval workflow
**Files:**
- Create `backend/src/routes/approval.js`
**Acceptance:** All 6 endpoints implemented and tested

### Task 1.5: Add Link Validation Logic
**Status:** pending
**Description:** Implement token validation and expiration checks
**Files:**
- Update `backend/src/services/approval-links.js`
**Acceptance:** Validates tokens, expiration, and status correctly

## Phase 2: WhatsApp Integration

### Task 2.1: Implement WhatsApp Service
**Status:** pending
**Description:** Create service for sending messages via WhatsApp API
**Files:**
- Create `backend/src/services/whatsapp.js`
**Acceptance:** Sends formatted messages with approval links

### Task 2.2: Add Phone Formatter Utility
**Status:** pending
**Description:** Create utility for phone number formatting
**Files:**
- Create `backend/src/utils/phone-formatter.js`
**Acceptance:** Formats Brazilian phone numbers correctly

### Task 2.3: Integrate WhatsApp with Approval Flow
**Status:** pending
**Description:** Connect WhatsApp sending to link generation
**Files:**
- Update `backend/src/routes/approval.js`
**Acceptance:** Sends WhatsApp message when requested

## Phase 3: Public Approval Page

### Task 3.1: Create Approval Page Component
**Status:** pending
**Description:** Build public approval page for clients
**Files:**
- Create `frontend/src/pages/ApprovalPage.jsx`
**Acceptance:** Displays budget details mobile-responsive

### Task 3.2: Implement Signature Canvas Component
**Status:** pending
**Description:** Build signature capture interface
**Files:**
- Create `frontend/src/components/SignatureCanvas.jsx`
**Acceptance:** Captures and converts signature to PNG

### Task 3.3: Create Budget Details Component
**Status:** pending
**Description:** Build component to display budget breakdown
**Files:**
- Create `frontend/src/components/BudgetDetails.jsx`
**Acceptance:** Shows all budget info in mobile-friendly format

### Task 3.4: Implement Approval/Rejection Flow
**Status:** pending
**Description:** Add approval and rejection actions
**Files:**
- Update `frontend/src/pages/ApprovalPage.jsx`
**Acceptance:** Handles approve/reject with proper validation

### Task 3.5: Add Public Route
**Status:** pending
**Description:** Configure routing for public approval page
**Files:**
- Update `frontend/src/App.jsx`
**Acceptance:** /approve/:token route works without auth

## Phase 4: Workshop Interface Integration

### Task 4.1: Update Budget List Component
**Status:** pending
**Description:** Add approval status column and actions
**Files:**
- Update `frontend/src/pages/Orcamentos.jsx` (or equivalent)
**Acceptance:** Shows approval status for all budgets

### Task 4.2: Add Link Management UI
**Status:** pending
**Description:** Add UI for generating and managing approval links
**Files:**
- Update budget detail/form component
**Acceptance:** Generate, send, regenerate links from UI

### Task 4.3: Display Approval Statistics
**Status:** pending
**Description:** Show link access stats and signature
**Files:**
- Update budget detail component
**Acceptance:** Displays access count, timestamps, signature

### Task 4.4: Show Audit Trail
**Status:** pending
**Description:** Display timeline of approval actions
**Files:**
- Create `frontend/src/components/ApprovalAuditTrail.jsx`
**Acceptance:** Shows all actions in chronological order

## Phase 5: Testing & Polish

### Task 5.1: Add Backend Unit Tests
**Status:** pending
**Description:** Test token generation and validation logic
**Acceptance:** Core services have >80% coverage

### Task 5.2: Add Integration Tests
**Status:** pending
**Description:** Test full approval flow end-to-end
**Acceptance:** All happy paths and error cases covered

### Task 5.3: Test Mobile Responsiveness
**Status:** pending
**Description:** Verify approval page works on mobile devices
**Acceptance:** Works on iOS and Android browsers

### Task 5.4: Add Environment Configuration
**Status:** pending
**Description:** Document and configure all environment variables
**Acceptance:** .env.example updated with all variables

### Task 5.5: Create Migration Script
**Status:** pending
**Description:** Add script to run database migrations
**Files:**
- Create `backend/src/migrations/run-migrations.js`
**Acceptance:** Safely applies all migrations

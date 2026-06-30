# Requirements Document

## Introduction

The Budget Approval Workflow feature enables clients to approve vehicle service budgets (orçamentos) directly via WhatsApp using unique, time-limited links. This streamlines the approval process by allowing clients to review and approve quotes without requiring authentication or access to the internal system. The feature optionally supports digital signatures for formal approval documentation.

## Glossary

- **Budget_Approval_System**: The subsystem responsible for generating approval links, managing link validity, and processing client approvals
- **Approval_Link**: A unique, time-limited URL that allows a client to view and approve a specific budget
- **Link_Token**: A cryptographically secure unique identifier embedded in the approval link
- **WhatsApp_Gateway**: The integration service used to send approval links to clients via WhatsApp
- **Digital_Signature**: An optional electronic signature captured from the client during the approval process
- **Budget**: An orçamento (quote) for vehicle services containing service descriptions, parts, and pricing
- **Client**: A cliente who receives and approves budgets
- **Workshop**: An oficina that creates budgets and sends them for client approval
- **Link_Expiration**: The date and time after which an approval link becomes invalid
- **Approval_Status**: The current state of a budget (pendente, aprovado, recusado, expirado)

## Requirements

### Requirement 1: Generate Unique Approval Links

**User Story:** As a workshop user, I want to generate unique approval links for budgets, so that I can send them to clients for approval via WhatsApp

#### Acceptance Criteria

1. WHEN a workshop user requests an approval link for a budget, THE Budget_Approval_System SHALL generate a unique Link_Token using cryptographically secure random generation
2. THE Budget_Approval_System SHALL create an Approval_Link containing the Link_Token and budget identifier
3. THE Budget_Approval_System SHALL store the Link_Token, budget ID, creation timestamp, and expiration timestamp in the database
4. THE Budget_Approval_System SHALL return the complete Approval_Link to the requesting user
5. FOR ALL generated Link_Tokens, the token SHALL be at least 32 characters long to ensure uniqueness and security

### Requirement 2: Configure Link Validity Period

**User Story:** As a workshop user, I want to set how long an approval link remains valid, so that I can control the timeframe for client responses

#### Acceptance Criteria

1. WHEN generating an Approval_Link, THE Budget_Approval_System SHALL accept an optional validity period in hours or days
2. IF no validity period is specified, THEN THE Budget_Approval_System SHALL use a default validity period of 7 days
3. THE Budget_Approval_System SHALL calculate the Link_Expiration timestamp based on the creation time and validity period
4. THE Budget_Approval_System SHALL store the Link_Expiration timestamp with the link record
5. WHERE a custom validity period is provided, the validity period SHALL be between 1 hour and 90 days

### Requirement 3: Send Approval Links via WhatsApp

**User Story:** As a workshop user, I want to send approval links to clients via WhatsApp, so that clients can easily access and review their budgets

#### Acceptance Criteria

1. WHEN a workshop user requests to send an approval link, THE Budget_Approval_System SHALL retrieve the client's phone number from the budget record
2. THE Budget_Approval_System SHALL format the phone number for WhatsApp API compatibility
3. THE Budget_Approval_System SHALL compose a message containing the Approval_Link and budget summary information
4. THE Budget_Approval_System SHALL send the message through the WhatsApp_Gateway
5. IF the WhatsApp_Gateway returns a delivery failure, THEN THE Budget_Approval_System SHALL log the error and return an error message to the user
6. WHEN the message is successfully sent, THE Budget_Approval_System SHALL update the link record with the sent timestamp

### Requirement 4: Display Budget Details for Client Review

**User Story:** As a client, I want to view detailed budget information when I open an approval link, so that I can make an informed approval decision

#### Acceptance Criteria

1. WHEN a client accesses an Approval_Link, THE Budget_Approval_System SHALL validate the Link_Token exists in the database
2. IF the Link_Token is invalid, THEN THE Budget_Approval_System SHALL display an error message indicating the link is not valid
3. IF the Link_Expiration timestamp is in the past, THEN THE Budget_Approval_System SHALL display an error message indicating the link has expired
4. IF the link is valid and not expired, THE Budget_Approval_System SHALL retrieve the associated Budget data including client name, vehicle information, service descriptions, parts list, labor cost, parts cost, discount, and total value
5. THE Budget_Approval_System SHALL display the budget information in a mobile-friendly format without requiring authentication
6. THE Budget_Approval_System SHALL display the Workshop name and contact information
7. THE Budget_Approval_System SHALL display the Link_Expiration date and time to the client

### Requirement 5: Process Budget Approval

**User Story:** As a client, I want to approve a budget through the approval link, so that the workshop knows I authorize the work to proceed

#### Acceptance Criteria

1. WHEN viewing a valid budget, THE Budget_Approval_System SHALL display an "Approve" action button
2. WHEN a client clicks the approve button, THE Budget_Approval_System SHALL update the budget Approval_Status to "aprovado"
3. THE Budget_Approval_System SHALL record the approval timestamp
4. THE Budget_Approval_System SHALL invalidate the Approval_Link to prevent reuse
5. THE Budget_Approval_System SHALL display a confirmation message to the client
6. WHERE digital signature is enabled, THE Budget_Approval_System SHALL capture the signature before completing the approval

### Requirement 6: Process Budget Rejection

**User Story:** As a client, I want to reject a budget through the approval link, so that the workshop knows I do not authorize the work

#### Acceptance Criteria

1. WHEN viewing a valid budget, THE Budget_Approval_System SHALL display a "Reject" action button
2. WHEN a client clicks the reject button, THE Budget_Approval_System SHALL display an optional text field for rejection reason
3. WHEN rejection is confirmed, THE Budget_Approval_System SHALL update the budget Approval_Status to "recusado"
4. THE Budget_Approval_System SHALL record the rejection timestamp and optional reason
5. THE Budget_Approval_System SHALL invalidate the Approval_Link to prevent reuse
6. THE Budget_Approval_System SHALL display a confirmation message to the client

### Requirement 7: Capture Optional Digital Signature

**User Story:** As a workshop administrator, I want to optionally require digital signatures for budget approvals, so that I have formal documented authorization from clients

#### Acceptance Criteria

1. WHERE digital signature is enabled for a Workshop, THE Budget_Approval_System SHALL display a signature capture canvas when a client approves a budget
2. THE Budget_Approval_System SHALL validate that a signature has been drawn before allowing approval completion
3. THE Budget_Approval_System SHALL convert the captured signature to a PNG image format
4. THE Budget_Approval_System SHALL store the signature image with the budget approval record
5. WHERE digital signature is not enabled, THE Budget_Approval_System SHALL process approvals without signature capture

### Requirement 8: Notify Workshop of Approval Status Changes

**User Story:** As a workshop user, I want to be notified when a client approves or rejects a budget, so that I can take appropriate action

#### Acceptance Criteria

1. WHEN a budget Approval_Status changes to "aprovado" or "recusado", THE Budget_Approval_System SHALL create a notification for the Workshop
2. THE Budget_Approval_System SHALL include the budget number, client name, and approval decision in the notification
3. WHERE a rejection reason was provided, THE Budget_Approval_System SHALL include it in the notification
4. THE Budget_Approval_System SHALL mark the notification as unread
5. WHEN a workshop user views the budget list, THE Budget_Approval_System SHALL display a visual indicator for budgets with status changes

### Requirement 9: Handle Link Expiration

**User Story:** As a workshop user, I want expired approval links to be automatically invalidated, so that clients cannot approve outdated budgets

#### Acceptance Criteria

1. WHEN a client accesses an Approval_Link, THE Budget_Approval_System SHALL compare the current timestamp with the Link_Expiration timestamp
2. IF the current timestamp is after the Link_Expiration timestamp, THEN THE Budget_Approval_System SHALL display an expired link error message
3. THE Budget_Approval_System SHALL update the budget Approval_Status to "expirado" if not already approved or rejected
4. THE Budget_Approval_System SHALL provide contact information for the Workshop in the expired link message
5. WHEN displaying expired budgets in the workshop interface, THE Budget_Approval_System SHALL show an "expired" badge

### Requirement 10: Regenerate Approval Links

**User Story:** As a workshop user, I want to regenerate an approval link for a budget, so that I can send a new link if the original expired or was not received

#### Acceptance Criteria

1. WHEN a workshop user requests to regenerate an approval link for a budget, THE Budget_Approval_System SHALL invalidate any existing active Approval_Links for that budget
2. THE Budget_Approval_System SHALL generate a new unique Link_Token
3. THE Budget_Approval_System SHALL create a new Approval_Link with a fresh Link_Expiration timestamp
4. THE Budget_Approval_System SHALL reset the budget Approval_Status to "pendente" if it was "expirado"
5. THE Budget_Approval_System SHALL return the new Approval_Link to the user
6. IF the budget Approval_Status is "aprovado" or "recusado", THEN THE Budget_Approval_System SHALL prevent regeneration and return an error message

### Requirement 11: Track Approval Link Usage

**User Story:** As a workshop user, I want to see when and how many times an approval link was accessed, so that I can understand client engagement

#### Acceptance Criteria

1. WHEN a client accesses an Approval_Link, THE Budget_Approval_System SHALL record the access timestamp
2. THE Budget_Approval_System SHALL increment an access counter for the link
3. THE Budget_Approval_System SHALL store the client's IP address with each access record
4. WHEN a workshop user views budget details, THE Budget_Approval_System SHALL display the number of times the link was accessed
5. THE Budget_Approval_System SHALL display the timestamp of the first and most recent access

### Requirement 12: Maintain Approval Audit Trail

**User Story:** As a workshop administrator, I want a complete audit trail of all approval actions, so that I have documentation for compliance and dispute resolution

#### Acceptance Criteria

1. WHEN any approval-related action occurs, THE Budget_Approval_System SHALL create an audit log entry
2. THE Budget_Approval_System SHALL record the action type (link_generated, link_sent, link_accessed, approved, rejected, expired, regenerated)
3. THE Budget_Approval_System SHALL record the timestamp of each action
4. WHERE applicable, THE Budget_Approval_System SHALL record the user ID of the workshop user who initiated the action
5. THE Budget_Approval_System SHALL record the client IP address for client-initiated actions
6. WHEN a workshop user views audit logs, THE Budget_Approval_System SHALL display entries in reverse chronological order

### Requirement 13: Integrate with Existing Budget Management

**User Story:** As a workshop user, I want approval workflow features integrated into the existing budget interface, so that I can manage approvals alongside budget creation

#### Acceptance Criteria

1. WHEN viewing the budget list, THE Budget_Approval_System SHALL display the current Approval_Status for each budget
2. WHEN viewing budget details, THE Budget_Approval_System SHALL display approval workflow actions (generate link, send via WhatsApp, regenerate link)
3. THE Budget_Approval_System SHALL display the Approval_Link, expiration date, and access statistics when a link exists
4. WHERE a digital signature was captured, THE Budget_Approval_System SHALL display the signature image in budget details
5. THE Budget_Approval_System SHALL preserve all existing budget functionality (create, edit, delete, print)

### Requirement 14: Validate Budget Data Completeness

**User Story:** As a workshop user, I want to be prevented from generating approval links for incomplete budgets, so that clients receive complete information

#### Acceptance Criteria

1. WHEN a workshop user requests to generate an approval link, THE Budget_Approval_System SHALL validate that the budget has a client associated
2. THE Budget_Approval_System SHALL validate that the client has a valid phone number
3. THE Budget_Approval_System SHALL validate that the budget has at least one service or part item
4. THE Budget_Approval_System SHALL validate that the budget has a total value greater than zero
5. IF any validation fails, THEN THE Budget_Approval_System SHALL display a specific error message identifying the missing information and prevent link generation

### Requirement 15: Support Mobile-First Client Experience

**User Story:** As a client, I want the approval interface to work seamlessly on my mobile device, so that I can review and approve budgets on the go

#### Acceptance Criteria

1. THE Budget_Approval_System SHALL render the approval interface with responsive design that adapts to mobile screen sizes
2. THE Budget_Approval_System SHALL use touch-friendly button sizes of at least 44x44 pixels
3. THE Budget_Approval_System SHALL display budget line items in a vertically scrollable list optimized for mobile viewing
4. WHERE digital signature is enabled, THE Budget_Approval_System SHALL provide a touch-friendly signature canvas with clear gesture support
5. THE Budget_Approval_System SHALL load the approval page within 3 seconds on a 3G mobile connection

# Requirements Document - Smart Inventory Management

## Introduction

The Smart Inventory Management feature provides intelligent monitoring and automation for parts and stock management. The system automatically alerts when inventory levels are low, suggests purchase orders based on usage patterns, and maintains a database of preferred suppliers with pricing and lead times.

## Glossary

- **Inventory_Item**: A part or product stored in inventory
- **Stock_Level**: Current quantity of an item in inventory
- **Minimum_Stock**: Threshold below which low stock alert is triggered
- **Reorder_Point**: Stock level at which purchase suggestion is generated
- **Supplier**: A vendor from whom parts can be purchased
- **Preferred_Supplier**: Primary supplier for a specific item with best pricing/terms
- **Purchase_Suggestion**: System-generated recommendation to reorder items
- **Usage_Pattern**: Historical consumption data for predictive ordering
- **Lead_Time**: Time between order placement and delivery
- **Auto_Order**: Automatic purchase order generation when reorder point is reached
- **Stock_Alert**: Notification when inventory falls below minimum level
- **Bulk_Discount**: Price reduction for larger quantity orders
- **Stock_Movement**: Record of inventory changes (in/out)

## Requirements

### Requirement 1: Configure Minimum Stock Levels

**User Story:** As a workshop administrator, I want to set minimum stock levels for each item, so that I'm alerted before running out

#### Acceptance Criteria

1. WHEN creating or editing an inventory item, THE Inventory_System SHALL accept a Minimum_Stock value as an integer
2. THE Inventory_System SHALL validate that Minimum_Stock is greater than or equal to zero
3. THE Inventory_System SHALL store Minimum_Stock with the inventory item record
4. IF no Minimum_Stock is specified, THEN THE Inventory_System SHALL use a default value of 5
5. THE Inventory_System SHALL allow updating Minimum_Stock at any time without affecting current stock quantity

### Requirement 2: Generate Low Stock Alerts

**User Story:** As a workshop user, I want to receive alerts when items reach low stock, so that I can reorder before running out

#### Acceptance Criteria

1. WHEN Stock_Level falls below or equals Minimum_Stock, THE Inventory_System SHALL create a Stock_Alert
2. THE Inventory_System SHALL display Stock_Alert notifications in the dashboard
3. THE Inventory_System SHALL mark items with low stock with a visual warning indicator (icon or badge)
4. WHEN viewing the inventory list, THE Inventory_System SHALL sort items with Stock_Alert to the top
5. THE Inventory_System SHALL count and display the total number of items with low stock
6. WHEN Stock_Level rises above Minimum_Stock, THE Inventory_System SHALL automatically clear the Stock_Alert

### Requirement 3: Track Stock Movements

**User Story:** As a workshop administrator, I want to track all stock movements, so that I can audit inventory changes

#### Acceptance Criteria

1. WHEN stock quantity changes, THE Inventory_System SHALL create a Stock_Movement record
2. THE Stock_Movement record SHALL include item ID, previous quantity, new quantity, change amount, movement type (in/out/adjustment), user ID, timestamp, and optional notes
3. THE Inventory_System SHALL support movement types: purchase (in), sale/usage (out), return (in), waste (out), adjustment (in/out)
4. WHEN a user views item details, THE Inventory_System SHALL display the last 50 Stock_Movement records in reverse chronological order
5. THE Inventory_System SHALL calculate and display total quantity in, total quantity out, and net change for a selected date range

### Requirement 4: Register Preferred Suppliers

**User Story:** As a workshop administrator, I want to register suppliers with contact and pricing information, so that I know who to order from

#### Acceptance Criteria

1. THE Inventory_System SHALL allow creating Supplier records with name, contact person, phone, email, address, and notes
2. THE Inventory_System SHALL validate that supplier name is unique within the workshop
3. THE Inventory_System SHALL validate email format if provided
4. THE Inventory_System SHALL allow marking suppliers as active or inactive
5. WHEN a supplier is marked inactive, THE Inventory_System SHALL preserve the supplier data but hide it from selection lists

### Requirement 5: Link Items to Suppliers with Pricing

**User Story:** As a workshop administrator, I want to link inventory items to suppliers with pricing, so that I know where to buy each item

#### Acceptance Criteria

1. THE Inventory_System SHALL allow linking an Inventory_Item to multiple Supplier records
2. FOR each item-supplier link, THE Inventory_System SHALL store unit price, currency (default BRL), minimum order quantity, Lead_Time in days, and last price update date
3. THE Inventory_System SHALL allow marking one supplier per item as the Preferred_Supplier
4. WHEN viewing an item, THE Inventory_System SHALL display all linked suppliers sorted with Preferred_Supplier first
5. THE Inventory_System SHALL calculate and display estimated total cost based on unit price and quantity needed

### Requirement 6: Generate Purchase Suggestions

**User Story:** As a workshop administrator, I want automatic purchase suggestions, so that I know what to order and from whom

#### Acceptance Criteria

1. WHEN Stock_Level reaches Reorder_Point (Minimum_Stock + average 7-day usage), THE Inventory_System SHALL create a Purchase_Suggestion
2. THE Purchase_Suggestion SHALL include item details, current stock, suggested order quantity, Preferred_Supplier, unit price, total cost, and Lead_Time
3. THE Inventory_System SHALL calculate suggested order quantity as (Minimum_Stock × 2) - Current_Stock
4. THE Inventory_System SHALL group Purchase_Suggestions by supplier for consolidated ordering
5. THE Inventory_System SHALL display a "Purchase Suggestions" counter in the dashboard
6. THE Inventory_System SHALL allow dismissing a Purchase_Suggestion (marks as reviewed but not ordered)
7. THE Inventory_System SHALL allow converting a Purchase_Suggestion to a purchase order

### Requirement 7: Calculate Reorder Points Based on Usage

**User Story:** As the system, I want to calculate reorder points based on usage patterns, so that suggestions are timely

#### Acceptance Criteria

1. THE Inventory_System SHALL track daily usage for each item based on Stock_Movement records
2. THE Inventory_System SHALL calculate average daily usage over the past 30 days
3. THE Inventory_System SHALL calculate Reorder_Point as (Minimum_Stock + (average daily usage × Lead_Time days))
4. IF Lead_Time is not set for the Preferred_Supplier, THEN THE Inventory_System SHALL use a default of 7 days
5. IF average daily usage is zero, THEN THE Inventory_System SHALL use Reorder_Point = Minimum_Stock + 5

### Requirement 8: Display Inventory Dashboard Widget

**User Story:** As a workshop user, I want to see key inventory metrics on the dashboard, so that I have visibility at a glance

#### Acceptance Criteria

1. THE Inventory_System SHALL display a dashboard widget showing total items, items with low stock count, and pending purchase suggestions count
2. THE dashboard widget SHALL display the 5 most critical items (lowest stock percentage relative to minimum)
3. THE dashboard widget SHALL provide a quick action button to view full inventory list
4. THE dashboard widget SHALL provide a quick action button to view purchase suggestions
5. THE dashboard widget SHALL refresh automatically when stock levels change

### Requirement 9: Filter and Search Inventory

**User Story:** As a workshop user, I want to filter inventory by status and search by name, so that I can quickly find items

#### Acceptance Criteria

1. THE Inventory_System SHALL provide a search input that filters items by name, category, or barcode in real-time
2. THE Inventory_System SHALL provide filter options: all items, low stock only, out of stock (quantity = 0), and items with purchase suggestions
3. THE Inventory_System SHALL provide category filter dropdown populated with unique categories from inventory
4. THE Inventory_System SHALL apply all active filters simultaneously (search AND category AND status)
5. THE Inventory_System SHALL display the count of filtered results

### Requirement 10: Export Purchase Orders

**User Story:** As a workshop administrator, I want to export purchase orders, so that I can send them to suppliers

#### Acceptance Criteria

1. THE Inventory_System SHALL allow selecting multiple Purchase_Suggestions for a single supplier
2. THE Inventory_System SHALL generate a purchase order document containing workshop details, supplier details, item list with quantities and prices, subtotal, and order date
3. THE Inventory_System SHALL provide export formats: PDF and CSV
4. THE PDF format SHALL be formatted and print-ready
5. THE Inventory_System SHALL allow emailing the purchase order directly to the supplier if email is configured

### Requirement 11: Receive Inventory (Process Orders)

**User Story:** As a workshop user, I want to mark orders as received and update stock, so that inventory reflects actual quantities

#### Acceptance Criteria

1. WHEN a purchase order is received, THE Inventory_System SHALL allow entering received quantity per item
2. THE Inventory_System SHALL allow partial receipts (received quantity less than ordered quantity)
3. THE Inventory_System SHALL update Stock_Level by adding received quantity
4. THE Inventory_System SHALL create a Stock_Movement record for each received item with type 'purchase'
5. THE Inventory_System SHALL mark the Purchase_Suggestion as fulfilled when quantity is received
6. IF received quantity differs from ordered quantity, THE Inventory_System SHALL record the variance in notes

### Requirement 12: Bulk Update Pricing

**User Story:** As a workshop administrator, I want to bulk update supplier pricing, so that I can maintain accurate costs

#### Acceptance Criteria

1. THE Inventory_System SHALL provide a bulk price update interface for a selected supplier
2. THE interface SHALL display all items linked to the supplier with current unit price
3. THE Inventory_System SHALL allow editing unit price for multiple items simultaneously
4. THE Inventory_System SHALL validate that new prices are numeric and greater than zero
5. THE Inventory_System SHALL record the price update date when prices are changed
6. THE Inventory_System SHALL show a price change history for the last 5 updates per item

### Requirement 13: Supplier Performance Metrics

**User Story:** As a workshop administrator, I want to see supplier performance metrics, so that I can evaluate suppliers

#### Acceptance Criteria

1. THE Inventory_System SHALL calculate and display per-supplier metrics: total orders, on-time delivery percentage, average Lead_Time, and total spend
2. THE on-time delivery percentage SHALL be calculated as (orders received within Lead_Time / total orders) × 100
3. THE Inventory_System SHALL allow rating a supplier (1-5 stars) when marking an order as received
4. THE Inventory_System SHALL display average rating for each supplier
5. THE Inventory_System SHALL highlight suppliers with on-time delivery below 80% or average rating below 3 stars

### Requirement 14: Automatic Stock Deduction from Service Orders

**User Story:** As a workshop user, I want stock to automatically deduct when parts are used in service orders, so that inventory is always accurate

#### Acceptance Criteria

1. WHEN a service order (OS) includes parts, THE Inventory_System SHALL deduct the part quantity from stock when the OS is marked as completed
2. THE Inventory_System SHALL create a Stock_Movement record for each part used with type 'sale/usage' and reference to the OS ID
3. IF a part quantity is insufficient, THE Inventory_System SHALL display a warning but allow completing the OS with a negative stock indicator
4. THE Inventory_System SHALL allow adjusting part quantities on an OS before marking complete
5. THE Inventory_System SHALL prevent stock deduction if the OS is cancelled or deleted

### Requirement 15: Stock Alerts via Notifications

**User Story:** As a workshop administrator, I want to receive notifications for low stock and purchase suggestions, so that I'm proactive

#### Acceptance Criteria

1. WHEN a Stock_Alert is created, THE Inventory_System SHALL create a notification for users with admin or manager role
2. THE notification SHALL include item name, current stock, and minimum stock
3. WHEN a new Purchase_Suggestion is generated, THE Inventory_System SHALL create a notification
4. THE notification SHALL be dismissible but remain in notification history
5. THE Inventory_System SHALL consolidate multiple stock alerts into a daily summary notification to avoid spam

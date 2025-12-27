# Business Rules and Invariants

This document defines the business rules, constraints, and invariants that must be enforced by any implementation of the 1er Degré workshop management system.

## Table of Contents

- [General Principles](#general-principles)
- [User Rules](#user-rules)
- [Workshop Rules](#workshop-rules)
- [Participation Rules](#participation-rules)
- [Waitlist Rules](#waitlist-rules)
- [Email Communication Rules](#email-communication-rules)
- [Order and Product Rules](#order-and-product-rules)
- [Shipping Rules](#shipping-rules)
- [Invoice Rules](#invoice-rules)
- [Calendar Event Rules](#calendar-event-rules)
- [Questionnaire Rules](#questionnaire-rules)
- [Multi-Tenant Isolation](#multi-tenant-isolation)

---

## General Principles

### Data Integrity
- **Primary Keys**: All entities must have a UUID v4 primary key
- **Timestamps**: All entities must track `created_at` and `updated_at` timestamps
- **Soft Deletes**: Prefer archiving/status changes over hard deletes to maintain audit trails
- **Referential Integrity**: Foreign key references must point to existing entities

### Tenant Isolation
- **Default Tenant**: Phase 1 uses `tenant_id = "1er-Degré"` for all entities
- **Query Filtering**: When multi-tenant mode is active, ALL queries must filter by `tenant_id`
- **Cross-Tenant Protection**: No entity may reference entities from different tenants

---

## User Rules

### Email Uniqueness
- **Constraint**: `email` must be unique across all users within a tenant
- **Validation**: Email format must be valid (RFC 5322)
- **Case Sensitivity**: Email comparisons should be case-insensitive

### Contract Requirements
- **Rule**: If `signed_contract = true`, then `signed_contract_year` must be present
- **Validation**: `signed_contract_year >= 2000` and `<= current year`

### Address Validation
- **Rule**: If `billing_address` or `shipping_address` is present, all required fields must be valid
- **Country Code**: Must be valid ISO 3166-1 alpha-2 code (e.g., "FR")
- **Postal Code**: Format depends on country; implement country-specific validation

### Role Assignment
- **Default**: New users receive `roles = ["participant"]` by default
- **Multiple Roles**: Users may have multiple roles simultaneously
- **Admin Protection**: At least one user must have "admin" role; prevent removal of last admin

### Stripe Integration
- **Uniqueness**: `stripe_customer_id` must be unique if present
- **Immutability**: Once set, `stripe_customer_id` should not change

---

## Workshop Rules

### Status Transitions
Valid `lifecycle_status` transitions:
- `draft` → `active` (publication)
- `active` → `closed` (completion)
- `active` → `canceled` (cancellation)
- `closed` ↔ `active` (reopen if needed)

Invalid transitions:
- Cannot go from `canceled` to `active` or `closed`
- Once `canceled`, workshop is terminal

### Date and Time Validation
- **Rule**: `end_at` must be after `start_at`
- **Lead Time**: Workshops should be created at least 7 days before `start_at` (warning, not error)
- **Past Events**: Cannot create workshops with `start_at` in the past

### Location Requirements
- **Rule**: If `is_remote = false`, `location` object must be present
- **Rule**: If `is_remote = true`, `visio_link` should be present
- **Hybrid**: Both `location` and `visio_link` may be present for hybrid events

### Modification Flags
- **Date Changes**: When `start_at` or `end_at` changes after publication, set `modified_date_flag = true`
- **Location Changes**: When `location` changes after publication, set `modified_location_flag = true`
- **Participant Notification**: Modified flags trigger notification to enrolled participants

### Capacity Management
- **Soft Limit**: `audience_number` is advisory; system may allow over-enrollment
- **Waitlist Activation**: When enrollment reaches `audience_number`, activate waitlist notifications

### Organizer Requirements
- **Primary Organizer**: `organizer` field must reference a user with "organizer" or "trainer" role
- **Co-Organizers**: All `co_organizers` must reference valid users
- **No Duplicates**: `organizer` cannot appear in `co_organizers` array

### Classification Requirements
- **Both Required**: Both `lifecycle_status` and `classification_status` must be present
- **Immutable Classification**: `classification_status` should not change after initial publication

---

## Participation Rules

### Enrollment Validation
- **Unique Enrollment**: User can only have ONE active participation per workshop
- **User Validation**: `user_id` must reference existing user
- **Workshop Validation**: `workshop_id` must reference existing workshop with `lifecycle_status = "active"`

### Status Transitions
Valid `status` transitions:
- `en_attente` → `inscrit` (confirmation)
- `inscrit` → `paye` (payment completed)
- `paye` → `rembourse` (refund processed)
- `paye` → `echange` (exchanged for another workshop)
- Any status → `annule` (cancellation)

### Payment Rules
- **Paid Amount**: If `payment_status = "paid"`, then `price_paid > 0` (unless `ticket_type = "gratuit"`)
- **Free Tickets**: If `ticket_type = "gratuit"`, then `price_paid = 0` and `payment_status = "none"`
- **Refund Validation**: If `status = "rembourse"`, then `payment_status = "refunded"`

### Refund Eligibility (can_refund)
**Computed Field**: `can_refund` is read-only and server-computed based on:

1. **Time-Based Rule**: `true` if `now <= workshop.start_at - 72 hours`
2. **Date/Location Change Exception**: `true` if:
   - Workshop's `modified_date_flag = true` OR `modified_location_flag = true`
   - AND change occurred AFTER this participation's `confirmation_date`
   - AND now is before `workshop.start_at`

**Edge Cases**:
- If participation is already `rembourse` or `annule`, `can_refund = false`
- If workshop is `canceled`, `can_refund = true` regardless of time

### Exchange Rules
- **Parent Reference**: If `status = "echange"`, then `exchange_parent_participation_id` must reference valid participation
- **No Chains**: Exchanged participations cannot themselves be exchanged (max depth = 1)
- **Refund Original**: Parent participation should transition to `rembourse` when exchange is created

### Invoice Access
- **Field**: `invoice_url` is read-only and populated after payment
- **Access Control**: Only the payor (user_id) can access `invoice_url`
- **Generation Timing**: Invoice generated when `payment_status` transitions to "paid"

### Training Completion
- **Post-Event**: `training_completion` and `attended` should only be set after `workshop.end_at`
- **Certificate**: `certificate_url` only present when `completed = true`

---

## Waitlist Rules

### Geographic Matching
- **Radius Search**: Match workshops where `distance(waitlist.city, workshop.location.city) <= radius_km`
- **Family Match**: Only match workshops where `workshop.workshop = waitlist.workshop_family`

### Status Transitions
- `waiting` → `notified` (matching workshop found, email sent)
- `notified` → `converted` (user enrolled in workshop)
- `notified` → `waiting` (notification expired, user didn't enroll)
- Any status → `expired` (waitlist entry closed)

### Notification Rules
- **Once Per Entry**: Each waitlist entry can only trigger ONE notification
- **Set Fields**: When transitioning to `notified`, set `notified_at` and `notified_workshop_id`
- **Expiration**: If no conversion within 7 days of notification, allow re-notification or expire

### Duplicate Prevention
- **Rule**: Same `email` + `workshop_family` + `city` can only have ONE `waiting` entry at a time
- **Reactivation**: If user wants to update preferences, update existing entry rather than create new

---

## Email Communication Rules

### Template Validation
- **Unique Keys**: `template_key` must be unique within tenant
- **Variable Syntax**: Merge variables use `{{variable_name}}` syntax (Mustache-compatible)
- **Required Variables**: All variables marked `required: true` must be provided when scheduling

### Scheduled Email Rules
- **HTML Snapshot**: `html_snapshot` is captured at schedule time and becomes immutable
- **Snapshot Timing**: Render template with `merge_data` when email is scheduled, store result
- **Audit Trail**: Snapshot ensures we can see exact content sent, even if template changes later

### Email Status Transitions
- `scheduled` → `sent` (email dispatched to provider)
- `scheduled` → `failed` (dispatch error)
- `sent` ↔ `scheduled` (retry on failure)

### Mail Log Rules
- **Delivery Tracking**: Log entry created when email transitions to `sent`
- **Event Timestamps**: Each event (`sent`, `delivered`, `opened`, `clicked`, `bounced`) has corresponding timestamp
- **Immutable History**: Once an event timestamp is set, it should not change
- **Provider ID**: `provider_message_id` should be set when available for tracking with email service

---

## Order and Product Rules

### Product Validation
- **SKU Uniqueness**: `sku` must be unique within tenant
- **Price Non-Negative**: `price >= 0`
- **Inventory Tracking**: `inventory_quantity >= 0`; cannot sell if `inventory_quantity = 0`
- **Active Status**: Only `is_active = true` products can be added to orders

### Order Calculation
- **Subtotal**: `subtotal_amount` = sum of all order_items' `line_total`
- **Tax**: `tax_amount` = `subtotal_amount * tax_rate`
- **Total**: `total_amount` = `subtotal_amount + tax_amount + shipping_amount`
- **Validation**: These calculations must be consistent

### Order Item Validation
- **Line Total**: `line_total` = `quantity * unit_price`
- **Snapshot Data**: `product_name`, `product_sku`, and `unit_price` are snapshots from order time
- **Immutability**: Once order is `completed`, order items should not be modified

### Order Status Transitions
- `pending` → `processing` (payment confirmed)
- `processing` → `completed` (shipped)
- `pending` → `cancelled` (cancelled before processing)
- `completed` → `refunded` (full refund issued)

### Inventory Management
- **Reservation**: When order transitions to `processing`, decrement product `inventory_quantity`
- **Cancellation**: If order cancelled, increment inventory back
- **Overselling**: Prevent orders if insufficient inventory

---

## Shipping Rules

### Label Generation
- **Tracking Number**: `tracking_number` = `id` for simplified reference
- **Weight-Based Assignment**:
  1. Calculate `weight_grams` = sum of all order items' weights
  2. Assign to weight bracket: `weight_range_min <= weight_grams <= weight_range_max`
  3. Assign `sequential_index` = next number in that bracket
- **Carrier Selection**: Carrier and service level determined by weight bracket and customer preference

### Weight Brackets (Example)
Standard brackets (configurable):
- 0-1000g: Colissimo Standard
- 1001-2000g: Colissimo Standard
- 2001-5000g: Chronopost Express
- 5001+g: Freight carrier

### Label Status Transitions
- `created` → `printed` (label generated)
- `printed` → `shipped` (package shipped)
- `shipped` → `delivered` (delivered successfully)
- `shipped` → `returned` (delivery failed, returned to sender)

### Shipping Timestamps
- **Shipped At**: Set when status transitions to `shipped`
- **Delivered At**: Set when carrier confirms delivery

---

## Invoice Rules

### Invoice Number
- **Format**: Recommended format `INV-YYYY-NNNNN` (e.g., `INV-2025-01042`)
- **Uniqueness**: `invoice_number` must be unique within tenant
- **Sequential**: Numbers should generally be sequential (gaps allowed)

### Invoice Source
- **Exclusive Or**: Invoice must have EITHER `order_id` OR `workshop_id`, not both
- **Order Invoice**: For product purchases
- **Workshop Invoice**: For participation fees

### Line Item Validation
- **Amount Calculation**: Each line item `amount` = `quantity * unit_price`
- **Subtotal Match**: `subtotal` must equal sum of all line item amounts

### Tax Calculation
- **Tax Total**: `tax_total` = `subtotal * tax_rate`
- **Grand Total**: `grand_total` = `subtotal + tax_total`
- **Tax Rate**: Must be valid for country/region (e.g., France = 0.20)

### Invoice Status Transitions
- `draft` → `issued` (sent to customer)
- `issued` → `paid` (payment received)
- `issued` → `overdue` (due_date passed without payment)
- `overdue` → `paid` (late payment received)
- Any status → `cancelled` (voided before payment)
- `issued` → `void` (administrative void)

### Payment Rules
- **Payment Date**: If `status = "paid"`, then `payment_date` must be present
- **Overdue Logic**: Automatically transition to `overdue` when `now > due_date` and `status = "issued"`
- **Payment Method**: Record method when payment received

### PDF Generation
- **Timing**: Generate `pdf_url` when invoice transitions to `issued`
- **Immutability**: Once issued, invoice content should not change (create new invoice for corrections)

---

## Calendar Event Rules

### Time Validation
- **End After Start**: `end_time` must be after `start_time`
- **All Day Events**: If `all_day = true`, times should be midnight-to-midnight

### Location Requirements
- **Exclusive Or**: Event should have EITHER `location` OR `virtual_meeting_url` OR both
- **Remote Events**: Virtual events should have `virtual_meeting_url`
- **In-Person**: Physical events should have complete `location` object

### Recurrence Rules
- **RFC 5545**: `recurrence_rule` must follow RFC 5545 RRULE format
- **Validation**: Parse and validate RRULE syntax
- **Examples**:
  - Weekly: `FREQ=WEEKLY;BYDAY=MO,WE,FR`
  - Monthly: `FREQ=MONTHLY;BYMONTHDAY=15`
  - With end: `FREQ=WEEKLY;UNTIL=20260331T150000Z`

### Participant Management
- **Workshop Sync**: If `workshop_id` is present, `participant_ids` should match enrolled participations
- **Automatic Updates**: When participation is created/cancelled, update calendar event participants

### Reminder Validation
- **Lead Time**: `minutes_before` should be reasonable (e.g., 1 minute to 2 weeks)
- **Method Availability**: Ensure selected method (email/sms) is available for all participants

---

## Questionnaire Rules

### Question Validation
- **Unique IDs**: Each `question_id` must be unique within questionnaire
- **Order Sequence**: Question `order` should be sequential starting from 1
- **Type-Specific Fields**:
  - `multiple_choice`: Must have `options` array
  - `scale` or `rating`: Must have `scale_min` and `scale_max`
  - `text` or `yes_no`: No additional fields required

### Availability Windows
- **Time-Based Access**: Questionnaire only accepts responses when:
  - `is_active = true` AND
  - `now >= available_from` (if set) AND
  - `now <= available_until` (if set)

### Workshop Association
- **Post-Event**: If `workshop_id` is set, `available_from` should be after `workshop.end_at`
- **Limited Window**: Workshop questionnaires typically available for 1-4 weeks after event

### Response Validation
- **Answer Count**: Must have answers for all `is_required = true` questions
- **Answer Type Match**: Answer type must match question type:
  - `multiple_choice`: string or array of strings
  - `text`: string
  - `rating`/`scale`: number within range
  - `yes_no`: boolean

### Completion Rules
- **Submitted At**: Must be set when `completion_status = "completed"`
- **Time Tracking**: `time_spent_seconds` should reflect actual completion time
- **Immutability**: Once `completed`, responses should not be modified

---

## Multi-Tenant Isolation

### Phase 1: Single Tenant
- All entities have `tenant_id = "1er-Degré"`
- No isolation enforcement needed
- Queries may omit tenant filtering

### Future: Multi-Tenant Mode
When multi-tenant mode is activated:

**Query Filtering**:
- ALL queries must include `WHERE tenant_id = $current_tenant`
- Row-level security policies should enforce tenant isolation
- No entity may reference entities from different tenants

**User Isolation**:
- Users belong to single tenant
- Authentication includes tenant identification
- Session management tracks current tenant

**Data Separation**:
- Physical separation: Separate databases per tenant (most secure)
- Logical separation: Single database with strict RLS policies
- Hybrid: Shared system tables, isolated data tables

**Tenant-Independent Data**:
Some entities may be shared across tenants:
- System email templates (if configurable per-tenant, clone on creation)
- Product catalog (if shared marketplace)
- Administrative entities

**Migration Path**:
- Current data defaults to "1er-Degré" tenant
- New tenants created with unique `tenant_id`
- Implement RLS policies before activating multi-tenant mode

---

## Enforcement Recommendations

### Database Level
- Use CHECK constraints for enumerations
- Use triggers for computed fields like `can_refund`
- Implement foreign key constraints for referential integrity
- Create unique indexes for uniqueness constraints

### Application Level
- Validate business rules before database operations
- Use transactions for multi-step operations
- Implement state machines for status transitions
- Log all status changes for audit trail

### API Level
- Return 400 Bad Request for validation errors
- Return 409 Conflict for business rule violations
- Include clear error messages citing specific rule
- Use optimistic locking (ETags) to prevent concurrent modifications

---

## Changelog

- **2025-10-13**: Initial version covering all entities and core business rules

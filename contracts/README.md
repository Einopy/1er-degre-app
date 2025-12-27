# 1er Degré Workshop Management System - JSON Contracts

Language-agnostic JSON Schema contracts defining the data model for the 1er Degré workshop management system.

## Overview

This directory contains **JSON Schema Draft 2020-12** contracts for all entities in the system. These contracts are database-agnostic and can be implemented on any backend (PostgreSQL, MongoDB, etc.).

### Key Features

- **Modern Schema Format**: JSON Schema Draft 2020-12 for wide compatibility
- **Complete Coverage**: 16+ entities covering workshops, users, payments, communications, and more
- **Validation Ready**: All schemas compile and validate with examples
- **Business Rules**: Comprehensive documentation of invariants and constraints
- **Performance Guidance**: Index recommendations for optimal query performance
- **Multi-Tenant Ready**: Optional `tenant_id` field for future expansion

## Directory Structure

```
contracts/
├── README.md                    # This file
├── INVARIANTS.md               # Business rules and constraints
├── INDEXES.md                  # Database index recommendations
├── schemas/                    # JSON Schema definitions
│   ├── common/                # Reusable components
│   │   ├── address.json
│   │   ├── enums.json
│   │   ├── tenant.json
│   │   ├── timestamps.json
│   │   └── references.json
│   ├── user.json
│   ├── workshop.json
│   ├── participation.json
│   ├── waitlist-entry.json
│   ├── email-template.json
│   ├── scheduled-email.json
│   ├── mail-log.json
│   ├── product.json
│   ├── order.json
│   ├── order-item.json
│   ├── shipping-label.json
│   ├── company.json
│   ├── invoice.json
│   ├── calendar-event.json
│   ├── questionnaire.json
│   └── questionnaire-response.json
└── examples/                   # Valid example data
    ├── user-example-1.json
    ├── user-example-2.json
    ├── workshop-example-fdfp.json
    ├── workshop-example-hd.json
    └── ... (2 examples per entity)
```

## Entities

### Core Entities

#### User
User profile and account information for workshop participants, organizers, and staff.

**Key Fields**:
- Profile: `email`, `first_name`, `last_name`, `birthdate`
- Animation: `language_animation`, `outside_animation`
- Contract: `signed_contract`, `signed_contract_year`
- Permissions: `roles` (array of participant, organizer, trainer, admin, etc.)
- Payment: `stripe_customer_id`
- Addresses: `billing_address`, `shipping_address`
- Tags: `status_labels` (flexible array)

#### Workshop
Training session or workshop with scheduling and organization details.

**Key Fields**:
- Identity: `title`, `description`, `workshop` (FDFP/HD), `type`
- Organization: `organizer`, `co_organizers[]`
- Status: `lifecycle_status` (active/closed/canceled), `classification_status` (13 audience categories)
- Capacity: `audience_number`
- Schedule: `start_at`, `end_at`
- Location: `is_remote`, `location`, `visio_link`, `mural_link`
- Change Tracking: `modified_date_flag`, `modified_location_flag`
- Communication: `mail_pre_html`, `mail_post_html`

**Classification Status Values**:
- `benevole_grand_public`
- `interne_*`: asso, entreprise, profs, etudiants_alumnis, elus, agents
- `externe_*`: asso, entreprise, profs, etudiants_alumnis, elus, agents

#### Participation
User enrollment in a workshop with payment and attendance tracking.

**Key Fields**:
- References: `user_id`, `workshop_id`
- Status: `status` (en_attente, inscrit, paye, rembourse, echange, annule)
- Payment: `payment_status`, `ticket_type`, `price_paid`
- Refund: `can_refund` (computed: 72h rule + date/location exceptions)
- Exchange: `exchange_parent_participation_id`
- Invoice: `invoice_url` (read-only, payor access only)
- Completion: `training_completion`, `attended`, `questionnaire_response_id`
- Communication: `mail_disabled`

### Waitlist and Matching

#### WaitlistEntry
Geographic and family-based workshop interest tracking.

**Key Fields**:
- Contact: `email`, `user_id` (optional)
- Criteria: `workshop_family` (FDFP/HD), `city`, `radius_km` (default 35)
- Status: `status` (waiting, notified, converted, expired)
- Matching: `geographic_hint`, `notified_workshop_id`

### Communication

#### EmailTemplate
Reusable email template with merge variable support.

**Key Fields**:
- Identity: `template_key`, `name`, `description`
- Content: `subject`, `body_html`, `body_text`
- Variables: `variables[]` (name, description, required)

#### ScheduledEmail
Email scheduled for future delivery with HTML snapshot.

**Key Fields**:
- Template: `template_id`, `merge_data`
- Recipient: `recipient_email`, `recipient_user_id`
- Timing: `scheduled_at`, `sent_at`
- Audit: `html_snapshot` (captured at schedule time, read-only)
- Status: `status` (scheduled, sent, failed)

#### MailLog
Email delivery tracking and analytics.

**Key Fields**:
- Delivery: `delivery_status`, `sent_at`, `delivered_at`
- Engagement: `opened_at`, `clicked_at`
- Bounces: `bounced_at`, `bounce_reason`
- Tracking: `provider_message_id`

### Commerce

#### Product
Physical or digital product available for purchase.

**Key Fields**:
- Identity: `sku`, `name`, `description`, `category`
- Pricing: `price`, `variants[]`
- Inventory: `inventory_quantity`, `is_active`
- Shipping: `weight_grams`

#### Order
Customer order with items and shipping details.

**Key Fields**:
- Identity: `order_number`, `user_id`, `order_date`
- Pricing: `subtotal_amount`, `tax_amount`, `shipping_amount`, `total_amount`
- Status: `status` (pending, processing, completed, cancelled, refunded)
- Delivery: `shipping_address`, `notes`

#### OrderItem
Individual line item within an order.

**Key Fields**:
- References: `order_id`, `product_id`
- Snapshot: `product_name`, `product_sku`, `unit_price`
- Quantity: `quantity`, `line_total`
- Variant: `variant_id` (optional)

#### ShippingLabel
Shipping label with weight-based assignment and tracking.

**Key Fields**:
- Identity: `id` = `tracking_number` (simplified tracking)
- Assignment: `weight_range_min`, `weight_range_max`, `sequential_index`
- Carrier: `carrier`, `service_level`, `shipping_cost`
- Status: `status` (created, printed, shipped, delivered, returned)
- Tracking: `shipped_at`, `delivered_at`

### Financial

#### Company
Organization for B2B transactions and ERP integration.

**Key Fields**:
- Identity: `name`, `legal_name`, `tax_id`
- Integration: `odoo_customer_id`
- Contact: `contact_email`, `contact_phone`, `website`
- Billing: `billing_address`

#### Invoice
Financial document for orders and services.

**Key Fields**:
- Identity: `invoice_number`, `issue_date`, `due_date`
- Source: `order_id` XOR `workshop_id`, `user_id`, `company_id`
- Line Items: `line_items[]` (description, quantity, unit_price, amount)
- Totals: `subtotal`, `tax_rate`, `tax_total`, `grand_total`
- Status: `status` (draft, issued, paid, overdue, cancelled, void)
- Payment: `payment_date`, `payment_method`
- Document: `pdf_url` (read-only)

### Events and Feedback

#### CalendarEvent
Calendar event with recurrence and participant tracking.

**Key Fields**:
- Reference: `workshop_id` (optional)
- Schedule: `start_time`, `end_time`, `all_day`
- Location: `location` XOR `virtual_meeting_url` (or both)
- Recurrence: `recurrence_rule` (RFC 5545 RRULE format)
- Participants: `participant_ids[]`, `organizer_ids[]`
- Reminders: `reminder_settings` (minutes_before, method)

#### Questionnaire
Feedback or assessment structure with typed questions.

**Key Fields**:
- Reference: `workshop_id` (optional)
- Content: `title`, `description`, `questions[]`
- Question Types: multiple_choice, text, rating, yes_no, scale
- Availability: `is_active`, `available_from`, `available_until`

#### QuestionnaireResponse
Participant's answers to a questionnaire.

**Key Fields**:
- References: `questionnaire_id`, `participation_id`, `user_id`
- Answers: `answers[]` (question_id, answer)
- Completion: `completion_status`, `submitted_at`, `time_spent_seconds`

## Schema Conventions

### JSON Schema Draft 2020-12
All schemas use:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://1er-degre.fr/schemas/entity-name.json"
}
```

### Field Annotations

**readOnly**: Field is computed/derived, not provided on input
```json
{
  "can_refund": {
    "type": "boolean",
    "readOnly": true,
    "description": "Server-computed: true if now ≤ start_at − 72h..."
  }
}
```

**writeOnly**: Field accepted on input but never returned (e.g., passwords)

**format**: Standard formats for validation
- `email`: Email addresses
- `uri`: URLs
- `uuid`: UUID v4 identifiers
- `date`: YYYY-MM-DD
- `date-time`: ISO 8601 timestamps

### Common Patterns

**Nullable Fields**: Use `"type": ["string", "null"]`

**Arrays with Defaults**:
```json
{
  "co_organizers": {
    "type": "array",
    "items": { "type": "string", "format": "uuid" },
    "default": []
  }
}
```

**Enumerations**: Reference `common/enums.json` or define inline
```json
{
  "status": {
    "type": "string",
    "enum": ["pending", "processing", "completed"]
  }
}
```

## Validation

### Schema Validation Tools

**Node.js (AJV)**:
```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schema = require("./contracts/schemas/user.json");
const validate = ajv.compile(schema);

const valid = validate(userData);
if (!valid) console.log(validate.errors);
```

**Python (jsonschema)**:
```python
import jsonschema
import json

with open("contracts/schemas/user.json") as f:
    schema = json.load(f)

with open("contracts/examples/user-example-1.json") as f:
    data = json.load(f)

jsonschema.validate(instance=data, schema=schema)
```

**Online Validators**:
- [jsonschemavalidator.net](https://www.jsonschemavalidator.net/)
- [jsonschemalint.com](https://jsonschemalint.com/)

### Example Validation

All examples in `contracts/examples/` are valid against their schemas. Use them as reference implementations.

## Business Rules

See [INVARIANTS.md](./INVARIANTS.md) for comprehensive documentation of:
- Data integrity constraints
- Status transition rules
- Computed field logic
- Validation requirements
- Multi-tenant isolation rules

### Key Business Rules

**Refund Eligibility** (`participation.can_refund`):
- True if current time ≤ workshop start − 72 hours
- OR if workshop date/location changed after enrollment
- False if participation already refunded/cancelled

**Workshop Lifecycle**:
- `active` → `closed` (normal completion)
- `active` → `canceled` (cancellation)
- Cannot transition from `canceled` to other states

**Participation Uniqueness**:
- User can have only ONE active participation per workshop
- Cancelled/refunded participations don't count toward this limit

**Invoice Numbering**:
- Format: `INV-YYYY-NNNNN`
- Must be unique within tenant
- Sequential numbering recommended

## Performance

See [INDEXES.md](./INDEXES.md) for:
- Recommended database indexes
- Query optimization strategies
- Performance monitoring queries
- Multi-tenant indexing patterns

### Critical Indexes

**Users**:
- Unique index on `email` (case-insensitive)
- Index on `stripe_customer_id`
- GIN index on `roles` array

**Workshops**:
- Composite index on `(lifecycle_status, start_at)`
- Index on `classification_status`
- Full-text search on title/description

**Participations**:
- Unique composite on `(user_id, workshop_id)` for active participations
- Index on `(workshop_id, status)`
- Index on `(user_id, status)`

## Multi-Tenant Support

### Phase 1: Single Tenant
- All entities have `tenant_id = "1er-Degré"`
- No isolation enforcement required
- Queries may omit tenant filtering

### Future: Multi-Tenant Mode
When activated:
- ALL queries must filter by `tenant_id`
- Implement Row-Level Security (RLS) policies
- Add `tenant_id` to composite indexes
- Prevent cross-tenant entity references

### Migration Path
```sql
-- Set default for existing data
UPDATE users SET tenant_id = '1er-Degré' WHERE tenant_id IS NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant'));
```

## Implementation Examples

### TypeScript Types Generation

Use tools like `json-schema-to-typescript`:
```bash
npm install -g json-schema-to-typescript
json2ts -i contracts/schemas/user.json -o src/types/user.ts
```

### GraphQL Schema Generation

Use `@graphql-tools/schema`:
```javascript
import { makeExecutableSchema } from '@graphql-tools/schema';
import userSchema from './contracts/schemas/user.json';

// Convert JSON Schema to GraphQL SDL
const typeDefs = convertJSONSchemaToGraphQL(userSchema);
const schema = makeExecutableSchema({ typeDefs, resolvers });
```

### Database Migration

**Supabase/PostgreSQL**:
```sql
-- Create users table from schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  birthdate DATE,
  language_animation TEXT,
  outside_animation TEXT,
  signed_contract BOOLEAN NOT NULL DEFAULT false,
  signed_contract_year INTEGER CHECK (signed_contract_year >= 2000),
  roles TEXT[] NOT NULL DEFAULT ARRAY['participant'],
  stripe_customer_id TEXT UNIQUE,
  billing_address JSONB,
  shipping_address JSONB,
  status_labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  tenant_id TEXT NOT NULL DEFAULT '1er-Degré',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## Testing

### Schema Validation Tests
```javascript
describe('User Schema', () => {
  it('validates correct user data', () => {
    const user = require('./examples/user-example-1.json');
    expect(validate(user)).toBe(true);
  });

  it('rejects missing required fields', () => {
    const invalidUser = { email: 'test@example.com' };
    expect(validate(invalidUser)).toBe(false);
  });
});
```

### Business Rule Tests
```javascript
describe('Participation Refund Rules', () => {
  it('allows refund within 72 hours', () => {
    const participation = createParticipation({
      workshop: { start_at: addHours(now, 73) }
    });
    expect(participation.can_refund).toBe(true);
  });

  it('blocks refund after 72 hours', () => {
    const participation = createParticipation({
      workshop: { start_at: addHours(now, 71) }
    });
    expect(participation.can_refund).toBe(false);
  });
});
```

## Changelog

### 2025-10-13 - Initial Release
- Created 16+ entity schemas with JSON Schema Draft 2020-12
- Added 2 validation examples per entity
- Documented business rules in INVARIANTS.md
- Provided index recommendations in INDEXES.md
- Included multi-tenant support with optional `tenant_id`
- Defined 13 classification status values for workshop taxonomy
- Implemented readOnly annotations for computed fields

## Support

For questions or issues with these contracts:
1. Review [INVARIANTS.md](./INVARIANTS.md) for business rules
2. Check [INDEXES.md](./INDEXES.md) for performance guidance
3. Validate examples against schemas
4. Consult JSON Schema Draft 2020-12 specification

## License

These contracts are part of the 1er Degré workshop management system.

# Database Indexes and Performance Optimization

This document provides recommendations for database indexes to optimize query performance when implementing the 1er Degré workshop management system.

## Table of Contents

- [General Indexing Strategy](#general-indexing-strategy)
- [User Indexes](#user-indexes)
- [Workshop Indexes](#workshop-indexes)
- [Participation Indexes](#participation-indexes)
- [Waitlist Indexes](#waitlist-indexes)
- [Email Communication Indexes](#email-communication-indexes)
- [Order and Product Indexes](#order-and-product-indexes)
- [Shipping Indexes](#shipping-indexes)
- [Invoice and Company Indexes](#invoice-and-company-indexes)
- [Calendar Event Indexes](#calendar-event-indexes)
- [Questionnaire Indexes](#questionnaire-indexes)
- [Multi-Tenant Indexes](#multi-tenant-indexes)

---

## General Indexing Strategy

### Primary Keys
- All `id` fields (UUID) are automatically indexed as primary keys
- B-tree indexes are optimal for UUID lookups

### Foreign Keys
- All foreign key columns should have indexes for efficient joins
- Composite indexes may be more efficient than single-column for common join patterns

### Unique Constraints
- Create unique indexes for fields requiring uniqueness
- Unique indexes also serve as lookup indexes

### Partial Indexes
- For status-based queries, consider partial indexes filtering on active/relevant records
- Example: `WHERE lifecycle_status = 'active'`

### Covering Indexes
- Include frequently accessed columns in composite indexes to enable index-only scans
- Balance index size vs. query performance

### Index Maintenance
- Regular VACUUM and ANALYZE on PostgreSQL
- Monitor index usage and remove unused indexes
- Rebuild fragmented indexes periodically

---

## User Indexes

### Primary Lookups
```sql
-- Email lookup (authentication, uniqueness check)
CREATE UNIQUE INDEX idx_users_email ON users(email);
-- Case-insensitive version
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));

-- Stripe customer lookup
CREATE UNIQUE INDEX idx_users_stripe_customer_id
  ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

### Role-Based Queries
```sql
-- Find users by role (using GIN for array containment)
CREATE INDEX idx_users_roles ON users USING GIN(roles);
```

### Tenant Filtering
```sql
-- Multi-tenant queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Composite: tenant + email (common authentication query)
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

### Status and Labels
```sql
-- Status labels search (GIN for array containment)
CREATE INDEX idx_users_status_labels ON users USING GIN(status_labels);
```

---

## Workshop Indexes

### Primary Queries
```sql
-- Lifecycle status filtering
CREATE INDEX idx_workshops_lifecycle_status ON workshops(lifecycle_status);

-- Classification status filtering
CREATE INDEX idx_workshops_classification_status ON workshops(classification_status);

-- Combined status filtering (common query)
CREATE INDEX idx_workshops_status_composite
  ON workshops(lifecycle_status, classification_status);
```

### Date-Based Queries
```sql
-- Upcoming workshops
CREATE INDEX idx_workshops_start_at ON workshops(start_at);

-- Active workshops within date range
CREATE INDEX idx_workshops_active_dates
  ON workshops(start_at, end_at)
  WHERE lifecycle_status = 'active';

-- Past workshops (for archives)
CREATE INDEX idx_workshops_end_at ON workshops(end_at);
```

### Organizer Queries
```sql
-- Find workshops by organizer
CREATE INDEX idx_workshops_organizer ON workshops(organizer);

-- Co-organizers search (GIN for array containment)
CREATE INDEX idx_workshops_co_organizers
  ON workshops USING GIN(co_organizers);
```

### Workshop Family and Type
```sql
-- Filter by workshop family (FDFP/HD)
CREATE INDEX idx_workshops_family ON workshops(workshop);

-- Combined: family + type + lifecycle
CREATE INDEX idx_workshops_family_type_lifecycle
  ON workshops(workshop, type, lifecycle_status);
```

### Tenant Filtering
```sql
-- Multi-tenant + active workshops
CREATE INDEX idx_workshops_tenant_lifecycle
  ON workshops(tenant_id, lifecycle_status);
```

### Full-Text Search
```sql
-- Full-text search on title and description
CREATE INDEX idx_workshops_search
  ON workshops USING GIN(to_tsvector('french', title || ' ' || COALESCE(description, '')));
```

---

## Participation Indexes

### Primary Lookups
```sql
-- User's participations
CREATE INDEX idx_participations_user_id ON participations(user_id);

-- Workshop's participants
CREATE INDEX idx_participations_workshop_id ON participations(workshop_id);

-- Unique enrollment constraint
CREATE UNIQUE INDEX idx_participations_user_workshop
  ON participations(user_id, workshop_id)
  WHERE status NOT IN ('annule', 'rembourse');
```

### Status Queries
```sql
-- Filter by participation status
CREATE INDEX idx_participations_status ON participations(status);

-- Payment status queries
CREATE INDEX idx_participations_payment_status ON participations(payment_status);

-- Combined status filtering
CREATE INDEX idx_participations_status_composite
  ON participations(status, payment_status);
```

### User Dashboard Query
```sql
-- Covering index for user's active participations
CREATE INDEX idx_participations_user_dashboard
  ON participations(user_id, status, workshop_id, created_at)
  WHERE status NOT IN ('annule', 'rembourse');
```

### Workshop Management Query
```sql
-- Workshop participant list with payment info
CREATE INDEX idx_participations_workshop_details
  ON participations(workshop_id, status, payment_status, user_id);
```

### Exchange Tracking
```sql
-- Find exchanges from parent participation
CREATE INDEX idx_participations_exchange_parent
  ON participations(exchange_parent_participation_id)
  WHERE exchange_parent_participation_id IS NOT NULL;
```

### Tenant Filtering
```sql
CREATE INDEX idx_participations_tenant ON participations(tenant_id);
```

---

## Waitlist Indexes

### Geographic Matching
```sql
-- City-based matching
CREATE INDEX idx_waitlist_city ON waitlist_entries(city);

-- Workshop family filtering
CREATE INDEX idx_waitlist_family ON waitlist_entries(workshop_family);

-- Combined: family + city + status
CREATE INDEX idx_waitlist_matching
  ON waitlist_entries(workshop_family, city, status)
  WHERE status = 'waiting';
```

### Status Queries
```sql
-- Active waitlist entries
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);
```

### User Lookups
```sql
-- Find user's waitlist entries
CREATE INDEX idx_waitlist_user_id ON waitlist_entries(user_id)
  WHERE user_id IS NOT NULL;

-- Email lookup (anonymous waitlist)
CREATE INDEX idx_waitlist_email ON waitlist_entries(email);
```

### Notification Tracking
```sql
-- Recently notified entries
CREATE INDEX idx_waitlist_notified
  ON waitlist_entries(notified_at)
  WHERE notified_at IS NOT NULL;
```

---

## Email Communication Indexes

### Email Templates
```sql
-- Template key lookup
CREATE UNIQUE INDEX idx_email_templates_key
  ON email_templates(template_key, tenant_id);

-- Active templates
CREATE INDEX idx_email_templates_active
  ON email_templates(tenant_id)
  WHERE is_active = true;
```

### Scheduled Emails
```sql
-- Template reference
CREATE INDEX idx_scheduled_emails_template
  ON scheduled_emails(template_id);

-- Recipient lookup
CREATE INDEX idx_scheduled_emails_recipient
  ON scheduled_emails(recipient_email);

-- User's scheduled emails
CREATE INDEX idx_scheduled_emails_user
  ON scheduled_emails(recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- Pending emails for sending
CREATE INDEX idx_scheduled_emails_pending
  ON scheduled_emails(scheduled_at, status)
  WHERE status = 'scheduled';
```

### Mail Logs
```sql
-- Recipient lookup
CREATE INDEX idx_mail_logs_recipient ON mail_logs(recipient_email);

-- User's email history
CREATE INDEX idx_mail_logs_user ON mail_logs(recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- Delivery status tracking
CREATE INDEX idx_mail_logs_status ON mail_logs(delivery_status);

-- Time-based queries
CREATE INDEX idx_mail_logs_sent_at ON mail_logs(sent_at);

-- Provider message tracking
CREATE INDEX idx_mail_logs_provider_id
  ON mail_logs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
```

---

## Order and Product Indexes

### Products
```sql
-- SKU lookup
CREATE UNIQUE INDEX idx_products_sku ON products(sku, tenant_id);

-- Active products
CREATE INDEX idx_products_active
  ON products(is_active)
  WHERE is_active = true;

-- Category filtering
CREATE INDEX idx_products_category ON products(category)
  WHERE category IS NOT NULL;

-- Full-text search
CREATE INDEX idx_products_search
  ON products USING GIN(to_tsvector('french', name || ' ' || description));
```

### Orders
```sql
-- Order number lookup
CREATE UNIQUE INDEX idx_orders_order_number
  ON orders(order_number, tenant_id);

-- User's orders
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Status filtering
CREATE INDEX idx_orders_status ON orders(status);

-- Date-based queries
CREATE INDEX idx_orders_date ON orders(order_date DESC);

-- User's order history (covering index)
CREATE INDEX idx_orders_user_history
  ON orders(user_id, order_date DESC, status, total_amount);
```

### Order Items
```sql
-- Order's items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Product sales tracking
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

---

## Shipping Indexes

### Shipping Labels
```sql
-- Order lookup
CREATE INDEX idx_shipping_labels_order_id ON shipping_labels(order_id);

-- Status filtering
CREATE INDEX idx_shipping_labels_status ON shipping_labels(status);

-- Weight bracket tracking
CREATE INDEX idx_shipping_labels_weight_bracket
  ON shipping_labels(weight_range_min, weight_range_max, sequential_index);

-- Tracking queries
CREATE INDEX idx_shipping_labels_shipped_at
  ON shipping_labels(shipped_at)
  WHERE shipped_at IS NOT NULL;

-- In-transit shipments
CREATE INDEX idx_shipping_labels_in_transit
  ON shipping_labels(status, shipped_at)
  WHERE status IN ('shipped');
```

---

## Invoice and Company Indexes

### Companies
```sql
-- Odoo integration
CREATE INDEX idx_companies_odoo_id
  ON companies(odoo_customer_id)
  WHERE odoo_customer_id IS NOT NULL;

-- Name lookup
CREATE INDEX idx_companies_name ON companies(name);

-- Tax ID lookup
CREATE INDEX idx_companies_tax_id ON companies(tax_id)
  WHERE tax_id IS NOT NULL;
```

### Invoices
```sql
-- Invoice number lookup
CREATE UNIQUE INDEX idx_invoices_number
  ON invoices(invoice_number, tenant_id);

-- Customer invoices
CREATE INDEX idx_invoices_user_id ON invoices(user_id);

-- Company invoices
CREATE INDEX idx_invoices_company_id ON invoices(company_id)
  WHERE company_id IS NOT NULL;

-- Order reference
CREATE INDEX idx_invoices_order_id ON invoices(order_id)
  WHERE order_id IS NOT NULL;

-- Workshop reference
CREATE INDEX idx_invoices_workshop_id ON invoices(workshop_id)
  WHERE workshop_id IS NOT NULL;

-- Status filtering
CREATE INDEX idx_invoices_status ON invoices(status);

-- Overdue invoices
CREATE INDEX idx_invoices_overdue
  ON invoices(due_date)
  WHERE status = 'issued' OR status = 'overdue';

-- Date range queries
CREATE INDEX idx_invoices_dates
  ON invoices(issue_date, due_date, status);
```

---

## Calendar Event Indexes

### Calendar Events
```sql
-- Workshop reference
CREATE INDEX idx_calendar_events_workshop_id
  ON calendar_events(workshop_id)
  WHERE workshop_id IS NOT NULL;

-- Date range queries
CREATE INDEX idx_calendar_events_time_range
  ON calendar_events(start_time, end_time);

-- Upcoming events
CREATE INDEX idx_calendar_events_upcoming
  ON calendar_events(start_time)
  WHERE start_time > NOW();

-- Participant lookup (GIN for array containment)
CREATE INDEX idx_calendar_events_participants
  ON calendar_events USING GIN(participant_ids);

-- Organizer lookup (GIN for array containment)
CREATE INDEX idx_calendar_events_organizers
  ON calendar_events USING GIN(organizer_ids);

-- Recurring events
CREATE INDEX idx_calendar_events_recurring
  ON calendar_events(recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;
```

---

## Questionnaire Indexes

### Questionnaires
```sql
-- Workshop reference
CREATE INDEX idx_questionnaires_workshop_id
  ON questionnaires(workshop_id)
  WHERE workshop_id IS NOT NULL;

-- Active questionnaires
CREATE INDEX idx_questionnaires_active
  ON questionnaires(is_active)
  WHERE is_active = true;

-- Availability window
CREATE INDEX idx_questionnaires_availability
  ON questionnaires(available_from, available_until)
  WHERE is_active = true;
```

### Questionnaire Responses
```sql
-- Questionnaire responses
CREATE INDEX idx_responses_questionnaire_id
  ON questionnaire_responses(questionnaire_id);

-- User responses
CREATE INDEX idx_responses_user_id
  ON questionnaire_responses(user_id);

-- Participation responses
CREATE INDEX idx_responses_participation_id
  ON questionnaire_responses(participation_id)
  WHERE participation_id IS NOT NULL;

-- Completion tracking
CREATE INDEX idx_responses_completion
  ON questionnaire_responses(completion_status, submitted_at);

-- Unique response per user per questionnaire
CREATE UNIQUE INDEX idx_responses_user_questionnaire
  ON questionnaire_responses(user_id, questionnaire_id)
  WHERE completion_status = 'completed';
```

---

## Multi-Tenant Indexes

When multi-tenant mode is activated, add `tenant_id` to all composite indexes:

### Examples
```sql
-- Users: tenant + email authentication
CREATE UNIQUE INDEX idx_users_tenant_email
  ON users(tenant_id, LOWER(email));

-- Workshops: tenant + active + date range
CREATE INDEX idx_workshops_tenant_active_dates
  ON workshops(tenant_id, lifecycle_status, start_at)
  WHERE lifecycle_status = 'active';

-- Participations: tenant + user
CREATE INDEX idx_participations_tenant_user
  ON participations(tenant_id, user_id, status);

-- Orders: tenant + user + date
CREATE INDEX idx_orders_tenant_user_date
  ON orders(tenant_id, user_id, order_date DESC);
```

### Tenant Isolation with RLS
If using Row Level Security policies:
```sql
-- RLS policies automatically filter by tenant_id
-- Indexes should still include tenant_id for optimal performance
-- PostgreSQL can use partial indexes with RLS filtering
```

---

## Index Monitoring

### PostgreSQL Queries

#### Find Unused Indexes
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### Find Missing Indexes (High Sequential Scans)
```sql
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

#### Index Size Report
```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

---

## Performance Testing

### Load Testing Recommendations
1. Generate realistic test data volumes:
   - 10,000+ users
   - 1,000+ workshops
   - 50,000+ participations
   - 100,000+ email logs

2. Test common query patterns:
   - User authentication (email lookup)
   - Workshop listing (filtered by status, date)
   - User dashboard (participations with workshop details)
   - Admin reports (aggregations by status, date ranges)

3. Use EXPLAIN ANALYZE to verify index usage:
```sql
EXPLAIN ANALYZE
SELECT * FROM workshops
WHERE lifecycle_status = 'active'
  AND start_at >= NOW()
  AND tenant_id = '1er-Degré'
ORDER BY start_at
LIMIT 20;
```

4. Monitor slow query logs and optimize indexes based on actual usage patterns

---

## Changelog

- **2025-10-13**: Initial version covering all entities with comprehensive indexing strategy

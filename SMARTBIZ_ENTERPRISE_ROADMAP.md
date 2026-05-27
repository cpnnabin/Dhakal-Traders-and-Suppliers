# SmartBiz ERP — Enterprise Improvement Roadmap

This document turns the requested end-state into a practical implementation path for the current repository.

## Current foundation already in the repo

- Public website and ERP already coexist in `client/src/App.tsx`.
- POS already has a shared shell in `client/src/pages/POSDashboard.tsx`.
- Inventory already exists as a separate feature area in `client/src/features/inventory/`.
- Finance/reporting logic already exists in the POS ledger and report pages.
- Realtime helpers already exist through `client/src/sockets/socket.ts` and server socket wiring.

## Enterprise target

### 1) Connected business workflow

Public Website → Customer Inquiry → Admin Chat → Quotation → Order → POS/Billing → Inventory Update → Accounting → Reports

### 2) Core modules

- Website
- Auth
- Dashboard
- Inventory
- Sales / POS
- Finance
- Analytics
- Reports
- Users
- Settings

### 3) Role experiences

- Owner: revenue, profit, analytics, reports
- Admin: users, inventory, products, orders, chats
- Cashier: POS, invoices, customers
- Supplier: supply requests, stock requests, payment status
- Customer: order history, quotations, invoices

## Phased implementation plan

### Phase 1 — Normalize app structure

Goal: keep one router, one dashboard shell, one inventory system, one POS flow.

- Consolidate public website routes into a single site shell.
- Keep POS in `client/src/features/sales/pos/` as the canonical sales area.
- Keep inventory in `client/src/features/inventory/` as the canonical inventory area.
- Remove duplicate or legacy pages only after verifying they are unused.

### Phase 2 — Inventory unification

Goal: replace the old product/stock split with one inventory model.

- Inventory dashboard
- Products
- Categories
- Brands
- Warehouses
- Stock IN
- Stock OUT
- Low stock
- Damage stock
- Stock movement
- Batch tracking
- Expiry tracking
- Inventory analytics

### Phase 3 — POS modernization

Goal: make the POS feel like a modern tablet-first billing system.

- Barcode search and scan support
- Touch-friendly layouts
- Keyboard shortcuts
- Thermal printer output
- Customer quick select
- Offline billing cache
- Realtime invoice/stock sync via Socket.IO

### Phase 4 — Smart dashboard

Goal: turn cards into operational analytics.

- Sales today
- Monthly revenue
- Top products
- Low stock
- Pending payments
- Profit/loss
- Realtime notifications
- Charts using Recharts

### Phase 5 — Finance module

Goal: make accounting usable for daily operations.

- Ledger
- Cashbook
- Expenses
- Payment in
- Payment out
- Profit/loss
- Daily / weekly / monthly / custom filters

### Phase 6 — Role-based UX

Goal: each role sees only what it needs.

- Owner dashboard emphasizes analytics
- Admin dashboard emphasizes operations
- Cashier dashboard emphasizes billing
- Supplier dashboard emphasizes procurement
- Customer dashboard emphasizes orders and invoices

### Phase 7 — UI/UX cleanup

Goal: modernize the UI without rewriting everything at once.

- Reusable UI components
- Better spacing and typography
- Soft shadows and status badges
- Responsive sidebar
- Mobile cashier layouts
- Cleaner tables and cards

## Files that are already aligned with the target

- `client/src/pages/POSDashboard.tsx`
- `client/src/pages/pos/ProductEntry.tsx`
- `client/src/pages/pos/Ledger.tsx`
- `client/src/pages/pos/Reports.tsx`
- `client/src/features/inventory/index.tsx`
- `client/src/features/inventory/InventoryDashboard.tsx`
- `client/src/features/sales/pos/POSDashboard.tsx`
- `client/src/features/sales/pos/CartPage.tsx`
- `client/src/features/sales/pos/CheckoutPage.tsx`
- `client/src/features/sales/pos/InvoicePage.tsx`
- `client/src/features/sales/pos/POSSettings.tsx`

## Files that still need major refactoring later

- `client/src/App.tsx`
- `client/src/pages/POSDashboard.tsx`
- `client/src/pages/pos/Billing.tsx`
- `client/src/pages/pos/Orders.tsx`
- `client/src/pages/pos/Customers.tsx`
- `client/src/pages/pos/Reports.tsx`
- `client/src/features/inventory/*.tsx`
- `server/index.js`
- `client/functions/api/*.js`

## Recommended execution order

1. Finish the inventory structure and naming cleanup.
2. Split POS into cart, checkout, invoice, and settings screens.
3. Add role-based landing dashboards.
4. Add Recharts-powered analytics widgets.
5. Add realtime notification events and UI.
6. Clean legacy routes and duplicate pages.
7. Polish website/ERP integration end-to-end.

## Notes

- The repository already contains much of the requested domain logic; the main job is consolidation and UX unification.
- The safest approach is incremental refactoring, not a big-bang rewrite.
- The public website should stay as-is structurally, but modernized visually and wired into inquiry/chat/order flows.
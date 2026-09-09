# Step 10 — Backend, API, Database, Security & Final QA

## Database
Use Prisma/PostgreSQL-ready schema.

Core entities:
- User
- Role
- Permission
- Restaurant
- Table
- MenuCategory
- MenuItem
- Order
- OrderItem
- KOT
- Bill
- Payment
- Customer
- Review
- RewardClaim
- LoyaltyAccount
- LoyaltyTransaction
- Coupon
- CouponRedemption
- InventoryItem
- StockTransaction
- Supplier
- PurchaseOrder
- DeliveryOrder
- Address
- Campaign
- MessageTemplate
- MessageLog
- Consent
- AuditLog

## Critical Constraints
At minimum:
- unique bill number
- unique reward claim per bill
- unique coupon code
- unique loyalty account per customer
- coupon redemption cannot exceed allowed usage
- payment cannot exceed valid bill rules

Use database transactions for:
- payment
- reward claim
- coupon redemption
- loyalty points
- inventory transactions

## API
Create clean REST endpoints/services for:
- auth
- users
- menu
- tables
- orders
- KOT
- bills
- payments
- customers
- reviews
- rewards
- loyalty
- coupons
- inventory
- delivery
- campaigns
- WhatsApp messages
- reports

Validate every request with Zod.

## Security
- Authentication
- RBAC
- Authorization
- Rate limiting
- Input validation
- Secure sessions
- Audit logs
- Sensitive-data protection
- Server-side reward validation
- No trust in client-submitted price/discount/reward status

## Important QR Security
Never put a reusable secret or editable reward amount directly in a public QR code.

Use a short-lived/signed token or bill reference and validate eligibility on the server.

## Testing
Test:
- Duplicate QR scan
- Same bill from multiple devices
- Expired coupon
- Coupon reuse
- Invalid bill
- Unpaid bill
- Refunded bill
- Cancelled bill
- Concurrent reward claims
- Loyalty calculation
- Inventory updates
- Delivery status
- Permission violations

## Final Goal
A complete small-restaurant ERP with POS + KOT + kitchen + CRM + QR feedback + bill-linked loyalty/coupons + inventory + online delivery + WhatsApp-ready automation + reports.

The first production milestone must be fully usable with demo data and mock integrations, while the architecture remains ready for real database/API/provider connections.


## OpenCode AUTO-SETUP CONTRACT

When executing this step, the coding agent must do as much setup as possible automatically.

### Automatically perform
- Inspect the existing project before changing anything.
- Install required dependencies using the project's package manager.
- Create/update required folders and source files.
- Configure TypeScript, Next.js and lint/build settings as needed.
- Create/update environment templates such as `.env.example`.
- Create services, API routes, validation and types required by this step.
- If Prisma/PostgreSQL is in scope, create/update Prisma schema, migrations and seed scripts.
- Use local/static demo fallbacks when external credentials are unavailable.
- Generate realistic fictional dummy data.
- Connect frontend → service layer → API → database abstraction where applicable.
- Run formatting, linting, type-checking and production build.
- Run available tests.
- Fix errors caused by the implementation before declaring the step complete.
- Re-run checks after fixes.
- Preserve previously working features.

### Do NOT ask the user to manually create ordinary code/configuration
Do not stop and ask the user to create files, folders, schemas, routes, components, seed data or configuration that the agent can safely generate itself.

### Credentials / external services
If an external account or secret is genuinely required:
1. Create the integration adapter and all code around it automatically.
2. Create `.env.example` with the exact required variable names.
3. Use a safe mock provider in development.
4. Continue implementing all functionality that does not require the missing credential.
5. At the end, report only the specific credentials/account action that remains.

Never invent real credentials, API keys, payment secrets, WhatsApp credentials or production database passwords.

### Database
If PostgreSQL is available through an existing environment variable, use it.
If it is not available, still create the Prisma schema, migration and seed code and provide a local-development fallback where practical.
Never silently replace PostgreSQL requirements with an unrelated database.

### Security
Secrets must never be hardcoded.
Server-side authorization must be enforced for protected operations.
Never trust client-submitted prices, discounts, coupon status, reward eligibility or payment status.

### Completion Report
At the end of this step report:
- Files created/changed
- Packages installed
- Database/migration/seed status
- API routes/services created
- Tests/checks executed
- Any remaining external credential requirement
- Exact command to run the project

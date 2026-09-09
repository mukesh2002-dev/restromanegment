# Step 09 — Reports, CRM & Promotions

## Reports
Create:
- Daily sales
- Monthly sales
- Orders
- Average order value
- Top-selling items
- Table performance
- Payment methods
- Discount usage
- Coupon issued
- Coupon redeemed
- Loyalty points
- Customer visits
- New customers
- Repeat customers
- Reviews
- Rating distribution
- Delivery performance
- Inventory value
- Low-stock report

## CRM
Customer segments:
- New customer
- Repeat customer
- High-value customer
- Inactive customer
- Birthday this month
- Coupon holder
- Loyalty member

## Promotions
Owner can configure:
- Coupon campaigns
- Loyalty rules
- Birthday offers
- Minimum order
- Valid days
- Start/end dates
- Usage limits
- Eligible channels

## Dashboard
Use charts and tables with filters by date, channel and campaign.


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

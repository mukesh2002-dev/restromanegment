# Small Restaurant Management System — Master Specification

## Goal
Build a production-ready small restaurant management system with Frontend + Backend + Database + APIs.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Node.js/Next.js API routes
- PostgreSQL-ready database
- Prisma ORM
- Zod validation
- Secure authentication
- REST API
- Optional Redis-ready caching
- WhatsApp integration-ready service

## Main Modules
1. Authentication & Staff Roles
2. Dashboard
3. Menu & Categories
4. Tables & QR
5. POS & Billing
6. KOT & Kitchen
7. Customer CRM
8. QR Review & Feedback
9. Loyalty Points
10. Coupon/Reward Engine
11. Inventory
12. Online Delivery Orders
13. WhatsApp Automation
14. Reports
15. Settings & Audit

## Critical Business Rule
A reward must be linked to a unique successfully paid bill.

One paid bill = maximum one reward claim.

The same bill cannot create multiple rewards even if the customer scans the QR multiple times.

The system must validate:
- bill ID
- bill status
- payment status
- customer identity
- reward claim status
- reward eligibility
- campaign rules

A customer can earn rewards again on a future valid transaction according to campaign rules.

## QR Flow
Customer pays bill
→ Bill gets unique ID
→ Customer scans QR
→ System validates bill/reward eligibility
→ Customer submits name/mobile/email/birthday if needed
→ Customer gives rating/review
→ If eligible, reward is unlocked
→ Coupon/loyalty record is created
→ Coupon can be redeemed according to rules

Do not trust the QR payload alone. Validate the bill on the server.

## Demo
Use realistic fictional static seed/demo data during development:
- 1 restaurant
- 20 staff
- 30 tables
- 80 menu items
- 500 customers
- 1,000 bills
- 500 reviews
- 700 loyalty transactions
- 300 coupons
- 500 inventory items
- 300 delivery orders

The prototype must work without third-party services. Integrations use mock adapters until credentials are configured.


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


## Global OpenCode Autonomous Execution Mode

The project must be implemented as an autonomous coding workflow.

For every requested step:
1. Inspect the current repository.
2. Detect the package manager and existing architecture.
3. Reuse existing components/services where possible.
4. Install missing dependencies automatically.
5. Implement frontend, backend/API, database and validation required by the step.
6. Configure Prisma/PostgreSQL automatically when credentials/environment permit.
7. Generate migrations and seed scripts.
8. Generate static demo data so the UI works even before external integrations are configured.
9. Run lint, type-check, tests and build.
10. Fix implementation errors automatically.
11. Re-run all checks.
12. Do not claim completion while the project has known build/type errors caused by this step.

### Manual Work Policy
The user should not need to manually create normal source files, API routes, database schemas, Prisma models, migrations, seed data, auth code, RBAC code or ordinary configuration.

Only external account ownership/credentials can remain manual.

### External Credentials Policy
For PostgreSQL hosting, WhatsApp, payment gateway, email, SMS or deployment:
- Build the complete adapter automatically.
- Add environment variable placeholders.
- Provide mock/local mode.
- Continue without blocking the rest of development.
- Clearly list only the final credentials required.

### Critical Reward Security
Never allow repeated reward creation from repeated scans.
The server/database must enforce one reward claim per successful eligible bill.
Concurrent duplicate requests must also be safe.

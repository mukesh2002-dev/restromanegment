# Step 05 — Loyalty & Coupon Engine

## Loyalty
Create customer loyalty accounts.

Track:
- Customer
- Points balance
- Earn transaction
- Redeem transaction
- Expiry
- Adjustment
- Reason
- Linked bill

## Reward Rule
A reward must be linked to a unique bill.

Database-level uniqueness should prevent multiple claims for the same bill.

Example:
`unique(reward.billId)`

If the same customer scans the same bill four times:
- First valid claim succeeds.
- Remaining attempts return `ALREADY_CLAIMED`.
- No additional coupon or points are created.

## Coupon
Fields:
- Coupon code
- Campaign
- Customer
- Bill
- Reward type
- Value
- Minimum spend
- Maximum discount
- Start date
- Expiry
- Usage limit
- Status

Reward types:
- Percentage discount
- Fixed discount
- Free item
- Loyalty points

Example configurable campaign:
- 4-star reward = 40% coupon
- 5-star reward = 50% coupon

Do not hardcode these percentages.

## Redemption
Validate:
- coupon exists
- belongs to customer when required
- active
- not expired
- unused
- minimum spend
- campaign conditions
- order eligibility

Redeem only once.


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

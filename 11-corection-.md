# FIX & COMPLETE — SMALL RESTAURANT POS, CUSTOMER, BILLING & LOYALTY SYSTEM

## PROJECT INSTRUCTION

You are working on an existing Small Restaurant Management System.

DO NOT blindly rebuild the entire project.

First inspect the complete existing codebase and understand:

- Current architecture
- Frontend
- Backend
- Database
- POS
- Orders
- Billing
- Customers
- Loyalty
- Coupons
- QR Reviews
- Delivery

Preserve all working functionality.

Fix incomplete, broken, disconnected, fake, or placeholder workflows.

Do not create duplicate modules.

---

# 1. MAIN BUSINESS REQUIREMENTS

This Small Restaurant Management System must support:

- Dine-in
- Takeaway
- Online Delivery
- POS
- Table Management
- KOT / Kitchen Management
- Billing
- Customer Management
- Customer Mobile Number Identification
- Walk-in Customers
- Loyalty Program
- Loyalty Points
- Loyalty Card
- Coupons
- QR Review System
- Birthday Offers
- WhatsApp Automation
- Sales Reports
- Admin Dashboard

All modules must be properly connected.

A page existing in the sidebar does NOT mean the module is complete.

Every module must work end-to-end.

---

# 2. CUSTOMER IDENTIFICATION FLOW

Do NOT ask for customer information unnecessarily at the beginning of every order.

For a normal restaurant POS, customer identification should primarily happen during billing.

Correct workflow:

Customer Arrives

↓

Order Created

↓

Food Items Added

↓

KOT Sent to Kitchen

↓

Food Prepared

↓

Billing Starts

↓

Ask for Customer Mobile Number

↓

Search Existing Customer

---

# 3. CUSTOMER MOBILE NUMBER SEARCH

On the Billing screen provide:

## Customer Section

- Mobile Number Input
- Search Button
- Add New Customer Button
- Continue as Walk-in Button

Example workflow:

Mobile Number

↓

Search Customer Database

↓

Customer Found or Not Found

---

# 4. EXISTING CUSTOMER FLOW

If the mobile number already exists:

Automatically load the customer profile.

Display:

- Customer Name
- Mobile Number
- Email
- Birthday
- Total Orders
- Total Visits
- Total Spending
- Loyalty Points
- Available Coupons
- Last Visit Date

The cashier must NOT enter the customer name again.

Automatically link the customer to:

- Current Order
- Invoice
- Payment
- Loyalty Transaction

Correct flow:

Mobile Number

↓

Customer Found

↓

Load Customer Profile

↓

Attach Customer to Current Order

↓

Continue Billing

---

# 5. NEW CUSTOMER FLOW

If the mobile number is not found:

Show a New Customer Form.

Fields:

- Customer Name *
- Mobile Number *
- Email
- Date of Birth

Rules:

- Name is required
- Mobile Number is required
- Mobile Number must be valid
- Duplicate mobile numbers must be prevented
- Email is optional
- Date of Birth is optional

After saving:

Customer Created

↓

Customer Automatically Linked

↓

Continue Billing

---

# 6. WALK-IN CUSTOMER

If the customer does not want to provide personal details:

Provide:

Continue as Walk-in Customer

Workflow:

Walk-in Customer

↓

Order

↓

Billing

↓

Payment

↓

Invoice

Walk-in customers can:

- Place Orders
- Receive Bills
- Receive Invoices

Walk-in customers should NOT receive:

- Loyalty Points
- Personalized Coupons
- Birthday Offers
- WhatsApp Marketing
- Customer Purchase History

---

# 7. POS SYSTEM

Create or fix a professional restaurant POS system.

The POS must support:

- Dine-in
- Takeaway
- Delivery
- Menu Categories
- Menu Items
- Quantity Controls
- Add-ons
- Special Instructions
- Remove Item
- Hold Order
- Resume Order
- Discounts
- Coupons
- Taxes
- Customer Attachment

POS workflow:

Select Order Type

↓

Select Table if Dine-in

↓

Create Order

↓

Add Menu Items

↓

Update Quantity

↓

Add Instructions

↓

Send KOT

↓

Proceed to Billing

---

# 8. POS USER INTERFACE

The POS should be fast and easy to use.

Recommended layout:

## LEFT SIDE

Menu Categories

- Starters
- Main Course
- Chinese
- Snacks
- Beverages
- Desserts

## CENTER

Menu Items

Each item should show:

- Image if available
- Item Name
- Price
- Availability
- Add Button

## RIGHT SIDE

Current Order

Each item should show:

- Item Name
- Quantity
- Price
- Total
- Remove Button

Order Summary:

- Subtotal
- Discount
- Coupon Discount
- Tax
- Grand Total

Actions:

- Hold Order
- Send to Kitchen
- Proceed to Billing

---

# 9. ORDER TYPES

Every order must support:

## DINE_IN

Customer eats inside the restaurant.

Requires:

- Table Selection
- Order
- KOT
- Billing

---

## TAKEAWAY

Customer takes food away.

Requires:

- Order
- KOT
- Billing

Customer details are optional.

---

## DELIVERY

Customer receives food at an address.

Requires:

- Customer Name
- Mobile Number
- Delivery Address

---

# 10. TABLE MANAGEMENT

Create proper Table Management.

Table statuses:

- AVAILABLE
- OCCUPIED
- RESERVED
- BILLING
- CLEANING

Each table should show:

- Table Number
- Table Name
- Status
- Current Order
- Customer
- Order Time
- Current Bill Amount

Correct flow:

Available

↓

Customer Seated

↓

Occupied

↓

Order Created

↓

Billing

↓

Payment Complete

↓

Cleaning

↓

Available

Prevent:

- Duplicate active orders on the same table
- Billing closed orders
- Invalid table status changes

---

# 11. KOT — KITCHEN ORDER TICKET

When an order is confirmed:

Order

↓

Generate KOT

↓

Send to Kitchen

Kitchen should see:

- KOT Number
- Order Number
- Table Number
- Order Type
- Items
- Quantity
- Special Instructions
- Order Time

Kitchen statuses:

- NEW
- ACCEPTED
- PREPARING
- READY
- SERVED

Prevent accidental duplicate KOT generation.

If new items are added after the first KOT:

Create a new KOT or properly track the KOT update.

Maintain complete history.

---

# 12. KITCHEN DISPLAY SYSTEM

Create a Kitchen Display Screen.

Kitchen staff should see:

- New Orders
- Preparing Orders
- Ready Orders

Each order should display:

- KOT Number
- Table Number
- Order Type
- Items
- Quantity
- Notes
- Order Time
- Time Elapsed

Actions:

- Accept
- Start Preparing
- Mark Ready

---

# 13. BILLING FLOW

Billing workflow:

Order

↓

Customer Identification

↓

Calculate Subtotal

↓

Apply Discount

↓

Apply Coupon

↓

Calculate Tax

↓

Calculate Grand Total

↓

Select Payment Method

↓

Process Payment

↓

Generate Invoice

Important:

All important billing calculations must happen server-side.

Never trust frontend totals.

---

# 14. BILLING SCREEN

Show:

## Order Summary

- Items
- Quantity
- Price

## Customer

- Search by Mobile Number
- Existing Customer
- New Customer
- Walk-in Customer

## Discounts

- Manual Discount
- Coupon Discount

## Taxes

- GST
- Other Configurable Taxes

## Payment

- Cash
- UPI
- Card
- Bank
- Mixed Payment

---

# 15. PAYMENT METHODS

Support:

- CASH
- UPI
- CARD
- BANK
- MIXED

Example:

Total Amount: ₹500

Cash: ₹200

UPI: ₹300

Payment must satisfy:

Cash + UPI + Card + Other Payments

=

Invoice Total

---

# 16. PAYMENT STATUS

Support:

- PENDING
- PARTIALLY_PAID
- PAID
- FAILED
- REFUNDED

Do NOT mark an invoice as PAID until the payment is successfully recorded.

Every payment must store:

- Payment ID
- Invoice ID
- Amount
- Payment Method
- Transaction Reference
- Payment Status
- Payment Date

---

# 17. INVOICE

Generate a professional restaurant invoice.

Invoice should include:

## Restaurant Details

- Restaurant Name
- Address
- Phone Number
- GST Number

## Invoice Details

- Invoice Number
- Order Number
- Date
- Time

## Customer Details

- Customer Name
- Mobile Number

## Items

- Item Name
- Quantity
- Rate
- Amount

## Financial Summary

- Subtotal
- Discount
- Coupon Discount
- Tax
- Grand Total

## Payment

- Payment Method
- Payment Status

Support:

- Print
- PDF
- Reprint

---

# 18. CUSTOMER MANAGEMENT

Create a proper Customer Management module.

Customer fields:

- Customer ID
- Name
- Mobile Number
- Email
- Date of Birth
- Created At
- Updated At

Customer analytics:

- Total Orders
- Total Visits
- Total Spending
- Loyalty Points
- Available Coupons
- Last Visit Date

Customer Mobile Number should be the primary lookup field.

---

# 19. CUSTOMER VISIT LOGIC

A customer visit must be based on a valid transaction.

Correct logic:

Customer

+

Paid Invoice

↓

Valid Purchase

↓

Eligible Customer Visit

Do NOT count:

- Unpaid Orders
- Cancelled Orders
- Draft Orders

as valid customer visits.

---

# 20. LOYALTY SYSTEM

The Loyalty System must be connected to:

Customer

+

Paid Invoice

↓

Loyalty Engine

↓

Loyalty Transaction

↓

Points or Reward

Do NOT give rewards simply because someone scans a QR code.

A valid paid invoice must exist.

---

# 21. LOYALTY RULES

Make all loyalty rules configurable.

Example:

- Minimum Purchase Amount: ₹400
- Points per ₹100: 10
- Maximum Eligible Visits Per Day: 1
- Reward Expiry: Configurable

Example:

Customer Bill = ₹400

↓

Payment Completed

↓

Customer Identified

↓

Check Eligibility

↓

Create Valid Loyalty Transaction

---

# 22. PREVENT MULTIPLE REWARDS

This is a critical requirement.

A customer must NOT be able to receive unlimited rewards.

System must check:

- Customer ID
- Invoice ID
- Order ID
- Payment Status
- Business Date
- Existing Loyalty Transaction
- Existing Review Reward

Rule:

One Paid Invoice

=

Maximum One Loyalty Reward

Additionally:

One Customer

=

Maximum Eligible Reward Per Day

This daily limit must be configurable.

---

# 23. LOYALTY TRANSACTION

Create a Loyalty Transaction table.

Fields:

- Transaction ID
- Customer ID
- Invoice ID
- Order ID
- Transaction Type
- Points
- Business Date
- Created At

Transaction Types:

- EARN
- REDEEM
- EXPIRE
- ADJUSTMENT

Maintain complete transaction history.

Do NOT simply overwrite loyalty points.

Calculate the available balance from proper transactions or maintain a safely synchronized balance.

---

# 24. LOYALTY POINT CALCULATION

Example:

Paid Bill

₹500

↓

Rule:

₹100 = 10 Points

↓

Customer Earns:

50 Points

Rules must be configurable from Admin Settings.

Do not hard-code business rules.

---

# 25. LOYALTY REDEMPTION

When a customer returns:

Cashier enters Mobile Number

↓

Customer Found

↓

Load:

- Available Points
- Available Coupons

At billing:

- Apply Loyalty Points
- Apply Coupon

System must validate:

- Customer owns the points
- Points are available
- Points are not expired
- Coupon belongs to the customer
- Coupon is active
- Coupon is not expired
- Coupon has not already been used
- Minimum order requirement is satisfied

---

# 26. COUPON SYSTEM

Create a proper Coupon module.

Coupon fields:

- Coupon ID
- Coupon Code
- Customer ID
- Discount Type
- Discount Value
- Maximum Discount
- Minimum Order Amount
- Expiry Date
- Usage Limit
- Status
- Created At

Coupon statuses:

- ACTIVE
- USED
- EXPIRED
- CANCELLED

Prevent duplicate coupon usage.

---

# 27. QR REVIEW SYSTEM

The QR Review System must NOT directly generate unlimited coupons.

Correct workflow:

Paid Invoice

↓

Generate Review Eligibility

↓

Generate Unique Secure Token

↓

Customer Opens Review QR

↓

Validate Customer and Invoice

↓

Check Token

↓

Check Review Status

↓

Customer Submits Review

↓

Check Reward Rules

↓

Generate Coupon

---

# 28. REVIEW TOKEN SECURITY

Every Review QR or Link must be connected to:

- Customer ID
- Invoice ID
- Unique Token
- Created At
- Expiry Date
- Used At
- Status

Rules:

One Invoice

↓

One Review Submission

↓

Maximum One Review Reward

Do NOT allow the same QR code to generate unlimited coupons.

---

# 29. STAR RATING

Support:

- 1 Star
- 2 Star
- 3 Star
- 4 Star
- 5 Star

Store:

- Customer
- Invoice
- Rating
- Review Comment
- Created At

Reward rules must be configurable.

Example:

Rating = 4 Stars

↓

Check Admin Rule

↓

Generate Reward

Do NOT hard-code:

- 40% Discount
- 50% Discount

Admin must configure the rules.

---

# 30. REVIEW REWARD SETTINGS

Admin should configure:

- Minimum Rating
- Reward Type
- Discount Percentage
- Fixed Discount
- Maximum Discount
- Minimum Order Amount
- Coupon Expiry

Example:

Rating: 4 or Above

Reward:

10% Discount

Maximum Discount:

₹100

Minimum Next Order:

₹500

Expiry:

30 Days

---

# 31. REVIEW FORM

Create a simple customer review form.

Fields:

- Star Rating *
- Review Comment

Do not ask for unnecessary information.

Customer and invoice identity should already be connected using the secure review token.

---

# 32. REVIEW VALIDATION

Before accepting a review:

Check:

- Invoice Exists
- Invoice is Paid
- Token Exists
- Token is Valid
- Token is Not Expired
- Review Not Already Submitted

If invalid:

Show a clear error message.

Examples:

- Invalid Review Link
- Review Link Expired
- Review Already Submitted
- Invoice Not Eligible

---

# 33. BIRTHDAY OFFERS

Customer profile should support:

Date of Birth

Create Birthday Offer rules.

Workflow:

Customer Birthday

↓

Check Marketing Consent

↓

Check Birthday Offer Rule

↓

Generate Birthday Coupon

↓

Send Notification

Possible channels:

- WhatsApp
- SMS
- Email

---

# 34. MARKETING CONSENT

Customer profile must include:

- WhatsApp Marketing Consent
- SMS Marketing Consent
- Email Marketing Consent

Support:

- Opt-in
- Opt-out

Do not send marketing campaigns without appropriate consent and configuration.

---

# 35. WHATSAPP AUTOMATION

Create a notification architecture.

Events:

- New Customer
- Order Confirmation
- Order Ready
- Delivery Status
- Invoice Generated
- Loyalty Reward
- Coupon Generated
- Coupon Expiring
- Birthday Offer
- Special Offer

Architecture:

System Event

↓

Notification Queue

↓

Notification Service

↓

Provider Adapter

↓

WhatsApp / SMS / Email

↓

Delivery Status

Do NOT hard-code a WhatsApp provider.

Create a provider interface.

Use mock providers during development.

---

# 36. ONLINE DELIVERY

Support:

- Restaurant Delivery
- Pickup
- Third-party Delivery Ready

Online Delivery flow:

Customer

↓

Select Food

↓

Add Items

↓

Provide Address

↓

Place Order

↓

Restaurant Confirms

↓

KOT

↓

Preparing

↓

Ready

↓

Out for Delivery

↓

Delivered

↓

Payment Complete

---

# 37. DELIVERY CUSTOMER DETAILS

For delivery:

Required:

- Customer Name
- Mobile Number
- Delivery Address

When mobile number is entered:

Search Customer

↓

Existing Customer?

YES

↓

Load Details

NO

↓

Create Customer

Store delivery addresses properly.

---

# 38. ORDER STATUS

Support:

- DRAFT
- CONFIRMED
- KITCHEN
- PREPARING
- READY
- SERVED
- COMPLETED
- CANCELLED

Do not allow invalid status transitions.

---

# 39. DATABASE

Use:

PostgreSQL

Use:

Prisma ORM

Create normalized relational database models.

Do NOT create one giant table.

---

# 40. CUSTOMER MODEL

Customer fields:

- id
- name
- mobile
- email
- dateOfBirth
- whatsappMarketingConsent
- smsMarketingConsent
- emailMarketingConsent
- createdAt
- updatedAt

Add indexes where required.

Mobile number should be properly indexed.

Use appropriate uniqueness rules.

---

# 41. ORDER MODEL

Fields:

- id
- orderNumber
- customerId
- tableId
- orderType
- status
- subtotal
- discount
- tax
- total
- createdAt
- updatedAt

customerId can be optional for walk-in orders.

---

# 42. ORDER ITEM MODEL

Fields:

- id
- orderId
- menuItemId
- quantity
- price
- total
- notes

Store order item price correctly.

Do not depend on the current menu price for historical invoices.

---

# 43. INVOICE MODEL

Fields:

- id
- invoiceNumber
- orderId
- customerId
- subtotal
- discount
- couponDiscount
- tax
- total
- paymentStatus
- createdAt

---

# 44. PAYMENT MODEL

Fields:

- id
- invoiceId
- amount
- paymentMethod
- transactionReference
- status
- createdAt

Support multiple payment records for mixed payments.

---

# 45. LOYALTY ACCOUNT

Fields:

- id
- customerId
- availablePoints
- createdAt
- updatedAt

---

# 46. LOYALTY TRANSACTION

Fields:

- id
- customerId
- invoiceId
- orderId
- type
- points
- businessDate
- createdAt

---

# 47. COUPON MODEL

Fields:

- id
- code
- customerId
- discountType
- discountValue
- minimumOrderAmount
- maximumDiscount
- expiryDate
- status
- createdAt

---

# 48. REVIEW MODEL

Fields:

- id
- customerId
- invoiceId
- rating
- comment
- createdAt

---

# 49. REVIEW TOKEN MODEL

Fields:

- id
- customerId
- invoiceId
- token
- expiresAt
- usedAt
- status
- createdAt

Token must be unique.

---

# 50. DATABASE CONSTRAINTS

Implement:

- Foreign Keys
- Indexes
- Unique Constraints
- Transactions
- Timestamps

Critical constraints:

One Invoice

=

One Review Submission

One Invoice

=

One Review Reward

Prevent:

- Duplicate Loyalty Transactions
- Duplicate Coupon Generation
- Duplicate Review Submissions
- Duplicate Reward Generation

---

# 51. BACKEND API

Create proper API architecture.

Modules:

/auth

/customers

/menu

/categories

/tables

/orders

/kot

/billing

/invoices

/payments

/loyalty

/coupons

/reviews

/delivery

/notifications

/reports

/admin

---

# 52. BACKEND BUSINESS LOGIC

Important business logic must run on the server.

Server must handle:

- Customer Search
- Customer Creation
- Duplicate Validation
- Order Validation
- Price Calculation
- Tax Calculation
- Discount Calculation
- Coupon Validation
- Loyalty Calculation
- Loyalty Redemption
- Payment Validation
- Invoice Generation
- Review Eligibility
- Review Token Validation
- Coupon Generation
- Duplicate Prevention

Never place critical business logic only in the frontend.

---

# 53. AUTHENTICATION

Support roles:

- OWNER
- ADMIN
- MANAGER
- CASHIER
- WAITER
- KITCHEN
- DELIVERY
- ACCOUNTANT

---

# 54. ROLE PERMISSIONS

Example:

## CASHIER

Can:

- Create Order
- Search Customer
- Create Customer
- Process Payment
- Generate Invoice

Cannot:

- Change System Settings
- Manage Users

## WAITER

Can:

- Create Order
- Update Order
- Send KOT

Cannot:

- Process Refund
- Change Pricing

## OWNER

Full Access

All permissions must be checked server-side.

---

# 55. SECURITY

Implement:

- Authentication
- Secure Sessions
- Role Based Access Control
- Server-side Authorization
- Input Validation
- API Security
- Rate Limiting where necessary
- Audit Logs

Never trust:

- Frontend Prices
- Frontend Discounts
- Frontend Loyalty Points
- Frontend Coupon Status
- Frontend Payment Status

---

# 56. AUDIT LOG

Log important actions:

- Order Created
- Order Cancelled
- KOT Created
- Payment Completed
- Payment Refunded
- Discount Applied
- Coupon Applied
- Loyalty Points Added
- Loyalty Points Redeemed
- Coupon Generated
- Coupon Used
- Review Submitted

Store:

- User
- Action
- Entity
- Entity ID
- Timestamp

---

# 57. ADMIN DASHBOARD

Dashboard should show:

- Today's Sales
- Today's Orders
- Dine-in Orders
- Takeaway Orders
- Delivery Orders
- Pending Orders
- Popular Items
- Total Customers
- New Customers
- Returning Customers
- Loyalty Customers
- Active Coupons

---

# 58. REPORTS

Create:

## Sales Report

- Daily
- Weekly
- Monthly

## Order Report

- Dine-in
- Takeaway
- Delivery

## Customer Report

- New Customers
- Returning Customers
- Top Customers

## Loyalty Report

- Points Issued
- Points Redeemed
- Expired Points

## Coupon Report

- Generated
- Used
- Expired

Support date filters.

---

# 59. DUMMY DATA

Create realistic fictional demo data.

Include:

- 20 Menu Items
- 5 Categories
- 10 Tables
- 20 Customers
- 50 Orders
- Sample KOTs
- Sample Payments
- Sample Loyalty Transactions
- Sample Coupons
- Sample Reviews

Use fictional data only.

---

# 60. UI REQUIREMENTS

Create a modern restaurant management interface.

POS must be:

- Fast
- Clean
- Easy to understand
- Touch-friendly
- Tablet-friendly
- Responsive

Do not create complicated or tiny interfaces.

---

# 61. FORM REQUIREMENTS

Every form must include:

- Clear Labels
- Required Field Indicators
- Validation
- Inline Error Messages
- Loading State
- Success Message
- Error Handling
- Cancel Button
- Save Button

Do not create one giant form.

Group related fields properly.

---

# 62. MODAL REQUIREMENTS

Do NOT use small modals for complex forms.

Use:

- Full Page
- Large Dialog
- Drawer

Complex workflows should have sufficient space.

Every modal must support:

- Proper Width
- Maximum Height
- Internal Scrolling
- Sticky Header
- Sticky Footer
- Close Button
- ESC Close
- Responsive Layout

---

# 63. ERROR HANDLING

Handle:

- Customer Not Found
- Duplicate Mobile Number
- Invalid Mobile Number
- Payment Failed
- Coupon Invalid
- Coupon Expired
- Coupon Already Used
- Insufficient Loyalty Points
- Invoice Already Paid
- Duplicate Payment
- Review Already Submitted
- Invalid QR Token
- Expired QR Token

Show clear user-friendly messages.

---

# 64. LOADING STATES

Implement:

- Loading
- Searching Customer
- Creating Customer
- Processing Payment
- Generating Invoice
- Applying Coupon
- Calculating Loyalty
- Generating Reward

Do not leave users guessing.

---

# 65. TESTING

Test all major workflows.

## CUSTOMER

Test:

- New Customer
- Existing Customer
- Walk-in Customer
- Duplicate Mobile Number

## POS

Test:

- Create Order
- Add Item
- Update Quantity
- Remove Item
- Hold Order
- Resume Order

## KITCHEN

Test:

- KOT Creation
- Kitchen Status
- Duplicate KOT Prevention

## BILLING

Test:

- Cash
- UPI
- Card
- Mixed Payment

## LOYALTY

Test:

- Earn Points
- Redeem Points
- Expired Points
- Duplicate Reward Prevention

## REVIEW

Test:

- Valid Review
- Duplicate Review
- Invalid Token
- Expired Token

---

# 66. CRITICAL TEST CASE — QR DUPLICATION

Test this exact scenario:

DAY 1

Customer Mobile:

9876543210

↓

Bill:

₹400

↓

Payment Completed

↓

Eligible Purchase Created

↓

Customer Opens Review QR

↓

Review Submitted

↓

Coupon Generated

↓

Customer Opens Same QR Again

SYSTEM MUST BLOCK:

- Duplicate Review
- Duplicate Coupon
- Duplicate Reward

---

# 67. CRITICAL TEST CASE — SAME DAY REWARD

Test:

Customer returns again on the same day.

New Bill:

₹400

↓

Payment Completed

↓

System checks:

Maximum Eligible Visits Per Day

If configured value is:

1

Then:

No Additional Daily Reward

This rule must be configurable.

---

# 68. OPENCODE AUTO SETUP

You must automatically:

1. Inspect the existing project.
2. Understand the existing architecture.
3. Preserve working functionality.
4. Fix broken workflows.
5. Install missing dependencies.
6. Configure Backend.
7. Configure APIs.
8. Configure PostgreSQL.
9. Configure Prisma.
10. Create or update database schema.
11. Create migrations.
12. Create seed data.
13. Connect frontend and backend.
14. Add validation.
15. Add authentication.
16. Add role permissions.
17. Add audit logs.
18. Test workflows.
19. Fix errors.
20. Run production build.

Do NOT ask the developer to manually create normal application files.

---

# 69. EXTERNAL SERVICES

If credentials are required for:

- WhatsApp
- SMS
- Email
- Payment Gateway
- Cloud Storage

Then:

- Create provider interfaces.
- Create development mock providers.
- Add environment variables to `.env.example`.

Do NOT invent credentials.

Do NOT claim real integrations are active without credentials.

---

# 70. FINAL VALIDATION

Before declaring the project complete:

Run:

1. Install dependencies
2. Database migrations
3. Database seed
4. Lint
5. Typecheck
6. Tests
7. Production build

Fix all errors.

Run validation again.

---

# 71. FINAL ACCEPTANCE CRITERIA

The project is NOT complete simply because pages exist.

Every module must have:

- UI
- Forms
- Validation
- API
- Backend Business Logic
- Database Persistence
- Authentication
- Authorization
- Audit Logs
- Loading States
- Error Handling
- Dummy Data
- Testing

---

# 72. FINAL END-TO-END WORKFLOW

Verify this complete journey:

Customer Arrives

↓

Order Created

↓

Menu Items Added

↓

KOT Sent

↓

Kitchen Prepares

↓

Order Ready

↓

Billing Starts

↓

Customer Mobile Number Entered

↓

Customer Found

OR

New Customer Created

OR

Walk-in Customer Selected

↓

Payment Processed

↓

Invoice Generated

↓

Valid Paid Purchase Created

↓

Loyalty Engine Checks Rules

↓

Eligible Reward Created

↓

Review Eligibility Generated

↓

Customer Opens Secure Review QR

↓

System Validates Invoice

↓

Customer Submits Review

↓

System Checks Review Reward Rules

↓

Coupon Generated

↓

Customer Returns Later

↓

Mobile Number Entered

↓

Customer Identified

↓

Available Coupon Displayed

↓

Coupon Applied

↓

New Payment

↓

New Invoice

---

# 73. ABSOLUTE REQUIREMENTS

DO NOT leave:

- Fake Buttons
- Placeholder Pages
- Disconnected Modules
- Frontend-only Business Logic
- Broken Forms
- Fake Payments
- Duplicate Rewards
- Unlimited QR Coupons
- Unvalidated Coupons
- Duplicate Customer Records
- Unpersisted Data

Every critical workflow must be:

UI

↓

Validation

↓

API

↓

Server-side Business Logic

↓

Database Transaction

↓

Database Persistence

↓

Audit Log

↓

UI Update

↓

Tested

---

# FINAL INSTRUCTION

Build and fix this existing Small Restaurant Management System professionally.

Do not blindly redesign everything.

First inspect the existing implementation.

Preserve working features.

Fix incomplete features.

Connect all modules.

Focus especially on:

1. POS
2. Customer Mobile Number Identification
3. New Customer Creation
4. Walk-in Customer
5. Table Management
6. KOT and Kitchen
7. Billing
8. Payments
9. Invoices
10. Loyalty
11. Coupon Validation
12. QR Review Security
13. Duplicate Reward Prevention
14. Same-Day Reward Limits
15. Birthday Offers
16. WhatsApp Notification Architecture
17. Online Delivery

The final system must work as a real connected restaurant management application.

Do not consider a module complete merely because its page exists.
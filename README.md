# Growth Compass

keep everything as it is and improve it should look like preminium saas product and follow this prompt # TrendZypher Growth OS — Master Build Prompt

Build a production-quality full-stack SaaS application called **TrendZypher Growth OS**.

## 1. Product Vision

TrendZypher Growth OS is a business growth operating system for small businesses and local/Instagram-first brands.

It is NOT a website builder and NOT a generic CRM.

Its purpose is to help a business understand and improve the complete customer and revenue journey:

**Presence → Customer Discovery → Reach → Conversion → Customer Management → Revenue Growth → Financial Control → Positioning**

These are connected modules inside one operating system.

The platform should help a business owner answer:

1. Who are my potential customers?

2. How do I reach them?

3. How do I get my offers in front of them?

4. How do I convert prospects into customers?

5. How do I track my customers?

6. How do I increase revenue?

7. How do I track revenue, expenses and profit?

8. How do I gradually position my business stronger in the market?

9. How strong is my online presence?

---

# 2. Core Product Architecture

Create these primary modules:

### 01 — Presence

Discoverability, credibility and consistency across online channels.

### 02 — Customer Discovery

Ideal customer profile, target audience, customer problems and acquisition opportunities.

### 03 — Reach

Offers, campaigns, channels and acquisition activities.

### 04 — Conversion

Website/landing-page status, offers, CTAs, leads, bookings, enquiries and conversion metrics.

### 05 — Customer Management

CRM, leads, customers, interactions, notes, pipeline and customer history.

### 06 — Revenue Growth

Revenue opportunities, average order value, repeat purchases, upsells, cross-sells, referrals and lost-lead recovery.

### 07 — Financial Control

Revenue, expenses, profit, profit margin and financial trends.

### 08 — Positioning

Brand positioning, differentiation, target market, messaging, authority and reputation.

---

# 3. IMPORTANT PRODUCT PRINCIPLE

Do NOT build these as eight disconnected pages.

The application must connect the data.

Example:

A lead discovered through Instagram should be able to become:

**Lead → Qualified → Customer → Purchase → Revenue → Repeat Customer**

The system should then reflect that information in:

* Customer Management

* Revenue Growth

* Financial Control

* Dashboard analytics

Similarly, an acquisition channel should connect to leads and revenue wherever possible.

---

# 4. User Types

Create two main roles:

### Business Owner

Can:

* View dashboard

* Manage business

* Manage leads

* Manage customers

* Track revenue

* Track expenses

* Manage offers

* Manage campaigns

* Manage positioning

* Manage presence

* View analytics

### TrendZypher Admin

Can:

* Manage all client businesses

* Create/edit client accounts

* View client dashboards

* Manage onboarding

* View system health

* Manage templates

* Manage client growth plans

* Add internal notes

* View client performance

Implement proper role-based access control.

---

# 5. Authentication

Build:

* Sign up

* Login

* Logout

* Forgot password

* Password reset

* Email verification if supported

* Protected routes

* Session persistence

* Role-based authorization

Use Supabase Auth.

---

# 6. Multi-Tenant Architecture

This is extremely important.

Each business must have isolated data.

Structure the backend around:

**User → Organization/Business → Business Data**

A user must NEVER be able to access another business's:

* Customers

* Leads

* Revenue

* Expenses

* Campaigns

* Offers

* Financial information

* Positioning data

Use Supabase Row Level Security aggressively.

Do not rely only on frontend checks.

---

# 7. Business Onboarding

After signup, create an onboarding wizard.

Collect:

### Business information

* Business name

* Business type/niche

* Industry

* Location

* Website

* Instagram

* Facebook

* WhatsApp

* Google Business Profile

* Phone

* Email

### Business model

* Products/services

* Average order value

* Main offers

* Target location

* Main customer type

* Current acquisition channels

* Current monthly revenue range

* Main business goal

### Business goals

Allow selection:

* Get more customers

* Generate more leads

* Increase conversions

* Increase repeat purchases

* Increase average order value

* Improve online presence

* Improve customer management

* Improve profitability

* Improve brand positioning

Store all onboarding information in the database.

---

# 8. MAIN DASHBOARD

Create a premium SaaS dashboard.

The dashboard should immediately answer:

### Business Health

Show:

* Leads

* New customers

* Conversion rate

* Revenue

* Expenses

* Profit

* Profit margin

* Average order value

* Repeat customer rate

### Growth Funnel

Display:

**Reach → Leads → Qualified Leads → Customers → Revenue**

Use charts and cards.

### Revenue

Show:

* Revenue this month

* Revenue previous month

* Revenue growth %

* Revenue by source

* Revenue by product/service

### Customer

Show:

* Total customers

* New customers

* Returning customers

* Lost leads

* Follow-ups due

### Growth Opportunities

Create an intelligent-looking section:

**"Growth Opportunities"**

Examples:

* 18 leads have not been followed up.

* Instagram generates the most leads.

* Your repeat customer rate is low.

* One offer generates significantly higher revenue.

* Your Google presence needs attention.

These insights should initially be generated using deterministic rules from stored data.

Do NOT fake AI results.

---

# 9. PRESENCE MODULE

Create a Presence dashboard.

Track:

### Website

* Website URL

* Status

* Mobile readiness

* CTA presence

* Contact information

* Conversion readiness

### Google

* Google Business Profile

* Category

* Address

* Phone

* Hours

* Reviews

* Rating

* Website connection

### Instagram

* Profile URL

* Bio

* CTA

* Website link

* Contact information

* Profile completeness

### WhatsApp

* Business profile

* Contact number

* CTA

* Catalogue status

### Brand consistency

Check:

* Business name

* Phone

* Address

* Website

* Description

Show a:

**Presence Score / 100**

Break the score down into:

* Discoverability

* Trust

* Consistency

* Conversion readiness

Make the score rule-based initially.

---

# 10. CUSTOMER DISCOVERY MODULE

Create an Ideal Customer Profile builder.

Fields:

* Customer segment

* Age range

* Location

* Interests

* Problems

* Goals

* Buying triggers

* Objections

* Preferred channels

* Customer value

* Buying frequency

Create:

### Customer Segment Cards

Each segment should show:

* Segment name

* Description

* Problem

* Offer

* Channel

* Priority

Allow multiple segments.

Add a section:

**"Where to Find Them"**

with channels such as:

* Instagram

* Google

* Facebook

* WhatsApp

* Local communities

* Referrals

* Search

* Offline

---

# 11. REACH MODULE

Create an Offer + Campaign management system.

### Offers

Fields:

* Offer name

* Description

* Target segment

* Price

* Cost

* CTA

* Start date

* End date

* Status

### Campaigns

Fields:

* Campaign name

* Offer

* Channel

* Target audience

* Budget

* Start date

* End date

* Leads generated

* Customers generated

* Revenue generated

* Status

Channels:

* Instagram

* Google

* Facebook

* WhatsApp

* Referral

* Organic

* Other

Show:

**Campaign → Leads → Customers → Revenue**

---

# 12. CONVERSION MODULE

Create:

### Conversion Funnel

Stages:

**Visitors → Leads → Qualified Leads → Customers**

Allow manual entry initially.

Calculate:

* Lead conversion rate

* Qualified lead rate

* Customer conversion rate

### Conversion Assets

Track:

* Website

* Landing page

* Offer

* CTA

* Booking

* Enquiry form

* WhatsApp

* Call

Each asset should have:

* Status

* URL

* Notes

* Conversion goal

---

# 13. CRM / CUSTOMER MANAGEMENT

Create a proper CRM.

### Leads

Fields:

* Name

* Phone

* Email

* Source

* Campaign

* Offer

* Status

* Value

* Date created

* Last contact

* Next follow-up

* Notes

Pipeline:

**New → Contacted → Qualified → Proposal → Won → Lost**

Create:

* Table view

* Kanban view

* Search

* Filters

* Sorting

### Customers

Fields:

* Name

* Phone

* Email

* Source

* Customer since

* Total spent

* Number of purchases

* Last purchase

* Average order value

* Segment

* Notes

### Customer profile

Show:

* Contact details

* Purchase history

* Revenue generated

* Interactions

* Notes

* Follow-ups

* Tags

---

# 14. REVENUE GROWTH MODULE

Create a Revenue Growth dashboard.

Track:

### Revenue levers

1. New customers

2. Average order value

3. Purchase frequency

4. Repeat customers

5. Lost lead recovery

6. Upsells

7. Cross-sells

8. Referrals

Create an opportunity system.

Example:

### Opportunity

**"Increase repeat purchases"**

* Current repeat rate: 18%

* Target: 25%

* Recommended action: create a repeat-purchase campaign

* Status: Not started / In progress / Completed

Do not claim guaranteed revenue increases.

The system should identify opportunities based on available data.

---

# 15. FINANCIAL CONTROL

Create a finance module.

### Revenue transactions

Fields:

* Date

* Customer

* Product/service

* Amount

* Payment method

* Source

* Notes

### Expenses

Fields:

* Date

* Category

* Description

* Amount

* Payment method

* Notes

Expense categories:

* Marketing

* Operations

* Materials

* Staff

* Software

* Rent

* Delivery

* Other

Calculate:

**Revenue**

**Expenses**

**Profit = Revenue - Expenses**

**Profit Margin = Profit / Revenue × 100**

Create charts:

* Revenue over time

* Expenses over time

* Profit over time

* Revenue by source

* Revenue by product/service

* Expense breakdown

Allow monthly filtering.

---

# 16. POSITIONING MODULE

Create a business positioning workspace.

Fields:

### Target customer

Who the business serves.

### Problem

What problem it solves.

### Value proposition

Why customers should care.

### Differentiator

Why customers should choose it.

### Brand promise

What the business consistently promises.

### Proof

Reviews, results, testimonials, credentials, case studies.

### Competitors

Fields:

* Competitor

* Website

* Positioning

* Strengths

* Weaknesses

* Opportunity

Create a:

**Positioning Score**

Based on completeness, not fake market ranking.

---

# 17. TASK / ACTION SYSTEM

Every module should be able to generate actionable tasks.

Example:

**Task: Follow up with 8 uncontacted leads**

**Task: Complete Google Business profile**

**Task: Add testimonials to website**

**Task: Create repeat-customer offer**

**Task: Record this month's expenses**

Create:

* Task

* Priority

* Due date

* Module

* Status

* Notes

Statuses:

**To Do → In Progress → Done**

---

# 18. REPORTS

Create a monthly growth report.

Include:

### Executive Summary

* Revenue

* Expenses

* Profit

* New customers

* Repeat customers

* Leads

* Conversion rate

### Acquisition

* Leads by source

* Customers by source

### Revenue

* Revenue by source

* Revenue by offer

* Average order value

### Customer

* New vs returning

### Opportunities

* Biggest growth opportunities

* Uncompleted actions

Allow export to PDF/CSV if practical.

---

# 19. NICHE CONFIGURATION

The system must support different business types.

Create a business category field.

Initial categories:

* Restaurant

* Salon / Barber

* Gym / Fitness

* Dental

* Real Estate

* Home / Local Services

* Wellness

* Hotel

* Auto / Detailing

* Photography

* Local Brand

* Clothing Brand

* Cookie Business

* Home Bakery

* Jewelry

* Candle Brand

* Beauty Brand

* Skincare

* Sneaker / Streetwear

* Gift Business

* Handmade Accessories

* Flower Business

* Perfume Brand

The UI should dynamically adapt terminology based on the niche.

Example:

Restaurant:

**Orders / Reservations**

Salon:

**Bookings / Appointments**

Real Estate:

**Leads / Site Visits**

Clothing:

**Orders / Purchases**

Dental:

**Consultations / Appointments**

Do NOT create separate applications for every niche.

Use a common underlying data model with niche-specific labels and configuration.

---

# 20. DESIGN SYSTEM

Design it as a premium modern SaaS.

Style:

* Clean

* Professional

* Minimal

* Premium

* High information density without clutter

* Responsive

* Desktop-first but mobile-friendly

Use:

* Sidebar navigation

* Top navigation

* Cards

* Tables

* Charts

* Kanban

* Progress indicators

* Empty states

* Skeleton loading

* Toast notifications

* Modal forms

* Confirmation dialogs

Primary navigation:

**Dashboard**

**Presence**

**Customers**

**Leads**

**Offers & Campaigns**

**Conversion**

**Revenue Growth**

**Finance**

**Positioning**

**Tasks**

**Reports**

**Settings**

---

# 21. BACKEND

Use:

### Supabase

For:

* Authentication

* PostgreSQL database

* Row Level Security

* Storage where required

Create normalized tables for:

* users

* organizations

* organization_members

* businesses

* business_profiles

* customer_segments

* offers

* campaigns

* leads

* customers

* interactions

* follow_ups

* purchases

* revenue_transactions

* expenses

* products_services

* growth_opportunities

* positioning

* competitors

* presence_profiles

* tasks

* reports

Use foreign keys properly.

Add created_at / updated_at timestamps.

Use indexes for commonly searched fields.

Implement RLS for every business-owned table.

---

# 22. SECURITY

Do not expose sensitive business data to other organizations.

Implement:

* Authentication

* Authorization

* RLS

* Server-side validation

* Input validation

* Secure database queries

* Protected API routes

* No service-role keys in frontend

* No hardcoded secrets

* Environment variables

Never store passwords yourself.

---

# 23. DATA RELATIONSHIPS

The important relationship is:

**Business**

↓

**Offers / Campaigns**

↓

**Leads**

↓

**Customers**

↓

**Purchases**

↓

**Revenue**

And:

**Customers**

↓

**Repeat purchases**

↓

**Revenue**

And:

**Revenue − Expenses**

↓

**Profit**

The dashboard must calculate metrics from actual stored data.

Do NOT hardcode fake numbers.

---

# 24. INITIAL AI LAYER

Do not overbuild AI initially.

Create an architecture that can support AI later.

For the MVP, implement rule-based insights.

Examples:

If leads exist but conversion rate is low:

> "Conversion appears to be a growth opportunity."

If many leads have no follow-up:

> "You have leads awaiting follow-up."

If repeat customer percentage is low:

> "Repeat purchases may be an opportunity."

If expenses rise faster than revenue:

> "Expenses are growing faster than revenue."

Later we can connect an LLM to generate deeper recommendations.

---

# 25. ADMIN PANEL

Create a TrendZypher Admin dashboard.

Admin should see:

* Total businesses

* Active businesses

* New businesses

* Business categories

* Revenue tracked across clients

* Client onboarding status

* Client growth scores

* System usage

* Tasks

* Support notes

Admin can open a client account and view their Growth OS.

---

# 26. CLIENT ONBOARDING STATUS

Track:

**Not Started**

→ **Onboarding**

→ **Audit**

→ **System Setup**

→ **Optimization**

→ **Completed**

Create a progress indicator.

---

# 27. DO NOT BUILD THESE YET

Do NOT add these in the first version:

* Payment gateway

* Complex ad management

* Full accounting software

* Payroll

* Inventory management

* Full email marketing platform

* Full social media scheduler

* AI agents

* Voice agents

* Complex third-party integrations

* Multi-currency accounting

* Enterprise permissions

Build the core Growth OS first.

---

# 28. MVP PRIORITY

Build in this order:

### Phase 1

* Authentication

* Multi-tenant architecture

* Business onboarding

* Dashboard

* Presence

### Phase 2

* Customer Discovery

* Offers

* Campaigns

* Leads

* CRM

### Phase 3

* Revenue Growth

* Revenue transactions

* Expenses

* Profit dashboard

### Phase 4

* Positioning

* Tasks

* Reports

* Admin dashboard

### Phase 5

* Niche-specific configuration

* Rule-based insights

* Polish

* Testing

* Security review

---

# 29. QUALITY REQUIREMENTS

The application must feel like a real SaaS product.

Do not create placeholder buttons that don't work.

Every major button should perform a real action.

Forms should save to Supabase.

Tables should retrieve real data.

Charts should use real database data.

Filters should work.

Search should work.

CRUD operations should work.

Loading states should exist.

Error states should exist.

Empty states should exist.

Responsive behavior should work.

---

# 30. FINAL PRODUCT PRINCIPLE

The user should open TrendZypher Growth OS and immediately understand:

### "What is happening in my business?"

### "Where am I losing opportunities?"

### "What should I do next?"

### "Where is my revenue coming from?"

### "Where are my customers coming from?"

### "What is my profit?"

### "How can I grow?"

The product should therefore prioritize **actionable business intelligence and execution**, not just storing data.

Build the application as a real full-stack SaaS with a clean architecture that can later scale into a larger TrendZypher platform.

Start by creating the database schema, authentication, multi-tenant architecture, onboarding flow and dashboard, then implement the modules in the priority order above.

## Development

You need Node.js (or Bun) installed.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


# CLAUDE.md

## Project: Builder Property Management System

This is a full-stack property and installment management system for a real estate builder. The builder launches projects (apartment buildings), sells flats, and manages customer installment plans over 4 to 5 years.

**Brand name**: The builder/company brand is **Pride Estates** (this is the public-facing website brand). **Dummy Pride** is a project INSIDE this brand, not the brand itself. Keep this separation so more projects can be added later under the same brand. The brand name should live in one config constant so it is easy to change.

Build this with **dummy data first**. The architecture must allow swapping dummy data for real data later without code changes. Initial deploy target is **Vercel**, later it moves to **Hostinger** with a purchased domain.

---

## Tech Stack (Use Exactly This)

- **Next.js 15** with App Router and Server Actions
- **TypeScript** (strict mode)
- **Prisma ORM**
- **PostgreSQL** (Neon for dev/Vercel, connection string is swappable)
- **Auth.js (NextAuth v5)** for role-based authentication
- **Tailwind CSS + shadcn/ui** for UI
- **Zod** for all server-side validation
- **TanStack Table** for admin data tables
- **date-fns** for installment date math

Do not introduce other libraries unless strictly required. Keep dependencies minimal.

---

## Core Concept

There are three actors:

1. **Admin**: Full control. Manages projects, flats, customers, bookings, payments, and sees the reminder list. All rights.
2. **Customer**: Read-only panel. Sees their own booking, installment ledger, paid/pending status, and profile. Cannot edit anything.
3. **System (Installment Engine)**: Auto-generates installment schedules and computes overdue reminders.

The most important architectural rule: **keep Flat and Booking as separate entities.**

- A **Flat** is a physical inventory unit with a status (available, booked, sold).
- A **Booking** is a deal linking one Flat to one Customer, carrying the negotiated price and installment plan.

This separation prevents duplicate bookings (enforce a unique constraint on active booking per flat) and lets a cancelled flat return to available status cleanly.

---

## Data Model (Prisma Schema)

Implement exactly this schema. Use enums as defined.

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  phone     String?
  role      Role     @default(CUSTOMER)
  bookings  Booking[]
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
  CUSTOMER
}

model Project {
  id          String   @id @default(cuid())
  name        String
  totalFloors Int
  status      String   @default("ACTIVE")
  flats       Flat[]
  createdAt   DateTime @default(now())
}

model Flat {
  id         String     @id @default(cuid())
  project    Project    @relation(fields: [projectId], references: [id])
  projectId  String
  flatNumber String
  floor      Int
  type       FlatType
  basePrice  Float
  status     FlatStatus @default(AVAILABLE)
  booking    Booking?

  @@unique([projectId, flatNumber])
}

enum FlatType {
  ONE_BED_LAUNCH
  TWO_BED_LAUNCH
  TWO_BED_DD
}

enum FlatStatus {
  AVAILABLE
  BOOKED
  SOLD
}

model Booking {
  id              String        @id @default(cuid())
  flat            Flat          @relation(fields: [flatId], references: [id])
  flatId          String        @unique
  customer        User          @relation(fields: [customerId], references: [id])
  customerId      String
  totalPrice      Float
  advanceAmount   Float
  remainingAmount Float
  planType        PlanType
  durationMonths  Int
  bookingDate     DateTime      @default(now())
  status          BookingStatus @default(ACTIVE)
  installments    Installment[]
  createdAt       DateTime      @default(now())
}

enum PlanType {
  MONTHLY
  HALF_YEARLY
  HYBRID
}

enum BookingStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

model Installment {
  id         String            @id @default(cuid())
  booking    Booking           @relation(fields: [bookingId], references: [id])
  bookingId  String
  dueDate    DateTime
  amount     Float
  type       InstallmentType
  status     InstallmentStatus @default(PENDING)
  paidAmount Float             @default(0)
  paidDate   DateTime?
  note       String?
}

enum InstallmentType {
  ADVANCE
  MONTHLY
  HALF_YEARLY
}

enum InstallmentStatus {
  PENDING
  PAID
  OVERDUE
}
```

---

## Installment Engine Logic

When a booking is created, generate a draft installment schedule. Show it to the admin as an editable preview. Admin can override any row, then save.

Generation steps:

1. Compute `remainingAmount = totalPrice - advanceAmount`.
2. Create one `ADVANCE` installment, status `PAID`, dated on `bookingDate`, amount = `advanceAmount`.
3. Distribute `remainingAmount` based on `planType`:
   - **MONTHLY**: `remainingAmount / durationMonths`, one installment per month, due on the same day each month starting one month after booking.
   - **HALF_YEARLY**: split into 6-month chunks across `durationMonths`.
   - **HYBRID**: admin specifies how many half-yearly installments come first, then the rest is monthly. The engine generates accordingly.

**Critical validation**: before saving, the sum of all non-advance installment amounts must equal `remainingAmount`. If admin overrides amounts, re-validate this sum. Reject save on mismatch with a clear error.

Generate the schedule as a draft array in a server action, return it to the client for preview, let admin edit, then persist on confirm.

---

## Reminder System

Do NOT build a separate reminder table in phase one. Compute reminders live from installment data.

Reminder query logic:

- Find installments where `dueDate <= today` AND `status IN (PENDING, OVERDUE)`.
- Group by booking, then by customer.
- For each, show: customer name, phone, overdue amount, days late, flat number.

The rule "payment not received by the 15th of the month" means: any installment whose due date has passed and is still unpaid shows up in the reminder list. Run this as a server-side query on the `/admin/reminders` page.

Add a background cron (Vercel Cron) only later, when WhatsApp or SMS notifications are needed. For now, the on-page list is enough.

Also implement a daily status sync helper that marks any `PENDING` installment with `dueDate < today` as `OVERDUE` so dashboard counts stay accurate. Call this on admin dashboard load, or via a lightweight cron later.

---

## Routes and Panels

### Public (no login required, this is the marketing front of the site)

This is the FIRST thing a normal visitor sees. It must be genuinely attractive and modern, because a customer only comes to book if the home page convinces them. Treat this as a real estate marketing site, not a plain admin tool.

- `/` Home page. Detailed spec below.
- `/projects` All projects listing (for now just Dummy Pride, built to scale).
- `/projects/[id]` Single project detail: full info, flat types, payment plan, live availability, image gallery, a "Book Now" / "Enquire" CTA that leads to contact or login.
- `/login` Shared login. Redirect by role: admin to `/admin/dashboard`, customer to `/customer/dashboard`.

#### Home Page Sections (`/`)

Build these sections in order, fully responsive, clean and premium looking:

1. **Hero**: Brand name "Pride Estates", a strong tagline (e.g. "Apna ghar, aasan installments par"), a large hero image or gradient, and two CTAs: "View Projects" and "Book a Flat". Sticky transparent navbar with Login button on the right.
2. **Stats strip**: A horizontal band of dummy-but-believable numbers: projects launched, flats delivered, families settled, years in business. Animated count-up on scroll.
3. **Featured project (Dummy Pride)**: Card or banner with project image, location line, "Starting from Rs 30 Lac", and a link to its detail page.
4. **Flat types**: Three clean cards, one per type, showing name, price, and 3 to 4 feature bullets:
   - 1 Bed Launch, Rs 30 Lac, with loan-friendly note.
   - 2 Bed Launch, Rs 40 Lac.
   - 2 Bed DD, Rs 50 Lac.
5. **Payment plan visual**: Explain the easy installment model. Show a simple breakdown: "Advance do, baqi 4 to 5 saal monthly". A small illustrative example (e.g. advance Rs X, then Rs Y per month). Make it visually clear, not a wall of text.
6. **Live availability counter**: Pull REAL data from the database. Show "X flats available out of 60" for Dummy Pride, with a subtle urgency feel. This must be a live server query, not hardcoded, so it stays accurate and naturally becomes real data later. Optionally a small progress bar (booked vs available).
7. **Why choose us**: Trust points as icons + short lines: transparent online ledger, on-time delivery, easy monthly plans, customer self-service portal.
8. **How to book (3 steps)**: Visit and choose a flat, book with advance, pay easy monthly installments. Simple numbered visual.
9. **Contact / CTA**: A WhatsApp button, a simple enquiry form (name, phone, interested flat type, message), and a "Login to your account" link for existing customers.
10. **Footer**: Brand info, quick links, project link, copyright. Keep it clean.

Design direction: modern real estate aesthetic. Generous white space, good typography, a confident primary color (deep blue or emerald), rounded cards, soft shadows, smooth hover and scroll animations. Mobile-first. Use shadcn/ui components and Tailwind. Use placeholder property images now (clearly swappable later). The whole point is that an unconvinced visitor becomes convinced and proceeds to book.

### Admin (protected, ADMIN role only)
- `/admin/dashboard` Stats cards: total flats, booked, available, sold, total dues outstanding, overdue count.
- `/admin/projects` List projects, create new project, trigger flat seeding.
- `/admin/projects/[id]` Floor-wise flat grid with status colors (green available, yellow booked, red sold).
- `/admin/customers` Customer CRUD.
- `/admin/bookings` All bookings with filters (status, project, customer).
- `/admin/bookings/new` Flow: select available flat, select or create customer, enter deal terms, generate plan preview, edit, save.
- `/admin/bookings/[id]` Full ledger, record a payment against an installment, edit the plan.
- `/admin/reminders` Overdue list as defined above.

### Customer (protected, CUSTOMER role only)
- `/customer/dashboard` Booking summary: flat details, total price, paid so far, remaining, next due date.
- `/customer/ledger` Full installment history with paid and pending status, downloadable later.
- `/customer/profile` Own details, read-only or limited edit.

Enforce role checks in middleware AND in every server action. Never trust the client.

---

## Dummy Pride Seeding

Seed one project named **Dummy Pride** with these exact specs:

- 6 floors.
- Each floor has: 3 TWO_BED_DD, 3 TWO_BED_LAUNCH, 4 ONE_BED_LAUNCH. That is 10 flats per floor, 60 flats total.
- Flat numbers must be unique and follow a clear pattern, for example floor 1 flats are 101 to 110, floor 2 are 201 to 210, and so on.
- Base prices (approximate, editable per booking):
  - ONE_BED_LAUNCH: 3000000 (30 lac)
  - TWO_BED_LAUNCH: 4000000 (40 lac)
  - TWO_BED_DD: 5000000 (50 lac)

Also build the system so admin can create NEW projects dynamically and define their flat structure from the UI. Dummy Pride is just the pre-seeded example.

Create a seed script (`prisma/seed.ts`) that inserts:
- One admin user (email `admin@dummypride.com`, a known dev password, hashed).
- A few sample customer users.
- The Dummy Pride project with all 60 flats.
- 8 to 10 sample bookings across different flats with full installment schedules in varied states (some up to date, some overdue) so the dashboard and reminder list have realistic data to show.

---

## Data Integrity Rules (Enforce Strictly)

1. A flat can have at most one ACTIVE booking. Enforce via the `@@unique` on `flatId` in Booking plus an application check.
2. Flat number must be unique within a project.
3. When a booking is created, set the flat status to BOOKED. When fully paid, set to SOLD. When cancelled, return flat to AVAILABLE.
4. Sum of installment amounts (excluding advance) must equal `remainingAmount`.
5. A customer sees ONLY their own bookings and installments. Filter by session user id in every customer-side query.
6. All money fields are stored as numbers representing PKR. Display with thousand separators and a "Rs" prefix.

---

## Build Order (Phases)

Build and verify one phase before moving to the next.

1. **Setup**: Next.js, TypeScript, Prisma, Tailwind, shadcn/ui, Auth.js. Define schema, run first migration.
2. **Auth and roles**: login, session, role-based redirects and middleware protection.
3. **Projects and flats**: project CRUD, flat grid UI, Dummy Pride seeding.
4. **Booking flow and installment engine**: full new-booking wizard with auto-generate plus override preview.
5. **Payments and customer ledger**: record payments, customer read-only panels.
6. **Dashboard and reminders**: admin stats, overdue reminder list.
7. **Public home page**: build the full marketing home page and project detail pages as specified, with the live availability counter wired to real DB data. This is a real deliverable, not an afterthought. Give it proper design effort.
8. **Polish and deploy**: validations, error states, then Vercel deploy.

---

## Deployment Notes

- **Vercel (now)**: connect Neon Postgres, set `DATABASE_URL` and Auth.js env vars. Run migrations on deploy.
- **Hostinger (later)**: same codebase. Only change the Postgres connection string and the domain config. No code rewrite. Keep all environment-specific values in env vars, never hardcoded.

---

## Code Conventions

- Server Actions for all mutations, no separate API routes unless needed for webhooks.
- Zod schema for every form and server action input.
- All currency math in integer-safe terms, avoid floating point rounding errors where possible (round to 2 decimals on display).
- Reusable components in `components/`, business logic in `lib/`.
- Keep the installment engine in a single pure function module (`lib/installment-engine.ts`) so it is unit-testable.
- Use Roman Urdu or English labels in the UI as appropriate, keep it clean and professional.

---

## What NOT to Build Yet

- No online payment gateway. Admin records payments manually. Customer panel is view-only for payments.
- No SMS/WhatsApp sending yet. Reminder is an on-screen list only.
- No multi-builder/multi-tenant accounts. Single builder, single admin org for now.

Keep the code clean and modular so these can be added later without restructuring.

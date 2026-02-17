# Glow Beauty Studio - PRD

## Original Problem Statement
Build a mobile-first web storefront for a ladies salon in Dombivli. Features include WhatsApp booking integration, service catalog with pricing, gallery, reviews, and admin dashboard. The project evolved to include a full booking system with calendar management.

## User Personas
1. **Salon Customers (Clients)** - Women looking for beauty services, can book appointments
2. **Salon Owner/Admin** - Manages services, offers, gallery, reviews, and bookings via dashboard
3. **Platform Admin** - Controls global feature toggles like booking calendar

## Core Requirements (Static)
- Mobile-first responsive design
- Light theme with elegant rose gold color palette
- WhatsApp booking integration (fallback when calendar disabled)
- Service catalog with categories, pricing, and duration
- Before/after gallery with tag filtering
- Customer reviews showcase
- Admin dashboard for CRUD operations
- JWT-based authentication with role-based access

## What's Been Implemented (Dec 2025)

### Phase 1: Core Storefront (Completed)
- ✅ Full-stack app with React frontend + FastAPI backend + MongoDB
- ✅ 6 public routes: Home, Services, Book, Gallery, Policies, Admin
- ✅ Data models: SalonProfile, ServiceCategory, Service, GalleryImage, Review, Offer
- ✅ Admin CRUD for all models with toggle active/inactive
- ✅ WhatsApp booking with prefilled message template
- ✅ Mobile sticky bottom bar (Call, WhatsApp, Directions)
- ✅ Sample seed data for Dombivli salon
- ✅ Rose gold/pink color scheme with Playfair Display + Manrope fonts

### Phase 2: Full Booking System (Completed - Dec 2025)
- ✅ Separate Salon Owner login (`/salon/login`)
- ✅ Salon Dashboard (`/salon/dashboard`) with FullCalendar
  - Day/Week/Month calendar views
  - List view with search functionality
  - Color-coded booking statuses
  - Stats overview (Today, Pending, Confirmed, Completed)
- ✅ Admin Settings (`/admin` -> Settings tab)
  - Booking calendar enable/disable toggle
  - When disabled: WhatsApp-only booking flow
  - When enabled: Full calendar booking system
- ✅ Client Booking Flow (when calendar enabled)
  - Step 1: Select multiple services (with add/remove)
  - Step 2: Select date and available time slot
  - Step 3: Enter client details
  - Back buttons for navigation between steps
  - Automatic availability checking based on total duration
  - Summary showing selected services, total price, and duration
  - WhatsApp confirmation after booking
- ✅ Booking Management (Salon Dashboard)
  - Confirm, Cancel, Complete, No-Show actions
  - Reschedule with conflict detection
  - Drag-and-drop rescheduling in calendar
  - Audit log for booking changes
- ✅ Role-Based Access Control
  - Admin (salon_owner): Controls features + manages content
  - Salon staff (salon_owner): Can only manage bookings
  - Client: Can create bookings (public)

### Phase 3: Staff Management (Completed - Dec 2025)
- ✅ Staff data model with CRUD APIs
  - Staff fields: id, name, phone, email, role, specializations, active
  - Pre-seeded 3 staff members: Priya Sharma, Neha Patel, Anjali Singh
- ✅ Staff assignment to bookings
  - Assign staff when confirming pending booking
  - Update staff on already confirmed bookings
  - "Update Staff Assignment" button for confirmed bookings
- ✅ Staff display across dashboard
  - Staff dropdown in booking detail dialog
  - Staff name shown in booking list view
  - Staff info in calendar tooltip on hover
- ✅ Backend support
  - GET /api/staff - List staff members
  - Staff enrichment in booking lists (staffName field)
  - Booking change audit includes staff changes

## Tech Stack
- Frontend: React 19, TailwindCSS, Shadcn/UI, FullCalendar
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- Auth: JWT (PyJWT, bcrypt) with role-based access

## Admin Credentials
- **Admin Dashboard:** admin@glowbeauty.com / admin123
- **Salon Dashboard:** admin@glowbeauty.com / admin123 (same credentials, different access)

## Data Models

### Users & Auth
- `admins`: id, email, password_hash, name, role, created_at

### Salon & Services
- `salon_profile`: name, branding, colors, working hours, timezone
- `service_categories`: id, name, order
- `services`: id, categoryId, name, price, duration, depositRequired

### Bookings
- `bookings`: id, salonId, serviceId, staffId, clientName, clientPhone, startTime, endTime, status
- `booking_changes`: Audit log for all booking modifications

### Staff
- `staff`: id, name, phone, email, role, specializations, avatarUrl, active, createdAt

### Features
- `feature_flags`: id=global_features, booking_calendar_enabled

## API Endpoints

### Public
- GET /api/salon - Salon profile
- GET /api/services - All services
- GET /api/features - Public feature flags
- GET /api/public/availability - Available time slots
- POST /api/public/bookings - Create booking

### Salon Admin
- GET /api/staff - List staff members
- GET /api/salon/bookings - List bookings
- GET /api/salon/bookings/{id} - Booking detail
- PATCH /api/salon/bookings/{id}/status - Update status (with optional staffId)
- PATCH /api/salon/bookings/{id}/reschedule - Reschedule
- GET /api/salon/bookings/{id}/changes - Audit history

### Platform Admin
- GET /api/admin/features - Get feature flags
- PATCH /api/admin/features - Update feature flags

## Prioritized Backlog

### P0 - Completed
- [x] Core pages implementation
- [x] Service catalog with categories
- [x] WhatsApp booking integration
- [x] Admin authentication
- [x] CRUD for all models
- [x] Full booking calendar system
- [x] Salon dashboard with FullCalendar
- [x] Platform admin feature toggle
- [x] Role-based access control

### P1 - Next Phase
- [ ] Image upload to cloud storage (currently URL-based)
- [ ] Online payment integration (UPI/Card) for deposits
- [ ] Email/SMS notifications for booking confirmations
- [x] Staff management & assignment to bookings (Completed Dec 2025)

### P2 - Future Enhancements
- [ ] Loyalty points system
- [ ] Package builder (combine services)
- [ ] Advanced analytics dashboard
- [ ] Waitlist feature for fully booked slots
- [ ] Client reconfirmation flow for pending bookings

## Routes
- `/` - Home page
- `/services` - Service catalog
- `/book` - Client booking (calendar or WhatsApp)
- `/gallery` - Photo gallery
- `/policies` - FAQ & policies
- `/admin` - Content admin panel (with Settings tab for feature toggle)
- `/salon/login` - Salon staff login
- `/salon/dashboard` - Booking management dashboard (view and manage only)

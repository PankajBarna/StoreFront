# Glow Beauty Studio - PRD

## Original Problem Statement
Build a mobile-first web storefront for a ladies salon in Dombivli. Features include WhatsApp booking integration, service catalog with pricing, gallery, reviews, and admin dashboard.

## User Personas
1. **Salon Customers** - Women in Dombivli looking for beauty services
2. **Salon Owner/Admin** - Manages services, offers, gallery, and reviews

## Core Requirements (Static)
- Mobile-first responsive design
- Light theme with elegant rose gold color palette
- WhatsApp booking integration
- Service catalog with categories, pricing, and duration
- Before/after gallery with tag filtering
- Customer reviews showcase
- Admin dashboard for CRUD operations
- JWT-based authentication

## What's Been Implemented (Jan 2026)
- ✅ Full-stack app with React frontend + FastAPI backend + MongoDB
- ✅ 6 public routes: Home, Services, Book, Gallery, Policies, Admin
- ✅ Data models: SalonProfile, ServiceCategory, Service, GalleryImage, Review, Offer
- ✅ Admin CRUD for all models with toggle active/inactive
- ✅ WhatsApp booking with prefilled message template
- ✅ Mobile sticky bottom bar (Call, WhatsApp, Directions)
- ✅ Sample seed data for Dombivli salon
- ✅ Rose gold/pink color scheme with Playfair Display + Manrope fonts

## Tech Stack
- Frontend: React 19, TailwindCSS, Shadcn/UI
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- Auth: JWT (PyJWT, bcrypt)

## Admin Credentials
- Email: admin@glowbeauty.com
- Password: admin123

## Prioritized Backlog

### P0 - Completed
- [x] Core pages implementation
- [x] Service catalog with categories
- [x] WhatsApp booking integration
- [x] Admin authentication
- [x] CRUD for all models

### P1 - Next Phase
- [ ] Image upload to cloud storage (currently URL-based)
- [ ] Online payment integration (UPI/Card)
- [ ] Appointment calendar sync
- [ ] SMS notifications

### P2 - Future Enhancements
- [ ] Loyalty points system
- [ ] Package builder (combine services)
- [ ] Staff management & scheduling
- [ ] Advanced analytics dashboard

## Next Tasks List
1. Add cloud image upload (Cloudinary/S3)
2. Implement UPI payment with QR code display
3. Add Google Calendar integration for appointments
4. Enable WhatsApp Business API for automated confirmations

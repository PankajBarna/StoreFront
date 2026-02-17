from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import jwt
import bcrypt
import base64
from urllib.parse import quote

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'salon-booking-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Timezone
IST = ZoneInfo("Asia/Kolkata")

# Create the main app
app = FastAPI(title="Salon Booking System API")

# Create routers
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")
salon_router = APIRouter(prefix="/api/salon")
public_router = APIRouter(prefix="/api/public")

security = HTTPBearer()

# ============== ENUMS ==============

class BookingStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class UserRole:
    PLATFORM_ADMIN = "platform_admin"
    SALON_OWNER = "salon_owner"
    SALON_ADMIN = "salon_admin"
    CLIENT = "client"

# ============== MODELS ==============

class StatBadge(BaseModel):
    value: str
    label: str

class FAQ(BaseModel):
    question: str
    answer: str

class Policy(BaseModel):
    title: str
    icon: str
    points: List[str]

class WorkingHours(BaseModel):
    day: str  # monday, tuesday, etc.
    open: str  # "09:00"
    close: str  # "20:00"
    closed: bool = False

class SalonProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brandAccent: str
    tagline: str
    aboutText: str
    area: str
    address: str
    defaultArea: str
    phone: str
    whatsappNumber: str
    googleMapsUrl: str
    openingHours: str
    upiId: Optional[str] = None
    upiQrImageUrl: Optional[str] = None
    instagramUrl: Optional[str] = None
    facebookUrl: Optional[str] = None
    heroImageUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    primaryColor: str = "#D69E8E"
    accentColor: str = "#9D5C63"
    heroTitle: str
    heroSubtitle: str
    ctaText: str
    bookingTips: List[str] = []
    stats: List[StatBadge] = []
    policies: List[Policy] = []
    faqs: List[FAQ] = []
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    # Booking system fields
    workingHoursJson: List[dict] = []
    timezone: str = "Asia/Kolkata"
    slotDurationMins: int = 30
    totalSeats: int = 1  # Number of parallel appointments (staff/chairs) available

class ServiceCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    order: int = 0

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    categoryId: str
    name: str
    priceStartingAt: int
    durationMins: int
    description: Optional[str] = None
    active: bool = True
    imageUrl: Optional[str] = None
    depositRequired: bool = False
    depositAmount: Optional[int] = None

class GalleryImage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    imageUrl: str
    caption: Optional[str] = None
    tag: str = "general"
    order: int = 0

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rating: int = 5
    text: str
    source: str = "Google"
    order: int = 0
    avatarUrl: Optional[str] = None

class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    validTill: Optional[str] = None
    active: bool = True

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: str = "stylist"  # stylist, therapist, manager, etc.
    specializations: List[str] = []  # e.g., ["haircut", "coloring", "facial"]
    avatarUrl: Optional[str] = None
    active: bool = True
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    role: str = UserRole.SALON_OWNER
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FeatureFlags(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_features"
    booking_calendar_enabled: bool = False
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    salonId: str
    serviceId: str
    serviceName: Optional[str] = None  # Combined service names for display
    staffId: Optional[str] = None
    clientName: str
    clientPhone: str
    notes: Optional[str] = None
    startTime: str  # ISO format
    endTime: str    # ISO format
    status: str = BookingStatus.PENDING
    confirmBy: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookingChange(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bookingId: str
    salonId: str
    changedByUserId: str
    oldStartTime: Optional[str] = None
    newStartTime: Optional[str] = None
    oldStaffId: Optional[str] = None
    newStaffId: Optional[str] = None
    oldStatus: Optional[str] = None
    newStatus: Optional[str] = None
    reason: str
    changedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== REQUEST/RESPONSE MODELS ==============

class SalonProfileUpdate(BaseModel):
    name: Optional[str] = None
    brandAccent: Optional[str] = None
    tagline: Optional[str] = None
    aboutText: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    defaultArea: Optional[str] = None
    phone: Optional[str] = None
    whatsappNumber: Optional[str] = None
    googleMapsUrl: Optional[str] = None
    openingHours: Optional[str] = None
    upiId: Optional[str] = None
    upiQrImageUrl: Optional[str] = None
    instagramUrl: Optional[str] = None
    facebookUrl: Optional[str] = None
    heroImageUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    primaryColor: Optional[str] = None
    accentColor: Optional[str] = None
    heroTitle: Optional[str] = None
    heroSubtitle: Optional[str] = None
    ctaText: Optional[str] = None
    bookingTips: Optional[List[str]] = None
    stats: Optional[List[dict]] = None
    policies: Optional[List[dict]] = None
    faqs: Optional[List[dict]] = None
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    workingHoursJson: Optional[List[dict]] = None
    timezone: Optional[str] = None
    slotDurationMins: Optional[int] = None
    totalSeats: Optional[int] = None

class ServiceCategoryCreate(BaseModel):
    name: str
    order: int = 0

class ServiceCreate(BaseModel):
    categoryId: str
    name: str
    priceStartingAt: int
    durationMins: int
    description: Optional[str] = None
    active: bool = True
    imageUrl: Optional[str] = None
    depositRequired: bool = False
    depositAmount: Optional[int] = None

class ServiceUpdate(BaseModel):
    categoryId: Optional[str] = None
    name: Optional[str] = None
    priceStartingAt: Optional[int] = None
    durationMins: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    imageUrl: Optional[str] = None
    depositRequired: Optional[bool] = None
    depositAmount: Optional[int] = None

class GalleryImageCreate(BaseModel):
    imageUrl: str
    caption: Optional[str] = None
    tag: str = "general"
    order: int = 0

class ReviewCreate(BaseModel):
    name: str
    rating: int = 5
    text: str
    source: str = "Google"
    order: int = 0
    avatarUrl: Optional[str] = None

class OfferCreate(BaseModel):
    title: str
    description: str
    validTill: Optional[str] = None
    active: bool = True

class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    validTill: Optional[str] = None
    active: Optional[bool] = None

class StaffCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: str = "stylist"
    specializations: List[str] = []
    avatarUrl: Optional[str] = None
    active: bool = True

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    specializations: Optional[List[str]] = None
    avatarUrl: Optional[str] = None
    active: Optional[bool] = None

class AdminLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class FeatureFlagsUpdate(BaseModel):
    booking_calendar_enabled: Optional[bool] = None

class BookingCreate(BaseModel):
    serviceId: str  # Primary service ID (for backward compatibility)
    serviceIds: Optional[List[str]] = None  # Multiple service IDs
    clientName: str
    clientPhone: str
    startTime: str
    notes: Optional[str] = None
    totalDuration: Optional[int] = None  # Total duration for multiple services

class BookingStatusUpdate(BaseModel):
    status: str
    staffId: Optional[str] = None  # Allow staff assignment when updating status

class BookingReschedule(BaseModel):
    newStartTime: str
    staffId: Optional[str] = None
    reason: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        if admin_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_platform_admin(admin: dict = Depends(get_current_admin)):
    if admin.get("role") != UserRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return admin

async def get_salon_admin(admin: dict = Depends(get_current_admin)):
    if admin.get("role") not in [UserRole.SALON_OWNER, UserRole.SALON_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(status_code=403, detail="Salon admin access required")
    return admin

async def check_booking_enabled():
    features = await db.feature_flags.find_one({"id": "global_features"}, {"_id": 0})
    if not features or not features.get("booking_calendar_enabled", False):
        raise HTTPException(status_code=403, detail="Booking calendar disabled by admin")
    return True

# ============== AVAILABILITY HELPERS ==============

def parse_time(time_str: str) -> datetime:
    """Parse ISO time string to datetime"""
    return datetime.fromisoformat(time_str.replace('Z', '+00:00'))

def get_day_name(date: datetime) -> str:
    """Get lowercase day name"""
    return date.strftime("%A").lower()

async def get_working_hours_for_date(salon: dict, date: datetime) -> tuple:
    """Get working hours for a specific date"""
    day_name = get_day_name(date)
    working_hours = salon.get("workingHoursJson", [])
    
    for wh in working_hours:
        if wh.get("day", "").lower() == day_name:
            if wh.get("closed", False):
                return None, None
            return wh.get("open", "10:00"), wh.get("close", "20:00")
    
    # Default working hours
    return "10:00", "20:00"

async def get_available_slots(salon_id: str, service_id: str, date_str: str, total_duration: int = None) -> List[dict]:
    """Calculate available time slots for a given date and service (considers totalSeats)"""
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    if not salon:
        return []
    
    service = await db.services.find_one({"id": service_id, "active": True}, {"_id": 0})
    if not service:
        return []
    
    # Use total_duration if provided (for multiple services), otherwise use service duration
    duration = total_duration if total_duration else service.get("durationMins", 30)
    slot_duration = salon.get("slotDurationMins", 30)
    total_seats = salon.get("totalSeats", 1)
    
    # Parse the date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return []
    
    # Get working hours
    open_time, close_time = await get_working_hours_for_date(salon, target_date)
    if not open_time or not close_time:
        return []  # Salon closed on this day
    
    # Create datetime objects for open/close
    open_hour, open_min = map(int, open_time.split(":"))
    close_hour, close_min = map(int, close_time.split(":"))
    
    day_start = target_date.replace(hour=open_hour, minute=open_min, tzinfo=IST)
    day_end = target_date.replace(hour=close_hour, minute=close_min, tzinfo=IST)
    
    # Get existing bookings for the day
    start_of_day = target_date.replace(hour=0, minute=0, second=0, tzinfo=IST)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, tzinfo=IST)
    
    existing_bookings = await db.bookings.find({
        "salonId": salon_id,
        "startTime": {"$gte": start_of_day.isoformat(), "$lt": end_of_day.isoformat()},
        "status": {"$nin": [BookingStatus.CANCELLED]}
    }, {"_id": 0}).to_list(500)
    
    # Build list of booked time ranges
    booked_ranges = []
    for booking in existing_bookings:
        b_start = parse_time(booking["startTime"])
        b_end = parse_time(booking["endTime"])
        booked_ranges.append((b_start, b_end))
    
    # Generate available slots
    slots = []
    current_slot = day_start
    
    while current_slot + timedelta(minutes=duration) <= day_end:
        slot_end = current_slot + timedelta(minutes=duration)
        
        # Count overlapping bookings for this slot
        overlapping_count = 0
        for b_start, b_end in booked_ranges:
            # Check for overlap
            if not (slot_end <= b_start or current_slot >= b_end):
                overlapping_count += 1
        
        # Slot is available if overlapping count is less than total seats
        is_available = overlapping_count < total_seats
        
        # Don't show past slots for today
        now = datetime.now(IST)
        if target_date.date() == now.date() and current_slot < now:
            is_available = False
        
        if is_available:
            remaining_seats = total_seats - overlapping_count
            slots.append({
                "startTime": current_slot.isoformat(),
                "endTime": slot_end.isoformat(),
                "display": current_slot.strftime("%I:%M %p"),
                "remainingSeats": remaining_seats
            })
        
        current_slot += timedelta(minutes=slot_duration)
    
    return slots

async def check_slot_available(salon_id: str, start_time: str, end_time: str, exclude_booking_id: str = None) -> bool:
    """Check if a time slot is available (considers totalSeats for parallel bookings)"""
    # Get salon to check total seats
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    total_seats = salon.get("totalSeats", 1) if salon else 1
    
    query = {
        "salonId": salon_id,
        "status": {"$nin": [BookingStatus.CANCELLED]},
        "$or": [
            {"startTime": {"$lt": end_time}, "endTime": {"$gt": start_time}}
        ]
    }
    
    if exclude_booking_id:
        query["id"] = {"$ne": exclude_booking_id}
    
    # Count overlapping bookings
    overlapping_count = await db.bookings.count_documents(query)
    
    # Available if overlapping bookings are less than total seats
    return overlapping_count < total_seats

async def generate_whatsapp_notification(booking: dict, notification_type: str, salon: dict = None, new_time: str = None) -> str:
    """Generate WhatsApp notification URL for booking updates"""
    if not salon:
        salon = await db.salon_profile.find_one({}, {"_id": 0})
    
    if not salon:
        return None
    
    salon_name = salon.get("name", "Salon")
    salon_phone = salon.get("whatsappNumber", "")
    client_name = booking.get("clientName", "")
    client_phone = booking.get("clientPhone", "")
    service_name = booking.get("serviceName", "Service")
    
    start_time = parse_time(booking.get("startTime"))
    formatted_date = start_time.strftime("%d %b %Y")
    formatted_time = start_time.strftime("%I:%M %p")
    booking_id = booking.get("id", "")[:8]
    
    if notification_type == "confirmed":
        message = (
            f"Hi {client_name}! 🎉\n"
            f"\n"
            f"Your appointment at *{salon_name}* has been *CONFIRMED*!\n"
            f"\n"
            f"*Booking Details:*\n"
            f"📅 Date: {formatted_date}\n"
            f"⏰ Time: {formatted_time}\n"
            f"💇 Service: {service_name}\n"
            f"🆔 Booking ID: {booking_id}\n"
            f"\n"
            f"We look forward to seeing you!\n"
            f"\n"
            f"If you need to reschedule or cancel, please contact us.\n"
            f"\n"
            f"Thank you! 💖"
        )
    elif notification_type == "cancelled":
        message = (
            f"Hi {client_name},\n"
            f"\n"
            f"Your appointment at *{salon_name}* has been *CANCELLED*.\n"
            f"\n"
            f"*Cancelled Booking:*\n"
            f"📅 Date: {formatted_date}\n"
            f"⏰ Time: {formatted_time}\n"
            f"💇 Service: {service_name}\n"
            f"🆔 Booking ID: {booking_id}\n"
            f"\n"
            f"We're sorry we couldn't serve you this time.\n"
            f"Please book again whenever you're ready!\n"
            f"\n"
            f"Thank you for understanding. 🙏"
        )
    elif notification_type == "rescheduled":
        new_start = parse_time(new_time) if new_time else start_time
        new_formatted_date = new_start.strftime("%d %b %Y")
        new_formatted_time = new_start.strftime("%I:%M %p")
        message = (
            f"Hi {client_name}! 📅\n"
            f"\n"
            f"Your appointment at *{salon_name}* has been *RESCHEDULED*.\n"
            f"\n"
            f"*New Booking Details:*\n"
            f"📅 New Date: {new_formatted_date}\n"
            f"⏰ New Time: {new_formatted_time}\n"
            f"💇 Service: {service_name}\n"
            f"🆔 Booking ID: {booking_id}\n"
            f"\n"
            f"Please confirm if this works for you.\n"
            f"If not, let us know and we'll find another time!\n"
            f"\n"
            f"Thank you! 💖"
        )
    else:
        return None
    
    encoded_message = quote(message, safe='')
    whatsapp_url = f"https://wa.me/{client_phone}?text={encoded_message}"
    return whatsapp_url

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Salon Booking System API"}

@api_router.get("/salon")
async def get_salon_profile():
    profile = await db.salon_profile.find_one({}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Salon profile not found")
    return profile

@api_router.get("/categories")
async def get_categories():
    categories = await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories

@api_router.get("/services")
async def get_services(active_only: bool = True):
    query = {"active": True} if active_only else {}
    services = await db.services.find(query, {"_id": 0}).to_list(500)
    return services

@api_router.get("/services/grouped")
async def get_services_grouped():
    categories = await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    services = await db.services.find({"active": True}, {"_id": 0}).to_list(500)
    
    grouped = []
    for cat in categories:
        cat_services = [s for s in services if s.get("categoryId") == cat.get("id")]
        if cat_services:
            grouped.append({
                "category": cat,
                "services": cat_services
            })
    return grouped

@api_router.get("/gallery")
async def get_gallery(tag: Optional[str] = None):
    query = {"tag": tag} if tag else {}
    images = await db.gallery_images.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return images

@api_router.get("/gallery/tags")
async def get_gallery_tags():
    tags = await db.gallery_images.distinct("tag")
    return tags

@api_router.get("/reviews")
async def get_reviews():
    reviews = await db.reviews.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return reviews

@api_router.get("/offers")
async def get_offers(active_only: bool = True):
    query = {"active": True} if active_only else {}
    offers = await db.offers.find(query, {"_id": 0}).to_list(50)
    return offers

@api_router.get("/home-data")
async def get_home_data():
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    categories = await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    services = await db.services.find({"active": True}, {"_id": 0}).to_list(500)
    reviews = await db.reviews.find({}, {"_id": 0}).sort("order", 1).to_list(10)
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(10)
    features = await db.feature_flags.find_one({"id": "global_features"}, {"_id": 0})
    
    top_services = services[:6]
    
    return {
        "salon": salon,
        "categories": categories,
        "topServices": top_services,
        "reviews": reviews,
        "offers": offers,
        "features": features or {"booking_calendar_enabled": False}
    }

@api_router.get("/features")
async def get_public_features():
    """Get feature flags for public consumption"""
    features = await db.feature_flags.find_one({"id": "global_features"}, {"_id": 0})
    return features or {"booking_calendar_enabled": False}

# ============== PUBLIC BOOKING ROUTES ==============

@public_router.get("/availability")
async def get_availability(serviceId: str, date: str, totalDuration: int = None):
    """Get available time slots for a service on a given date"""
    await check_booking_enabled()
    
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    if not salon:
        raise HTTPException(status_code=404, detail="Salon not found")
    
    slots = await get_available_slots(salon.get("id", "salon-1"), serviceId, date, totalDuration)
    return {"slots": slots, "date": date, "serviceId": serviceId}

@public_router.post("/bookings")
async def create_public_booking(data: BookingCreate):
    """Create a new booking (client-facing)"""
    await check_booking_enabled()
    
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    if not salon:
        raise HTTPException(status_code=404, detail="Salon not found")
    
    # Handle multiple services
    service_ids = data.serviceIds if data.serviceIds else [data.serviceId]
    services = []
    total_duration = 0
    total_price = 0
    
    for sid in service_ids:
        service = await db.services.find_one({"id": sid, "active": True}, {"_id": 0})
        if service:
            services.append(service)
            total_duration += service.get("durationMins", 30)
            total_price += service.get("priceStartingAt", 0)
    
    if not services:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Use provided total duration or calculate from services
    if data.totalDuration:
        total_duration = data.totalDuration
    
    # Calculate end time
    start_time = parse_time(data.startTime)
    end_time = start_time + timedelta(minutes=total_duration)
    
    # Check availability
    is_available = await check_slot_available(
        salon.get("id", "salon-1"),
        data.startTime,
        end_time.isoformat()
    )
    
    if not is_available:
        raise HTTPException(status_code=409, detail="Time slot is no longer available")
    
    # Build service name(s) for the booking
    service_names = ", ".join([s.get("name", "") for s in services])
    
    # Create booking
    booking = Booking(
        salonId=salon.get("id", "salon-1"),
        serviceId=data.serviceId,  # Primary service for backward compatibility
        serviceName=service_names,  # Combined service names
        clientName=data.clientName,
        clientPhone=data.clientPhone,
        notes=data.notes,
        startTime=data.startTime,
        endTime=end_time.isoformat(),
        status=BookingStatus.PENDING
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    # Generate WhatsApp message (matching the WhatsApp fallback format exactly)
    salon_name = salon.get("name", "Salon")
    formatted_time = start_time.strftime("%I:%M %p")
    formatted_date = start_time.strftime("%d %b %Y")
    default_area = salon.get("defaultArea", salon.get("area", ""))
    
    # Build services list with bullet points
    services_text = "\n".join([f"• {s.get('name', '')} (₹{s.get('priceStartingAt', 0)}+, {s.get('durationMins', 30)} mins)" for s in services])
    
    # Format message exactly like WhatsApp fallback (matching spacing from image)
    whatsapp_message = (
        f"Hi! I'd like to book an appointment at {salon_name}.\n"
        f"\n"
        f"*Name:* {data.clientName}\n"
        f"\n"
        f"*Services:*\n"
        f"{services_text}\n"
        f"\n"
        f"*Estimated Total:* ₹{total_price}+ ({total_duration} mins)\n"
        f"\n"
        f"*Preferred Date:* {formatted_date}\n"
        f"*Preferred Time:* {formatted_time}\n"
        f"*Area:* {default_area}\n"
        f"\n"
        f"*Booking ID:* {booking.id[:8]}\n"
        f"\n"
        f"Please confirm availability. Thank you!"
    )
    
    # URL encode the message for WhatsApp
    encoded_message = quote(whatsapp_message, safe='')
    whatsapp_url = f"https://wa.me/{salon.get('whatsappNumber', '')}?text={encoded_message}"
    
    return {
        "booking": booking.model_dump(),
        "whatsappUrl": whatsapp_url,
        "message": "Booking created successfully"
    }

# ============== AUTH ROUTES ==============

@api_router.post("/auth/login")
async def admin_login(credentials: AdminLogin):
    admin = await db.admins.find_one({"email": credentials.email}, {"_id": 0})
    if not admin or not verify_password(credentials.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": admin["id"], "email": admin["email"], "role": admin.get("role", UserRole.SALON_OWNER)})
    return TokenResponse(access_token=token, role=admin.get("role", UserRole.SALON_OWNER))

@api_router.get("/auth/me")
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    return {"id": admin["id"], "email": admin["email"], "name": admin["name"], "role": admin.get("role", UserRole.SALON_OWNER)}

# ============== ADMIN FEATURE ROUTES ==============

@admin_router.get("/features")
async def get_feature_flags(admin: dict = Depends(get_salon_admin)):
    """Get all feature flags (Salon Admin or higher)"""
    features = await db.feature_flags.find_one({"id": "global_features"}, {"_id": 0})
    if not features:
        # Create default feature flags
        features = FeatureFlags().model_dump()
        await db.feature_flags.insert_one(features)
    return features

@admin_router.patch("/features")
async def update_feature_flags(data: FeatureFlagsUpdate, admin: dict = Depends(get_salon_admin)):
    """Update feature flags (Salon Admin or higher)"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = admin["email"]
    
    await db.feature_flags.update_one(
        {"id": "global_features"},
        {"$set": update_data},
        upsert=True
    )
    
    features = await db.feature_flags.find_one({"id": "global_features"}, {"_id": 0})
    return features

# ============== SALON ADMIN ROUTES ==============

@api_router.put("/admin/salon")
async def update_salon_profile(data: SalonProfileUpdate, admin: dict = Depends(get_salon_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.salon_profile.update_one({}, {"$set": update_data})
    profile = await db.salon_profile.find_one({}, {"_id": 0})
    return profile

@api_router.patch("/admin/salon")
async def patch_salon_profile(data: SalonProfileUpdate, admin: dict = Depends(get_salon_admin)):
    """Partial update for salon profile"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.salon_profile.update_one({}, {"$set": update_data})
    profile = await db.salon_profile.find_one({}, {"_id": 0})
    return profile

# Staff CRUD
@api_router.get("/staff")
async def get_staff(active_only: bool = True):
    """Get all staff members"""
    query = {"active": True} if active_only else {}
    staff = await db.staff.find(query, {"_id": 0}).to_list(100)
    return staff

@api_router.post("/admin/staff")
async def create_staff(data: StaffCreate, admin: dict = Depends(get_salon_admin)):
    """Create a new staff member"""
    staff = Staff(**data.model_dump())
    await db.staff.insert_one(staff.model_dump())
    return staff

@api_router.put("/admin/staff/{staff_id}")
async def update_staff(staff_id: str, data: StaffUpdate, admin: dict = Depends(get_salon_admin)):
    """Update a staff member"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.staff.update_one({"id": staff_id}, {"$set": update_data})
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(staff_id: str, admin: dict = Depends(get_salon_admin)):
    """Delete a staff member"""
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted"}

# Categories CRUD
@api_router.post("/admin/categories")
async def create_category(data: ServiceCategoryCreate, admin: dict = Depends(get_salon_admin)):
    category = ServiceCategory(**data.model_dump())
    await db.service_categories.insert_one(category.model_dump())
    return category

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, data: ServiceCategoryCreate, admin: dict = Depends(get_salon_admin)):
    await db.service_categories.update_one({"id": category_id}, {"$set": data.model_dump()})
    category = await db.service_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(get_salon_admin)):
    result = await db.service_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Services CRUD
@api_router.post("/admin/services")
async def create_service(data: ServiceCreate, admin: dict = Depends(get_salon_admin)):
    service = Service(**data.model_dump())
    await db.services.insert_one(service.model_dump())
    return service

@api_router.put("/admin/services/{service_id}")
async def update_service(service_id: str, data: ServiceUpdate, admin: dict = Depends(get_salon_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, admin: dict = Depends(get_salon_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

@api_router.patch("/admin/services/{service_id}/toggle")
async def toggle_service(service_id: str, admin: dict = Depends(get_salon_admin)):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    new_status = not service.get("active", True)
    await db.services.update_one({"id": service_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

# Gallery CRUD
@api_router.post("/admin/gallery")
async def create_gallery_image(data: GalleryImageCreate, admin: dict = Depends(get_salon_admin)):
    image = GalleryImage(**data.model_dump())
    await db.gallery_images.insert_one(image.model_dump())
    return image

@api_router.put("/admin/gallery/{image_id}")
async def update_gallery_image(image_id: str, data: GalleryImageCreate, admin: dict = Depends(get_salon_admin)):
    await db.gallery_images.update_one({"id": image_id}, {"$set": data.model_dump()})
    image = await db.gallery_images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image

@api_router.delete("/admin/gallery/{image_id}")
async def delete_gallery_image(image_id: str, admin: dict = Depends(get_salon_admin)):
    result = await db.gallery_images.delete_one({"id": image_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

# Reviews CRUD
@api_router.post("/admin/reviews")
async def create_review(data: ReviewCreate, admin: dict = Depends(get_salon_admin)):
    review = Review(**data.model_dump())
    await db.reviews.insert_one(review.model_dump())
    return review

@api_router.put("/admin/reviews/{review_id}")
async def update_review(review_id: str, data: ReviewCreate, admin: dict = Depends(get_salon_admin)):
    await db.reviews.update_one({"id": review_id}, {"$set": data.model_dump()})
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(get_salon_admin)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# Offers CRUD
@api_router.post("/admin/offers")
async def create_offer(data: OfferCreate, admin: dict = Depends(get_salon_admin)):
    offer = Offer(**data.model_dump())
    await db.offers.insert_one(offer.model_dump())
    return offer

@api_router.put("/admin/offers/{offer_id}")
async def update_offer(offer_id: str, data: OfferUpdate, admin: dict = Depends(get_salon_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.offers.update_one({"id": offer_id}, {"$set": update_data})
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@api_router.delete("/admin/offers/{offer_id}")
async def delete_offer(offer_id: str, admin: dict = Depends(get_salon_admin)):
    result = await db.offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deleted"}

@api_router.patch("/admin/offers/{offer_id}/toggle")
async def toggle_offer(offer_id: str, admin: dict = Depends(get_salon_admin)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    new_status = not offer.get("active", True)
    await db.offers.update_one({"id": offer_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

# Image Upload
@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(get_salon_admin)):
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode('utf-8')
    content_type = file.content_type or "image/jpeg"
    data_url = f"data:{content_type};base64,{base64_data}"
    return {"url": data_url}

# ============== SALON BOOKING MANAGEMENT ROUTES ==============

@salon_router.get("/bookings")
async def get_salon_bookings(
    admin: dict = Depends(get_salon_admin),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    status: Optional[str] = None,
    view: str = "day"
):
    """Get bookings for salon dashboard"""
    await check_booking_enabled()
    
    query = {}
    
    if from_date:
        query["startTime"] = {"$gte": from_date}
    if to_date:
        if "startTime" in query:
            query["startTime"]["$lt"] = to_date
        else:
            query["startTime"] = {"$lt": to_date}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("startTime", 1).to_list(500)
    
    # Enrich with service names and staff names
    services = {s["id"]: s for s in await db.services.find({}, {"_id": 0}).to_list(100)}
    staff_members = {s["id"]: s for s in await db.staff.find({}, {"_id": 0}).to_list(100)}
    
    for booking in bookings:
        service = services.get(booking.get("serviceId"))
        if service:
            booking["serviceName"] = service.get("name")
            booking["serviceDuration"] = service.get("durationMins")
        
        staff = staff_members.get(booking.get("staffId"))
        if staff:
            booking["staffName"] = staff.get("name")
    
    return {"bookings": bookings, "total": len(bookings)}

@salon_router.get("/bookings/{booking_id}")
async def get_booking_detail(booking_id: str, admin: dict = Depends(get_salon_admin)):
    """Get single booking details"""
    await check_booking_enabled()
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get service info
    service = await db.services.find_one({"id": booking.get("serviceId")}, {"_id": 0})
    if service:
        booking["serviceName"] = service.get("name")
        booking["serviceDuration"] = service.get("durationMins")
    
    return booking

@salon_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: BookingStatusUpdate,
    admin: dict = Depends(get_salon_admin)
):
    """Update booking status (confirm, cancel, complete, no_show)"""
    await check_booking_enabled()
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    old_status = booking.get("status")
    old_staff_id = booking.get("staffId")
    
    # Update booking - include staffId if provided
    update_data = {
        "status": data.status, 
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    if data.staffId:
        update_data["staffId"] = data.staffId
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Log change
    change = BookingChange(
        bookingId=booking_id,
        salonId=booking.get("salonId"),
        changedByUserId=admin["id"],
        oldStatus=old_status,
        newStatus=data.status,
        oldStaffId=old_staff_id,
        newStaffId=data.staffId,
        reason=f"Status changed from {old_status} to {data.status}" + (f", assigned to staff {data.staffId}" if data.staffId else "")
    )
    await db.booking_changes.insert_one(change.model_dump())
    
    updated_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Get service name for notification
    service = await db.services.find_one({"id": updated_booking.get("serviceId")}, {"_id": 0})
    if service:
        updated_booking["serviceName"] = service.get("name")
    
    # Get staff name if assigned
    if updated_booking.get("staffId"):
        staff = await db.staff.find_one({"id": updated_booking.get("staffId")}, {"_id": 0})
        if staff:
            updated_booking["staffName"] = staff.get("name")
    
    # Generate WhatsApp notification URL for confirmed or cancelled status
    whatsapp_url = None
    if data.status == BookingStatus.CONFIRMED:
        whatsapp_url = await generate_whatsapp_notification(updated_booking, "confirmed")
    elif data.status == BookingStatus.CANCELLED:
        whatsapp_url = await generate_whatsapp_notification(updated_booking, "cancelled")
    
    return {**updated_booking, "whatsappNotificationUrl": whatsapp_url}

@salon_router.patch("/bookings/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: str,
    data: BookingReschedule,
    admin: dict = Depends(get_salon_admin)
):
    """Reschedule a booking to a new time slot"""
    await check_booking_enabled()
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Calculate duration from existing booking (preserves multi-service duration)
    old_start_time = parse_time(booking.get("startTime"))
    old_end_time = parse_time(booking.get("endTime"))
    duration_mins = int((old_end_time - old_start_time).total_seconds() / 60)
    
    # Calculate new end time using the same duration
    new_start = parse_time(data.newStartTime)
    new_end = new_start + timedelta(minutes=duration_mins)
    
    # Validation: Cannot reschedule to a time earlier than current time
    now = datetime.now(IST)
    if new_start < now:
        raise HTTPException(status_code=400, detail="Cannot reschedule to a time in the past")
    
    # Check if new slot is available (excluding current booking)
    is_available = await check_slot_available(
        booking.get("salonId"),
        data.newStartTime,
        new_end.isoformat(),
        exclude_booking_id=booking_id
    )
    
    if not is_available:
        raise HTTPException(status_code=409, detail="The new time slot conflicts with an existing booking")
    
    old_start = booking.get("startTime")
    old_staff = booking.get("staffId")
    
    # Update booking
    update_data = {
        "startTime": data.newStartTime,
        "endTime": new_end.isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "status": BookingStatus.CONFIRMED
    }
    if data.staffId:
        update_data["staffId"] = data.staffId
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Log change
    change = BookingChange(
        bookingId=booking_id,
        salonId=booking.get("salonId"),
        changedByUserId=admin["id"],
        oldStartTime=old_start,
        newStartTime=data.newStartTime,
        oldStaffId=old_staff,
        newStaffId=data.staffId,
        reason=data.reason
    )
    await db.booking_changes.insert_one(change.model_dump())
    
    updated_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Get service name for notification
    service = await db.services.find_one({"id": updated_booking.get("serviceId")}, {"_id": 0})
    if service:
        updated_booking["serviceName"] = service.get("name")
    
    # Generate WhatsApp notification URL for reschedule
    whatsapp_url = await generate_whatsapp_notification(updated_booking, "rescheduled", new_time=data.newStartTime)
    
    return {**updated_booking, "whatsappNotificationUrl": whatsapp_url}

@salon_router.get("/bookings/{booking_id}/changes")
async def get_booking_changes(booking_id: str, admin: dict = Depends(get_salon_admin)):
    """Get audit history for a booking"""
    await check_booking_enabled()
    
    changes = await db.booking_changes.find(
        {"bookingId": booking_id},
        {"_id": 0}
    ).sort("changedAt", -1).to_list(100)
    
    return {"changes": changes}

@salon_router.get("/next-available")
async def get_next_available_slots(
    serviceId: str,
    admin: dict = Depends(get_salon_admin)
):
    """Get next 3 available slots starting from now"""
    await check_booking_enabled()
    
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    if not salon:
        raise HTTPException(status_code=404, detail="Salon not found")
    
    slots = []
    current_date = datetime.now(IST).date()
    days_checked = 0
    
    while len(slots) < 3 and days_checked < 14:
        date_str = current_date.strftime("%Y-%m-%d")
        day_slots = await get_available_slots(salon.get("id", "salon-1"), serviceId, date_str)
        slots.extend(day_slots)
        current_date += timedelta(days=1)
        days_checked += 1
    
    return {"slots": slots[:3]}

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    """Seed database with sample data"""
    
    existing = await db.salon_profile.find_one({})
    if existing:
        return {"message": "Database already seeded", "seeded": False}
    
    admin_exists = await db.admins.find_one({})
    if admin_exists:
        raise HTTPException(status_code=403, detail="Database already initialized")
    
    # Feature Flags
    features = FeatureFlags(booking_calendar_enabled=False)
    await db.feature_flags.insert_one(features.model_dump())
    
    # Default working hours
    default_working_hours = [
        {"day": "monday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "tuesday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "wednesday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "thursday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "friday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "saturday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "sunday", "open": "11:00", "close": "18:00", "closed": False},
    ]
    
    # Salon Profile
    salon = SalonProfile(
        id="salon-1",
        name="Glow Beauty Studio",
        brandAccent="Glow",
        tagline="Your destination for beauty and self-care",
        aboutText="We offer premium salon services with a personalized touch.",
        area="Dombivli East",
        address="Shop No. 12, Ganga Complex, Near Railway Station, Dombivli East, Maharashtra 421201",
        defaultArea="Dombivli",
        phone="+91 98765 43210",
        whatsappNumber="919876543210",
        googleMapsUrl="https://maps.google.com/?q=19.2183,73.0878",
        openingHours="Mon-Sat: 10:00 AM - 8:00 PM, Sun: 11:00 AM - 6:00 PM",
        instagramUrl="https://instagram.com/glowbeautystudio",
        heroImageUrl="https://images.unsplash.com/photo-1633443682042-17462ad4ad76?w=1920&q=80",
        primaryColor="#D69E8E",
        accentColor="#9D5C63",
        heroTitle="Welcome to Premium Beauty Care",
        heroSubtitle="Experience the best in beauty services.",
        ctaText="Book Appointment",
        bookingTips=["Book 1 day in advance", "Arrive 10 mins early", "Bridal needs 2-week notice"],
        stats=[
            {"value": "5+", "label": "Years Experience"},
            {"value": "2000+", "label": "Happy Clients"},
            {"value": "4.9", "label": "Rating"},
            {"value": "50+", "label": "Services"}
        ],
        policies=[
            {"title": "Appointment Policy", "icon": "clock", "points": ["Arrive 10 mins early", "Walk-ins welcome"]},
            {"title": "Cancellation Policy", "icon": "alert", "points": ["Cancel 2 hours before", "No-show fee may apply"]}
        ],
        faqs=[
            {"question": "Do I need to book in advance?", "answer": "Walk-ins welcome, but booking recommended."},
            {"question": "What payment methods?", "answer": "Cash, UPI, Cards accepted."}
        ],
        metaTitle="Glow Beauty Studio - Premium Salon",
        metaDescription="Premium beauty services in Dombivli.",
        workingHoursJson=default_working_hours,
        timezone="Asia/Kolkata",
        slotDurationMins=30
    )
    await db.salon_profile.insert_one(salon.model_dump())
    
    # Service Categories
    categories = [
        ServiceCategory(id="cat-hair", name="Hair Services", order=1),
        ServiceCategory(id="cat-skin", name="Skin & Facial", order=2),
        ServiceCategory(id="cat-nails", name="Nail Art & Care", order=3),
        ServiceCategory(id="cat-bridal", name="Bridal Packages", order=4),
    ]
    for cat in categories:
        await db.service_categories.insert_one(cat.model_dump())
    
    # Services
    services = [
        Service(id="svc-1", categoryId="cat-hair", name="Haircut & Styling", priceStartingAt=300, durationMins=45, description="Professional haircut"),
        Service(id="svc-2", categoryId="cat-hair", name="Hair Coloring", priceStartingAt=1500, durationMins=120, description="Global or highlights"),
        Service(id="svc-3", categoryId="cat-hair", name="Hair Spa", priceStartingAt=800, durationMins=60, description="Deep conditioning"),
        Service(id="svc-4", categoryId="cat-skin", name="Classic Facial", priceStartingAt=600, durationMins=45, description="Deep cleansing facial"),
        Service(id="svc-5", categoryId="cat-skin", name="Gold Facial", priceStartingAt=1200, durationMins=60, description="Anti-aging treatment"),
        Service(id="svc-6", categoryId="cat-nails", name="Manicure", priceStartingAt=350, durationMins=30, description="Nail shaping & polish"),
        Service(id="svc-7", categoryId="cat-nails", name="Pedicure", priceStartingAt=450, durationMins=45, description="Complete foot care"),
        Service(id="svc-8", categoryId="cat-bridal", name="Bridal Makeup", priceStartingAt=8000, durationMins=120, description="Complete bridal look", depositRequired=True, depositAmount=2000),
    ]
    for svc in services:
        await db.services.insert_one(svc.model_dump())
    
    # Reviews
    reviews = [
        Review(id="rev-1", name="Priya S.", rating=5, text="Amazing service! Highly recommended.", source="Google", order=1),
        Review(id="rev-2", name="Sneha P.", rating=5, text="Love their hair spa treatment!", source="Google", order=2),
    ]
    for rev in reviews:
        await db.reviews.insert_one(rev.model_dump())
    
    # Offers
    offers = [
        Offer(id="off-1", title="New Year Special", description="20% off on all hair services!", validTill="2026-01-31", active=True),
    ]
    for off in offers:
        await db.offers.insert_one(off.model_dump())
    
    # Create Platform Admin
    platform_admin = Admin(
        id="admin-platform",
        email="platform@admin.com",
        password_hash=hash_password("platform123"),
        name="Platform Admin",
        role=UserRole.PLATFORM_ADMIN
    )
    await db.admins.insert_one(platform_admin.model_dump())
    
    # Create Salon Admin
    salon_admin = Admin(
        id="admin-salon",
        email="admin@glowbeauty.com",
        password_hash=hash_password("admin123"),
        name="Salon Admin",
        role=UserRole.SALON_OWNER
    )
    await db.admins.insert_one(salon_admin.model_dump())
    
    # Create Sample Staff
    staff_members = [
        Staff(id="staff-1", name="Priya Sharma", phone="9876543201", role="senior_stylist", specializations=["haircut", "coloring", "styling"]),
        Staff(id="staff-2", name="Neha Patel", phone="9876543202", role="therapist", specializations=["facial", "cleanup", "massage"]),
        Staff(id="staff-3", name="Anjali Singh", phone="9876543203", role="stylist", specializations=["haircut", "manicure", "pedicure"]),
    ]
    for staff in staff_members:
        await db.staff.insert_one(staff.model_dump())
    
    return {
        "message": "Database seeded successfully",
        "seeded": True,
        "platform_admin": {"email": "platform@admin.com", "password": "platform123"},
        "salon_admin": {"email": "admin@glowbeauty.com", "password": "admin123"}
    }

# Include routers
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(salon_router)
app.include_router(public_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

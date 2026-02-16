from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
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
import jwt
import bcrypt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'glow-beauty-studio-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Create the main app
app = FastAPI(title="Glow Beauty Studio API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============== MODELS ==============

class SalonProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Basic Info
    name: str
    brandAccent: str  # e.g., "Glow" - the stylized part of the name
    tagline: str
    aboutText: str
    # Location
    area: str
    address: str
    defaultArea: str  # Default area for booking form
    # Contact
    phone: str
    whatsappNumber: str
    googleMapsUrl: str
    openingHours: str
    # Social & Payment
    upiId: Optional[str] = None
    upiQrImageUrl: Optional[str] = None
    instagramUrl: Optional[str] = None
    facebookUrl: Optional[str] = None
    # Branding
    heroImageUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    # Colors (CSS values)
    primaryColor: str = "#D69E8E"
    accentColor: str = "#9D5C63"
    # Content
    heroTitle: str
    heroSubtitle: str
    ctaText: str
    bookingTips: List[str] = []
    # SEO
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None

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

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== CREATE MODELS ==============

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
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None

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

class ServiceUpdate(BaseModel):
    categoryId: Optional[str] = None
    name: Optional[str] = None
    priceStartingAt: Optional[int] = None
    durationMins: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    imageUrl: Optional[str] = None

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

class AdminLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

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

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Glow Beauty Studio API"}

@api_router.get("/salon", response_model=SalonProfile)
async def get_salon_profile():
    profile = await db.salon_profile.find_one({}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Salon profile not found")
    return profile

@api_router.get("/categories", response_model=List[ServiceCategory])
async def get_categories():
    categories = await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories

@api_router.get("/services", response_model=List[Service])
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

@api_router.get("/gallery", response_model=List[GalleryImage])
async def get_gallery(tag: Optional[str] = None):
    query = {"tag": tag} if tag else {}
    images = await db.gallery_images.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return images

@api_router.get("/gallery/tags")
async def get_gallery_tags():
    tags = await db.gallery_images.distinct("tag")
    return tags

@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await db.reviews.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return reviews

@api_router.get("/offers", response_model=List[Offer])
async def get_offers(active_only: bool = True):
    query = {"active": True} if active_only else {}
    offers = await db.offers.find(query, {"_id": 0}).to_list(50)
    return offers

@api_router.get("/home-data")
async def get_home_data():
    """Get all data needed for home page"""
    salon = await db.salon_profile.find_one({}, {"_id": 0})
    categories = await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    services = await db.services.find({"active": True}, {"_id": 0}).to_list(500)
    reviews = await db.reviews.find({}, {"_id": 0}).sort("order", 1).to_list(10)
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(10)
    
    # Get top 6 services
    top_services = services[:6]
    
    return {
        "salon": salon,
        "categories": categories,
        "topServices": top_services,
        "reviews": reviews,
        "offers": offers
    }

# ============== AUTH ROUTES ==============

@api_router.post("/auth/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    admin = await db.admins.find_one({"email": credentials.email}, {"_id": 0})
    if not admin or not verify_password(credentials.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": admin["id"], "email": admin["email"]})
    return TokenResponse(access_token=token)

@api_router.get("/auth/me")
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    return {"id": admin["id"], "email": admin["email"], "name": admin["name"]}

# ============== ADMIN ROUTES ==============

@api_router.put("/admin/salon", response_model=SalonProfile)
async def update_salon_profile(data: SalonProfileUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.salon_profile.update_one({}, {"$set": update_data})
    profile = await db.salon_profile.find_one({}, {"_id": 0})
    return profile

# Categories CRUD
@api_router.post("/admin/categories", response_model=ServiceCategory)
async def create_category(data: ServiceCategoryCreate, admin: dict = Depends(get_current_admin)):
    category = ServiceCategory(**data.model_dump())
    await db.service_categories.insert_one(category.model_dump())
    return category

@api_router.put("/admin/categories/{category_id}", response_model=ServiceCategory)
async def update_category(category_id: str, data: ServiceCategoryCreate, admin: dict = Depends(get_current_admin)):
    await db.service_categories.update_one({"id": category_id}, {"$set": data.model_dump()})
    category = await db.service_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.service_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Services CRUD
@api_router.post("/admin/services", response_model=Service)
async def create_service(data: ServiceCreate, admin: dict = Depends(get_current_admin)):
    service = Service(**data.model_dump())
    await db.services.insert_one(service.model_dump())
    return service

@api_router.put("/admin/services/{service_id}", response_model=Service)
async def update_service(service_id: str, data: ServiceUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

@api_router.patch("/admin/services/{service_id}/toggle")
async def toggle_service(service_id: str, admin: dict = Depends(get_current_admin)):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    new_status = not service.get("active", True)
    await db.services.update_one({"id": service_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

# Gallery CRUD
@api_router.post("/admin/gallery", response_model=GalleryImage)
async def create_gallery_image(data: GalleryImageCreate, admin: dict = Depends(get_current_admin)):
    image = GalleryImage(**data.model_dump())
    await db.gallery_images.insert_one(image.model_dump())
    return image

@api_router.put("/admin/gallery/{image_id}", response_model=GalleryImage)
async def update_gallery_image(image_id: str, data: GalleryImageCreate, admin: dict = Depends(get_current_admin)):
    await db.gallery_images.update_one({"id": image_id}, {"$set": data.model_dump()})
    image = await db.gallery_images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image

@api_router.delete("/admin/gallery/{image_id}")
async def delete_gallery_image(image_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.gallery_images.delete_one({"id": image_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

# Reviews CRUD
@api_router.post("/admin/reviews", response_model=Review)
async def create_review(data: ReviewCreate, admin: dict = Depends(get_current_admin)):
    review = Review(**data.model_dump())
    await db.reviews.insert_one(review.model_dump())
    return review

@api_router.put("/admin/reviews/{review_id}", response_model=Review)
async def update_review(review_id: str, data: ReviewCreate, admin: dict = Depends(get_current_admin)):
    await db.reviews.update_one({"id": review_id}, {"$set": data.model_dump()})
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# Offers CRUD
@api_router.post("/admin/offers", response_model=Offer)
async def create_offer(data: OfferCreate, admin: dict = Depends(get_current_admin)):
    offer = Offer(**data.model_dump())
    await db.offers.insert_one(offer.model_dump())
    return offer

@api_router.put("/admin/offers/{offer_id}", response_model=Offer)
async def update_offer(offer_id: str, data: OfferUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.offers.update_one({"id": offer_id}, {"$set": update_data})
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@api_router.delete("/admin/offers/{offer_id}")
async def delete_offer(offer_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deleted"}

@api_router.patch("/admin/offers/{offer_id}/toggle")
async def toggle_offer(offer_id: str, admin: dict = Depends(get_current_admin)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    new_status = not offer.get("active", True)
    await db.offers.update_one({"id": offer_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

# Image Upload (Base64)
@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode('utf-8')
    content_type = file.content_type or "image/jpeg"
    data_url = f"data:{content_type};base64,{base64_data}"
    return {"url": data_url}

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    """Seed database with sample data - only works if database is empty (first-time setup)"""
    
    # Check if already seeded - prevent public writes if data exists
    existing = await db.salon_profile.find_one({})
    if existing:
        return {"message": "Database already seeded", "seeded": False}
    
    # Also check if any admin exists - if so, require auth
    admin_exists = await db.admins.find_one({})
    if admin_exists:
        raise HTTPException(status_code=403, detail="Database already initialized. Use admin panel to manage data.")
    
    # Salon Profile - Full Template Data
    salon = SalonProfile(
        id="salon-1",
        # Basic Info
        name="Glow Beauty Studio",
        brandAccent="Glow",
        tagline="Your destination for beauty and self-care",
        aboutText="We offer premium salon services with a personalized touch. Our expert team is dedicated to making you look and feel your best.",
        # Location
        area="Dombivli East",
        address="Shop No. 12, Ganga Complex, Near Railway Station, Dombivli East, Maharashtra 421201",
        defaultArea="Dombivli",
        # Contact
        phone="+91 98765 43210",
        whatsappNumber="918879878493",
        googleMapsUrl="https://maps.google.com/?q=19.2183,73.0878",
        openingHours="Mon-Sat: 10:00 AM - 8:00 PM, Sun: 11:00 AM - 6:00 PM",
        # Social
        instagramUrl="https://instagram.com/glowbeautystudio",
        # Branding
        heroImageUrl="https://images.unsplash.com/photo-1633443682042-17462ad4ad76?w=1920&q=80",
        primaryColor="#D69E8E",
        accentColor="#9D5C63",
        # Content
        heroTitle="Welcome to Premium Beauty Care",
        heroSubtitle="Experience the best in beauty services. Our expert team is ready to pamper you with personalized treatments.",
        ctaText="Book Appointment",
        bookingTips=[
            "Book at least 1 day in advance for regular services",
            "Bridal packages require 2-week advance booking",
            "Arrive 10 minutes early for your appointment",
            "Cancellations accepted up to 2 hours before"
        ],
        # SEO
        metaTitle="Glow Beauty Studio - Premium Salon in Dombivli",
        metaDescription="Your destination for premium beauty services in Dombivli. Hair, skin, nails, bridal packages and more."
    )
    await db.salon_profile.insert_one(salon.model_dump())
    
    # Service Categories
    categories = [
        ServiceCategory(id="cat-hair", name="Hair Services", order=1),
        ServiceCategory(id="cat-skin", name="Skin & Facial", order=2),
        ServiceCategory(id="cat-nails", name="Nail Art & Care", order=3),
        ServiceCategory(id="cat-bridal", name="Bridal Packages", order=4),
        ServiceCategory(id="cat-spa", name="Body Spa & Massage", order=5),
    ]
    for cat in categories:
        await db.service_categories.insert_one(cat.model_dump())
    
    # Services
    services = [
        # Hair
        Service(id="svc-1", categoryId="cat-hair", name="Haircut & Styling", priceStartingAt=300, durationMins=45, description="Professional haircut with wash and blow dry", imageUrl="https://images.unsplash.com/photo-1767804852219-fa5af7d6d407?w=400"),
        Service(id="svc-2", categoryId="cat-hair", name="Hair Coloring", priceStartingAt=1500, durationMins=120, description="Global or highlights with premium products", imageUrl="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400"),
        Service(id="svc-3", categoryId="cat-hair", name="Hair Spa Treatment", priceStartingAt=800, durationMins=60, description="Deep conditioning and scalp massage", imageUrl="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400"),
        Service(id="svc-4", categoryId="cat-hair", name="Keratin Treatment", priceStartingAt=3500, durationMins=180, description="Smooth, frizz-free hair for 3-4 months", imageUrl="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400"),
        # Skin
        Service(id="svc-5", categoryId="cat-skin", name="Classic Facial", priceStartingAt=600, durationMins=45, description="Deep cleansing and hydrating facial", imageUrl="https://images.unsplash.com/photo-1762121903467-8cf5cc423ba5?w=400"),
        Service(id="svc-6", categoryId="cat-skin", name="Gold Facial", priceStartingAt=1200, durationMins=60, description="Luxurious anti-aging treatment", imageUrl="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400"),
        Service(id="svc-7", categoryId="cat-skin", name="Cleanup", priceStartingAt=400, durationMins=30, description="Quick refresh for glowing skin", imageUrl="https://images.unsplash.com/photo-1552693673-1bf958298935?w=400"),
        Service(id="svc-8", categoryId="cat-skin", name="De-Tan Treatment", priceStartingAt=500, durationMins=45, description="Remove tan and brighten skin", imageUrl="https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400"),
        # Nails
        Service(id="svc-9", categoryId="cat-nails", name="Manicure", priceStartingAt=350, durationMins=30, description="Nail shaping, cuticle care, polish", imageUrl="https://images.unsplash.com/photo-1754799670410-b282791342c3?w=400"),
        Service(id="svc-10", categoryId="cat-nails", name="Pedicure", priceStartingAt=450, durationMins=45, description="Complete foot care with massage", imageUrl="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400"),
        Service(id="svc-11", categoryId="cat-nails", name="Nail Art", priceStartingAt=200, durationMins=30, description="Creative nail designs", imageUrl="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400"),
        Service(id="svc-12", categoryId="cat-nails", name="Gel Extensions", priceStartingAt=1500, durationMins=90, description="Long-lasting gel nail extensions", imageUrl="https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400"),
        # Bridal
        Service(id="svc-13", categoryId="cat-bridal", name="Bridal Makeup", priceStartingAt=8000, durationMins=120, description="Complete bridal look with HD makeup", imageUrl="https://images.unsplash.com/photo-1672985352725-a64688cb61b7?w=400"),
        Service(id="svc-14", categoryId="cat-bridal", name="Pre-Bridal Package", priceStartingAt=15000, durationMins=300, description="4-session complete bridal prep", imageUrl="https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400"),
        Service(id="svc-15", categoryId="cat-bridal", name="Party Makeup", priceStartingAt=2500, durationMins=60, description="Glamorous look for special occasions", imageUrl="https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400"),
        # Spa
        Service(id="svc-16", categoryId="cat-spa", name="Full Body Massage", priceStartingAt=1200, durationMins=60, description="Relaxing aromatherapy massage", imageUrl="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400"),
        Service(id="svc-17", categoryId="cat-spa", name="Head & Shoulder Massage", priceStartingAt=400, durationMins=30, description="Stress relief massage", imageUrl="https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400"),
    ]
    for svc in services:
        await db.services.insert_one(svc.model_dump())
    
    # Gallery Images
    gallery = [
        GalleryImage(id="gal-1", imageUrl="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600", caption="Hair transformation", tag="hair", order=1),
        GalleryImage(id="gal-2", imageUrl="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600", caption="Stunning highlights", tag="hair", order=2),
        GalleryImage(id="gal-3", imageUrl="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600", caption="Keratin results", tag="hair", order=3),
        GalleryImage(id="gal-4", imageUrl="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600", caption="Glowing skin facial", tag="facial", order=4),
        GalleryImage(id="gal-5", imageUrl="https://images.unsplash.com/photo-1552693673-1bf958298935?w=600", caption="Fresh cleanup", tag="facial", order=5),
        GalleryImage(id="gal-6", imageUrl="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600", caption="Nail art design", tag="nails", order=6),
        GalleryImage(id="gal-7", imageUrl="https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600", caption="Gel extensions", tag="nails", order=7),
        GalleryImage(id="gal-8", imageUrl="https://images.unsplash.com/photo-1672985352725-a64688cb61b7?w=600", caption="Bridal makeup", tag="bridal", order=8),
        GalleryImage(id="gal-9", imageUrl="https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600", caption="Wedding ready", tag="bridal", order=9),
        GalleryImage(id="gal-10", imageUrl="https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=600", caption="Party glam", tag="bridal", order=10),
    ]
    for img in gallery:
        await db.gallery_images.insert_one(img.model_dump())
    
    # Reviews
    reviews = [
        Review(id="rev-1", name="Priya Sharma", rating=5, text="Best salon in Dombivli! The staff is so professional and friendly. My bridal makeup was absolutely perfect.", source="Google", order=1, avatarUrl="https://images.unsplash.com/photo-1590905775253-a4f0f3c426ff?w=100"),
        Review(id="rev-2", name="Sneha Patil", rating=5, text="I've been coming here for 2 years. Love their hair spa treatment - always leaves my hair so soft and shiny!", source="Google", order=2, avatarUrl="https://images.unsplash.com/photo-1762320562149-1852601a77ba?w=100"),
        Review(id="rev-3", name="Anjali Deshmukh", rating=5, text="Amazing nail art! They have such creative designs. Very hygienic too.", source="Instagram", order=3),
        Review(id="rev-4", name="Kavita Joshi", rating=4, text="Great facials at reasonable prices. The gold facial made my skin glow for days!", source="Google", order=4),
        Review(id="rev-5", name="Meera Kulkarni", rating=5, text="The pre-bridal package was worth every rupee. Got so many compliments on my wedding day!", source="Google", order=5),
    ]
    for rev in reviews:
        await db.reviews.insert_one(rev.model_dump())
    
    # Offers
    offers = [
        Offer(id="off-1", title="New Year Special", description="20% off on all hair services!", validTill="2026-01-31", active=True),
        Offer(id="off-2", title="Bridal Season Offer", description="Free hair spa with any bridal package booking", validTill="2026-03-31", active=True),
        Offer(id="off-3", title="First Visit Discount", description="15% off for first-time visitors", active=True),
    ]
    for off in offers:
        await db.offers.insert_one(off.model_dump())
    
    # Create Admin User
    admin = Admin(
        id="admin-1",
        email="admin@glowbeauty.com",
        password_hash=hash_password("admin123"),
        name="Salon Admin"
    )
    await db.admins.insert_one(admin.model_dump())
    
    return {"message": "Database seeded successfully", "admin_email": "admin@glowbeauty.com", "admin_password": "admin123"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

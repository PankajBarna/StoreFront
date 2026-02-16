import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, Star, ArrowRight, Gift, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Try to seed database (will be ignored if already seeded)
      try {
        await fetch(`${API}/seed`, { method: "POST" });
      } catch (e) {
        // Ignore seed errors - database may already be initialized
      }
      
      const res = await fetch(`${API}/home-data`);
      if (res.ok) {
        const data = await res.json();
        setHomeData(data);
      }
    } catch (e) {
      console.error("Error fetching home data:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#D69E8E] mx-auto animate-pulse" />
          <p className="mt-4 text-[#8C7B75]">Loading...</p>
        </div>
      </div>
    );
  }

  const { salon, topServices, reviews, offers } = homeData || {};

  // Dynamic content from salon profile
  const brandAccent = salon?.brandAccent || "";
  const fullName = salon?.name || "Beauty Studio";
  const nameWithoutAccent = brandAccent ? fullName.replace(brandAccent, "").trim() : fullName;
  const heroImage = salon?.heroImageUrl || "https://images.unsplash.com/photo-1633443682042-17462ad4ad76?w=1920&q=80";

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 hero-overlay" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            {brandAccent && (
              <p className="font-accent text-2xl md:text-3xl text-[#9D5C63] mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {salon?.heroTitle?.split(' ')[0] || "Welcome to"}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#4A403A] mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {salon?.name || "Beauty Studio"}
            </h1>
            <p className="text-lg md:text-xl text-[#8C7B75] mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {salon?.heroSubtitle || salon?.tagline || "Your destination for beauty and self-care."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Link
                to="/book"
                className="btn-primary inline-flex items-center justify-center gap-2 bg-[#D69E8E] hover:bg-[#C0806E] text-white px-8 py-4 rounded-full font-medium text-lg shadow-lg"
                data-testid="hero-book-btn"
              >
                {salon?.ctaText || "Book Appointment"}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 bg-white border border-[#E6D5D0] text-[#9D5C63] px-8 py-4 rounded-full font-medium text-lg hover:bg-[#FDF8F5] transition-colors"
                data-testid="hero-services-btn"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Active Offers */}
      {offers && offers.length > 0 && (
        <section className="py-12 md:py-16 bg-[#FDF8F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <Gift className="w-6 h-6 text-[#9D5C63]" />
              <h2 className="text-2xl md:text-3xl font-semibold text-[#4A403A]">
                Special Offers
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {offers.map((offer, index) => (
                <Card 
                  key={offer.id} 
                  className="offer-card bg-white border-[#E6D5D0] rounded-2xl overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`offer-card-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-[#4A403A]">{offer.title}</h3>
                      <span className="bg-[#D69E8E] text-white text-xs px-3 py-1 rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-[#8C7B75] mb-3">{offer.description}</p>
                    {offer.validTill && (
                      <p className="text-xs text-[#9D5C63]">
                        Valid till: {new Date(offer.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Services */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-accent text-xl text-[#9D5C63] mb-2">Our Services</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-[#4A403A] mb-4">
              Popular Treatments
            </h2>
            <p className="text-[#8C7B75] max-w-2xl mx-auto">
              Discover our most loved services that keep our clients coming back
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {topServices?.map((service, index) => (
              <Card 
                key={service.id} 
                className="service-card group bg-white border-[#F2E8E4] rounded-2xl overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`service-card-${index}`}
              >
                {service.imageUrl && (
                  <div className="img-zoom aspect-[4/3] overflow-hidden">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#4A403A] mb-2 group-hover:text-[#9D5C63] transition-colors">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-[#8C7B75] mb-4 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[#8C7B75]">
                      <Clock className="w-4 h-4" />
                      <span>{service.durationMins} mins</span>
                    </div>
                    <p className="text-lg font-semibold text-[#9D5C63]">
                      ₹{service.priceStartingAt}+
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-[#9D5C63] font-medium hover:text-[#D69E8E] transition-colors"
              data-testid="view-all-services-link"
            >
              View All Services
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 md:py-24 bg-[#FDF8F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="font-accent text-xl text-[#9D5C63] mb-2">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-[#4A403A] mb-4">
                What Our Clients Say
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review, index) => (
                <Card 
                  key={review.id} 
                  className="review-card bg-white border-[#E6D5D0]/50 rounded-2xl animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`review-card-${index}`}
                >
                  <CardContent className="p-6">
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Review Text */}
                    <p className="text-[#4A403A] mb-4 leading-relaxed">
                      "{review.text}"
                    </p>
                    
                    {/* Reviewer */}
                    <div className="flex items-center gap-3">
                      {review.avatarUrl ? (
                        <img
                          src={review.avatarUrl}
                          alt={review.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#D69E8E] flex items-center justify-center text-white font-medium">
                          {review.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#4A403A]">{review.name}</p>
                        <p className="text-xs text-[#8C7B75]">{review.source}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#4A403A] rounded-3xl p-8 md:p-12 text-center">
            <p className="font-accent text-2xl text-[#D69E8E] mb-2">
              {brandAccent ? `Ready to ${brandAccent}?` : "Ready to Book?"}
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
              {salon?.ctaText || "Book Your Appointment Today"}
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              {salon?.aboutText || "Experience the best in beauty care. Our expert team is ready to pamper you with premium services."}
            </p>
            <Link
              to="/book"
              className="inline-flex items-center gap-2 bg-[#D69E8E] hover:bg-[#C0806E] text-white px-8 py-4 rounded-full font-medium text-lg shadow-lg transition-all duration-300 hover:scale-105"
              data-testid="cta-book-btn"
            >
              {salon?.ctaText || "Book Now"}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, Star, ArrowRight, Sparkles } from "lucide-react";

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
      try {
        await fetch(`${API}/seed`, { method: "POST" });
      } catch (e) {}
      
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
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCFA]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D69E8E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-6 text-[#8C7B75] tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }

  const { salon, topServices, reviews, offers } = homeData || {};
  const heroImage = salon?.heroImageUrl || "https://images.unsplash.com/photo-1633443682042-17462ad4ad76?w=1920&q=80";

  return (
    <div data-testid="home-page" className="bg-[#FFFCFA]">
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        {/* Background Image - Full Coverage */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Dark Luxury Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 border border-white/10 rounded-full" />
        <div className="absolute bottom-32 right-20 w-48 h-48 border border-white/5 rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-[#D69E8E] rounded-full animate-pulse" />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Content - Centered */}
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 text-center">
            {/* Accent Line */}
            <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-px bg-[#D69E8E]" />
              <span className="text-sm font-medium text-[#D69E8E] tracking-[0.3em] uppercase">
                {salon?.area || "Premium Beauty"}
              </span>
              <div className="w-12 h-px bg-[#D69E8E]" />
            </div>
            
            {/* Main Heading */}
            <h1 
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-8 animate-fade-in-up tracking-tight"
              style={{ animationDelay: '0.2s' }}
            >
              {salon?.name || "Beauty Studio"}
            </h1>
            
            {/* Elegant Divider */}
            <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Sparkles className="w-5 h-5 text-[#D69E8E]" />
            </div>
            
            {/* Subheading */}
            <p 
              className="text-lg md:text-xl text-white/80 leading-relaxed mb-12 max-w-2xl mx-auto animate-fade-in-up font-light"
              style={{ animationDelay: '0.4s' }}
            >
              {salon?.tagline || "Your destination for beauty and self-care"}
            </p>
            
            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
              style={{ animationDelay: '0.5s' }}
            >
              <Link
                to="/book"
                className="group inline-flex items-center justify-center gap-3 bg-[#D69E8E] hover:bg-[#C48B7D] text-white px-10 py-5 rounded-full font-medium text-base shadow-2xl hover:shadow-[#D69E8E]/25 transition-all duration-500 hover:scale-105"
                data-testid="hero-book-btn"
              >
                {salon?.ctaText || "Book Appointment"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 hover:border-white/60 text-white px-10 py-5 rounded-full font-medium text-base backdrop-blur-sm transition-all duration-500 hover:bg-white/10"
                data-testid="hero-services-btn"
              >
                {salon?.exploreServicesText || "Explore Services"}
              </Link>
            </div>
            
            {/* Bottom Stats Bar - Dynamic */}
            {salon?.stats && salon.stats.length > 0 && (
              <div 
                className="mt-20 pt-10 border-t border-white/10 animate-fade-in-up"
                style={{ animationDelay: '0.6s' }}
              >
                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                  {salon.stats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-8 md:gap-16">
                      <div className="text-center">
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                        <p className="text-sm text-white/60 tracking-wide">{stat.label}</p>
                      </div>
                      {index < salon.stats.length - 1 && (
                        <div className="w-px h-12 bg-white/20 hidden md:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-[#D69E8E] rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== POPULAR SERVICES ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-medium text-[#D69E8E] tracking-[0.2em] uppercase mb-4">
              Services
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
              {salon?.servicesHeading || "Popular Treatments"}
            </h2>
            <p className="text-[#8C7B75] max-w-md mx-auto">
              {salon?.servicesSubheading || "Discover our most loved services"}
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topServices?.slice(0, 6).map((service, index) => (
              <Link 
                key={service.id}
                to={`/book?service=${encodeURIComponent(service.name)}`}
                className="group block"
                data-testid={`service-card-${index}`}
              >
                <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                  {/* Image */}
                  {service.imageUrl && (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-[#4A403A] group-hover:text-[#9D5C63] transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-xl font-bold text-[#D69E8E] whitespace-nowrap">
                        {salon?.currency || "₹"}{service.priceStartingAt}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[#8C7B75]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {service.durationMins} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        Book now
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View All Link */}
          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-[#4A403A] font-medium hover:text-[#D69E8E] transition-colors group"
              data-testid="view-all-services-link"
            >
              {salon?.viewAllServicesText || "View All Services"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SPECIAL OFFERS ===== */}
      {offers && offers.length > 0 && (
        <section className="py-20 bg-[#4A403A]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-medium text-[#D69E8E] tracking-[0.2em] uppercase mb-4">
                Limited Time
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Special Offers
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {offers.map((offer, index) => (
                <div 
                  key={offer.id}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/15 transition-colors"
                  data-testid={`offer-card-${index}`}
                >
                  <div className="inline-flex items-center gap-2 bg-[#D69E8E] text-white text-xs font-medium px-3 py-1 rounded-full mb-4">
                    <Sparkles className="w-3 h-3" />
                    Active Offer
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{offer.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{offer.description}</p>
                  {offer.validTill && (
                    <p className="text-[#D69E8E] text-xs mt-4">
                      Valid till {new Date(offer.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== TESTIMONIALS ===== */}
      {reviews && reviews.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-medium text-[#D69E8E] tracking-[0.2em] uppercase mb-4">
                {salon?.testimonialsSubheading || "Testimonials"}
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A]">
                {salon?.testimonialsHeading || "Client Love"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.slice(0, 3).map((review, index) => (
                <div 
                  key={review.id}
                  className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow"
                  data-testid={`review-card-${index}`}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-[#4A403A] leading-relaxed mb-8 text-lg">
                    "{review.text}"
                  </p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    {review.avatarUrl ? (
                      <img
                        src={review.avatarUrl}
                        alt={review.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D69E8E] to-[#9D5C63] flex items-center justify-center text-white font-semibold text-lg">
                        {review.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#4A403A]">{review.name}</p>
                      <p className="text-sm text-[#8C7B75]">{review.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 md:py-28 bg-[#FDF8F5]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-medium text-[#D69E8E] tracking-[0.2em] uppercase mb-4">
            Ready?
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-6">
            Book Your Experience
          </h2>
          <p className="text-[#6B5B54] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            {salon?.aboutText || "Experience the best in beauty care. Our expert team is ready to pamper you."}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-3 bg-[#4A403A] hover:bg-[#3A3230] text-white px-10 py-5 rounded-full font-medium text-lg shadow-xl hover:shadow-2xl transition-all duration-300 group"
            data-testid="cta-book-btn"
          >
            {salon?.ctaText || "Book Now"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}

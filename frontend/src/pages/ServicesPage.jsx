import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ServicesPage() {
  const [groupedServices, setGroupedServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API}/services/grouped`);
      if (res.ok) {
        const data = await res.json();
        setGroupedServices(data);
      }
    } catch (e) {
      console.error("Error fetching services:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#D69E8E] mx-auto animate-pulse" />
          <p className="mt-4 text-[#8C7B75]">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="services-page" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-accent text-xl text-[#9D5C63] mb-2">Our Menu</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
            Services & Price List
          </h1>
          <p className="text-[#8C7B75] max-w-2xl mx-auto">
            Discover our comprehensive range of beauty services designed to make you look and feel your best
          </p>
        </div>

        {/* Service Categories */}
        <div className="space-y-16">
          {groupedServices.map((group, groupIndex) => (
            <section 
              key={group.category.id} 
              className="animate-fade-in-up"
              style={{ animationDelay: `${groupIndex * 0.1}s` }}
              data-testid={`service-category-${group.category.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-8 mt-12">
                <div className="h-px flex-1 bg-[#E6D5D0]" />
                <h2 className="text-2xl md:text-3xl font-semibold text-[#4A403A]">
                  {group.category.name}
                </h2>
                <div className="h-px flex-1 bg-[#E6D5D0]" />
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.services.map((service, serviceIndex) => (
                  <Card 
                    key={service.id} 
                    className="service-card group bg-white border-[#F2E8E4] rounded-2xl overflow-hidden"
                    data-testid={`service-item-${service.id}`}
                  >
                    {service.imageUrl && (
                      <div className="img-zoom aspect-[16/10] overflow-hidden">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-[#4A403A] group-hover:text-[#9D5C63] transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-lg font-bold text-[#9D5C63] whitespace-nowrap">
                          ₹{service.priceStartingAt}+
                        </p>
                      </div>
                      
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
                        <Link
                          to={`/book?service=${encodeURIComponent(service.name)}`}
                          className="text-sm font-medium text-[#D69E8E] hover:text-[#9D5C63] flex items-center gap-1"
                          data-testid={`book-service-${service.id}`}
                        >
                          Book
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-[#FDF8F5] rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-semibold text-[#4A403A] mb-4">
            Can't decide?
          </h3>
          <p className="text-[#8C7B75] mb-6 max-w-xl mx-auto">
            Our experts are here to help you choose the perfect treatment for your needs
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-[#D69E8E] hover:bg-[#C0806E] text-white px-8 py-4 rounded-full font-medium shadow-lg transition-all duration-300"
            data-testid="services-cta-btn"
          >
            Get a Consultation
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

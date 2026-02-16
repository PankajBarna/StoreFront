import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Shield, Clock, CreditCard, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon mapping
const iconMap = {
  clock: Clock,
  alert: AlertCircle,
  "credit-card": CreditCard,
  shield: Shield
};

export default function PoliciesPage() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetchSalonData();
  }, []);

  const fetchSalonData = async () => {
    try {
      const res = await fetch(`${API}/salon`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
      }
    } catch (e) {
      console.error("Error fetching salon data:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
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

  const policies = salon?.policies || [];
  const faqs = salon?.faqs || [];

  return (
    <div data-testid="policies-page" className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-accent text-xl text-[#9D5C63] mb-2">Information</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
            Policies & FAQ
          </h1>
          <p className="text-[#8C7B75] max-w-2xl mx-auto">
            Everything you need to know about our services and policies
          </p>
        </div>

        {/* Policies Section */}
        {policies.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold text-[#4A403A] mb-8">
              Our Policies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policies.map((policy, index) => {
                const IconComponent = iconMap[policy.icon] || Shield;
                return (
                  <Card 
                    key={index} 
                    className="bg-white border-[#E6D5D0] rounded-2xl animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    data-testid={`policy-card-${index}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#D69E8E]/10 flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-[#D69E8E]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#4A403A]">{policy.title}</h3>
                      </div>
                      <ul className="space-y-2">
                        {policy.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#8C7B75]">
                            <span className="text-[#D69E8E] mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-semibold text-[#4A403A] mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-[#E6D5D0] rounded-2xl overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  data-testid={`faq-item-${index}`}
                >
                  <button
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                    onClick={() => toggleFaq(index)}
                    data-testid={`faq-toggle-${index}`}
                  >
                    <span className="font-medium text-[#4A403A] pr-4">{faq.question}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-[#D69E8E] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#8C7B75] flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-4 animate-fade-in">
                      <p className="text-[#8C7B75] leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact CTA */}
        {salon && (
          <div className="mt-16 text-center bg-[#FDF8F5] rounded-2xl p-8">
            <h3 className="text-xl md:text-2xl font-semibold text-[#4A403A] mb-4">
              Still have questions?
            </h3>
            <p className="text-[#8C7B75] mb-6">
              We're here to help! Reach out to us anytime.
            </p>
            <a
              href={`https://wa.me/${salon.whatsappNumber}?text=${encodeURIComponent(`Hi! I have a question about ${salon.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white px-8 py-3 rounded-full font-medium shadow-lg transition-all duration-300"
              data-testid="faq-contact-btn"
            >
              Chat with Us
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

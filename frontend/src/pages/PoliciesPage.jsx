import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Clock, CreditCard, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PoliciesPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const policies = [
    {
      icon: Clock,
      title: "Appointment Policy",
      content: [
        "Please arrive 10 minutes before your scheduled appointment",
        "Late arrivals may result in reduced service time or rescheduling",
        "Walk-ins are welcome but appointments are given priority"
      ]
    },
    {
      icon: AlertCircle,
      title: "Cancellation Policy",
      content: [
        "Cancel at least 2 hours before your appointment",
        "Repeated no-shows may require advance payment for future bookings",
        "Bridal packages require 48 hours notice for cancellation"
      ]
    },
    {
      icon: CreditCard,
      title: "Payment Policy",
      content: [
        "We accept Cash, UPI, and all major cards",
        "Bridal packages require 50% advance payment",
        "Prices are subject to change without prior notice"
      ]
    },
    {
      icon: Shield,
      title: "Health & Safety",
      content: [
        "All tools are sterilized between clients",
        "Please inform us of any allergies or skin conditions",
        "Patch tests are recommended for color and chemical treatments"
      ]
    }
  ];

  const faqs = [
    {
      question: "Do I need to book an appointment in advance?",
      answer: "While walk-ins are welcome, we highly recommend booking in advance to ensure your preferred time slot is available. For bridal services, please book at least 2 weeks in advance."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept cash, all major credit/debit cards, UPI payments (Google Pay, PhonePe, Paytm), and bank transfers for larger packages."
    },
    {
      question: "How long does a bridal makeup session take?",
      answer: "A complete bridal makeup session typically takes 2-3 hours, including hair styling. We recommend arriving at least 3 hours before the event time."
    },
    {
      question: "Do you offer home services?",
      answer: "Yes, we offer home services for bridal makeup and special occasions. Additional charges apply based on location. Please contact us for details."
    },
    {
      question: "What products do you use?",
      answer: "We use premium, professional-grade products from brands like L'Oreal Professional, Schwarzkopf, O3+, VLCC, and more. We also offer organic and herbal options upon request."
    },
    {
      question: "Can I see the products before my treatment?",
      answer: "Absolutely! We believe in transparency. Our staff will show you the products before use and explain the procedure."
    },
    {
      question: "Do you offer gift cards or packages?",
      answer: "Yes! Gift cards are available for any amount. We also have special packages for birthdays, anniversaries, and festivals. Contact us for current offers."
    },
    {
      question: "Is parking available near the salon?",
      answer: "Yes, there is public parking available near Ganga Complex. You can also find street parking on the main road."
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

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
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[#4A403A] mb-8">
            Our Policies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy, index) => (
              <Card 
                key={index} 
                className="bg-white border-[#E6D5D0] rounded-2xl animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`policy-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#D69E8E]/10 flex items-center justify-center">
                      <policy.icon className="w-6 h-6 text-[#D69E8E]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#4A403A]">{policy.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {policy.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#8C7B75]">
                        <span className="text-[#D69E8E] mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
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

        {/* Contact CTA */}
        <div className="mt-16 text-center bg-[#FDF8F5] rounded-2xl p-8">
          <h3 className="text-xl md:text-2xl font-semibold text-[#4A403A] mb-4">
            Still have questions?
          </h3>
          <p className="text-[#8C7B75] mb-6">
            We're here to help! Reach out to us anytime.
          </p>
          <a
            href="https://wa.me/919876543210?text=Hi!%20I%20have%20a%20question%20about%20Glow%20Beauty%20Studio."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white px-8 py-3 rounded-full font-medium shadow-lg transition-all duration-300"
            data-testid="faq-contact-btn"
          >
            Chat with Us
          </a>
        </div>
      </div>
    </div>
  );
}

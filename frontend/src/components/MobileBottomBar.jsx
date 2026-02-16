import { Phone, MapPin, MessageCircle } from "lucide-react";

export const MobileBottomBar = ({ salon }) => {
  if (!salon) return null;

  const whatsappMessage = encodeURIComponent(
    `Hi! I'd like to book an appointment at Glow Beauty Studio.`
  );
  const whatsappUrl = `https://wa.me/${salon.whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[#E6D5D0] mobile-bottom-bar">
      <div className="flex items-center justify-between px-4 py-3 gap-2">
        {/* Call Button */}
        <a
          href={`tel:${salon.phone}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#E6D5D0] text-[#4A403A] font-medium text-sm hover:bg-[#FDF8F5]"
          data-testid="mobile-call-btn"
        >
          <Phone className="w-4 h-4" />
          <span>Call</span>
        </a>

        {/* WhatsApp Button - Primary CTA */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] text-white font-medium text-sm shadow-lg whatsapp-float"
          data-testid="mobile-whatsapp-btn"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Book on WhatsApp</span>
        </a>

        {/* Directions Button */}
        <a
          href={salon.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#E6D5D0] text-[#4A403A] font-medium text-sm hover:bg-[#FDF8F5]"
          data-testid="mobile-directions-btn"
        >
          <MapPin className="w-4 h-4" />
          <span>Map</span>
        </a>
      </div>
    </div>
  );
};

export default MobileBottomBar;

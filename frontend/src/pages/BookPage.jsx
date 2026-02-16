import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Phone, MapPin, Clock, Calendar, User, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BookPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedService = searchParams.get("service") || "";

  const [salon, setSalon] = useState(null);
  const [groupedServices, setGroupedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    selectedServices: [],
    date: null,
    time: "",
    area: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Pre-select service from URL param
    if (preSelectedService && groupedServices.length > 0) {
      const allServices = groupedServices.flatMap(g => g.services);
      const matchedService = allServices.find(s => s.name === preSelectedService);
      if (matchedService && !formData.selectedServices.find(s => s.id === matchedService.id)) {
        setFormData(prev => ({
          ...prev,
          selectedServices: [...prev.selectedServices, matchedService]
        }));
      }
    }
  }, [preSelectedService, groupedServices]);

  useEffect(() => {
    // Set default area from salon profile
    if (salon?.defaultArea && !formData.area) {
      setFormData(prev => ({ ...prev, area: salon.defaultArea }));
    }
  }, [salon]);

  const fetchData = async () => {
    try {
      const [salonRes, servicesRes] = await Promise.all([
        fetch(`${API}/salon`),
        fetch(`${API}/services/grouped`)
      ]);
      
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalon(salonData);
      }
      
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setGroupedServices(servicesData);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
    "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM"
  ];

  const toggleService = (service) => {
    setFormData(prev => {
      const exists = prev.selectedServices.find(s => s.id === service.id);
      if (exists) {
        return {
          ...prev,
          selectedServices: prev.selectedServices.filter(s => s.id !== service.id)
        };
      } else {
        return {
          ...prev,
          selectedServices: [...prev.selectedServices, service]
        };
      }
    });
  };

  const removeService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.filter(s => s.id !== serviceId)
    }));
  };

  const isServiceSelected = (serviceId) => {
    return formData.selectedServices.some(s => s.id === serviceId);
  };

  // Calculate totals
  const totalPrice = formData.selectedServices.reduce((sum, s) => sum + s.priceStartingAt, 0);
  const totalDuration = formData.selectedServices.reduce((sum, s) => sum + s.durationMins, 0);

  const generateWhatsAppMessage = () => {
    const dateStr = formData.date ? format(formData.date, "dd MMM yyyy") : "Not selected";
    const servicesText = formData.selectedServices.length > 0
      ? formData.selectedServices.map(s => `• ${s.name} (₹${s.priceStartingAt}+, ${s.durationMins} mins)`).join("\n")
      : "Not selected";
    
    const message = `Hi! I'd like to book an appointment at ${salon?.name || "the salon"}.

*Name:* ${formData.name || "Not provided"}

*Services:*
${servicesText}

*Estimated Total:* ₹${totalPrice}+ (${totalDuration} mins)

*Preferred Date:* ${dateStr}
*Preferred Time:* ${formData.time || "Not selected"}
*Area:* ${formData.area}

Please confirm availability. Thank you!`;
    
    return encodeURIComponent(message);
  };

  const handleBooking = (e) => {
    e.preventDefault();
    
    if (formData.selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    // Generate WhatsApp URL with current form data
    const whatsappUrl = `https://wa.me/${salon.whatsappNumber}?text=${generateWhatsAppMessage()}`;
    
    // Show success notification
    toast.success("Redirecting to WhatsApp...", {
      description: `Booking ${formData.selectedServices.length} service(s) for ${formData.name || "you"}`,
    });

    // Open WhatsApp in new tab/window
    window.open(whatsappUrl, '_blank');

    // Redirect to home page after a short delay
    setTimeout(() => {
      toast.success("Booking request sent!", {
        description: "Please complete your booking on WhatsApp. We'll confirm your appointment shortly.",
      });
      navigate("/");
    }, 1500);
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

  return (
    <div data-testid="book-page" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-accent text-xl text-[#9D5C63] mb-2">Book Now</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
            Book Your Appointment
          </h1>
          <p className="text-[#8C7B75] max-w-2xl mx-auto">
            Select one or more services and we'll confirm your booking via WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name Input */}
            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#4A403A]">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C7B75]" />
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] focus:ring-[#D69E8E]/20"
                      data-testid="book-name-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label className="text-[#4A403A]">Preferred Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal rounded-xl border-[#E6D5D0] hover:bg-[#FDF8F5]"
                          data-testid="book-date-picker"
                        >
                          <Calendar className="mr-2 h-5 w-5 text-[#8C7B75]" />
                          {formData.date ? (
                            format(formData.date, "PPP")
                          ) : (
                            <span className="text-[#8C7B75]">Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => setFormData({ ...formData, date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2">
                    <Label className="text-[#4A403A]">Preferred Time</Label>
                    <Select 
                      value={formData.time} 
                      onValueChange={(value) => setFormData({ ...formData, time: value })}
                    >
                      <SelectTrigger 
                        className="rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] focus:ring-[#D69E8E]/20"
                        data-testid="book-time-select"
                      >
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Area */}
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-[#4A403A]">Your Area</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C7B75]" />
                    <Input
                      id="area"
                      placeholder="Enter your area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="pl-10 rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] focus:ring-[#D69E8E]/20"
                      data-testid="book-area-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Selection */}
            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Select Services</CardTitle>
                <p className="text-sm text-[#8C7B75]">Choose one or more services you'd like to book</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupedServices.map((group) => (
                  <div key={group.category.id}>
                    <h3 className="text-sm font-semibold text-[#9D5C63] uppercase tracking-wide mb-3">
                      {group.category.name}
                    </h3>
                    <div className="space-y-2">
                      {group.services.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                            isServiceSelected(service.id)
                              ? "bg-[#D69E8E]/10 border-2 border-[#D69E8E]"
                              : "bg-[#FDF8F5] border-2 border-transparent hover:border-[#E6D5D0]"
                          }`}
                          data-testid={`service-checkbox-${service.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isServiceSelected(service.id)
                                ? "bg-[#D69E8E] border-[#D69E8E]"
                                : "border-[#E6D5D0]"
                            }`}>
                              {isServiceSelected(service.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[#4A403A]">{service.name}</p>
                              <p className="text-xs text-[#8C7B75]">{service.durationMins} mins</p>
                            </div>
                          </div>
                          <p className="font-semibold text-[#9D5C63]">₹{service.priceStartingAt}+</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary & Contact */}
          <div className="space-y-6">
            {/* Selected Services Summary */}
            <Card className="bg-white border-[#E6D5D0] rounded-2xl sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.selectedServices.length === 0 ? (
                  <p className="text-sm text-[#8C7B75] text-center py-4">
                    No services selected yet
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {formData.selectedServices.map((service) => (
                        <div 
                          key={service.id} 
                          className="flex items-center justify-between bg-[#FDF8F5] p-3 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#4A403A] truncate">{service.name}</p>
                            <p className="text-xs text-[#8C7B75]">{service.durationMins} mins</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#9D5C63]">₹{service.priceStartingAt}+</span>
                            <button
                              onClick={() => removeService(service.id)}
                              className="p-1 hover:bg-[#E6D5D0] rounded-full transition-colors"
                              data-testid={`remove-service-${service.id}`}
                            >
                              <X className="w-4 h-4 text-[#8C7B75]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-[#E6D5D0] pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8C7B75]">Estimated Duration</span>
                        <span className="font-medium text-[#4A403A]">{totalDuration} mins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C7B75]">Estimated Total</span>
                        <span className="text-lg font-bold text-[#9D5C63]">₹{totalPrice}+</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Book Button */}
                <button
                  type="button"
                  className={`flex items-center justify-center gap-3 w-full py-4 rounded-full font-medium text-lg shadow-lg transition-all duration-300 ${
                    formData.selectedServices.length > 0
                      ? "bg-[#25D366] hover:bg-[#20BD5C] text-white hover:scale-[1.02]"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                  onClick={handleBooking}
                  disabled={!salon}
                  data-testid="book-whatsapp-btn"
                >
                  <MessageCircle className="w-6 h-6" />
                  Book via WhatsApp
                </button>

                <p className="text-center text-xs text-[#8C7B75]">
                  {formData.selectedServices.length > 0 
                    ? "You'll be redirected to WhatsApp with your booking details"
                    : "Select at least one service to continue"
                  }
                </p>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="bg-[#FDF8F5] border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#4A403A]">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {salon && (
                  <>
                    <a
                      href={`tel:${salon.phone}`}
                      className="flex items-center gap-3 text-sm text-[#4A403A] hover:text-[#D69E8E]"
                      data-testid="sidebar-phone"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#D69E8E]/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-[#D69E8E]" />
                      </div>
                      <span>{salon.phone}</span>
                    </a>
                    
                    <div className="flex items-start gap-3 text-sm text-[#4A403A]">
                      <div className="w-8 h-8 rounded-full bg-[#D69E8E]/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-[#D69E8E]" />
                      </div>
                      <span className="text-xs">{salon.openingHours}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Booking Tips - Dynamic from salon profile */}
            {salon?.bookingTips && salon.bookingTips.length > 0 && (
              <Card className="bg-white border-[#E6D5D0] rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#4A403A]">Booking Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-[#8C7B75]">
                    {salon.bookingTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#D69E8E]">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

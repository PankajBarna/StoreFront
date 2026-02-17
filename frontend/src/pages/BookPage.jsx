import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Phone, MapPin, Clock, Calendar, User, Sparkles, Check, X, ChevronLeft, ChevronRight, ArrowLeft, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BookPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedService = searchParams.get("service") || "";

  const [salon, setSalon] = useState(null);
  const [groupedServices, setGroupedServices] = useState([]);
  const [features, setFeatures] = useState({ booking_calendar_enabled: false });
  const [loading, setLoading] = useState(true);
  
  // Booking calendar state - now supports multiple services
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: select services, 2: select slot, 3: enter details
  
  // Form data for WhatsApp fallback
  const [formData, setFormData] = useState({
    name: "",
    selectedServices: [],
    date: null,
    time: "",
    area: "",
    phone: "",
    notes: ""
  });

  // Dates for calendar
  const [calendarDates, setCalendarDates] = useState([]);

  useEffect(() => {
    fetchData();
    generateCalendarDates();
  }, []);

  useEffect(() => {
    if (preSelectedService && groupedServices.length > 0) {
      const allServices = groupedServices.flatMap(g => g.services);
      const matchedService = allServices.find(s => s.name === preSelectedService);
      if (matchedService) {
        if (features.booking_calendar_enabled) {
          // Add to selected services for calendar mode
          if (!selectedServices.find(s => s.id === matchedService.id)) {
            setSelectedServices([matchedService]);
          }
        } else {
          if (!formData.selectedServices.find(s => s.id === matchedService.id)) {
            setFormData(prev => ({
              ...prev,
              selectedServices: [...prev.selectedServices, matchedService]
            }));
          }
        }
      }
    }
  }, [preSelectedService, groupedServices, features]);

  useEffect(() => {
    if (salon?.defaultArea && !formData.area) {
      setFormData(prev => ({ ...prev, area: salon.defaultArea }));
    }
  }, [salon]);

  useEffect(() => {
    if (selectedServices.length > 0 && selectedDate && features.booking_calendar_enabled) {
      fetchAvailableSlots();
    }
  }, [selectedServices, selectedDate, features]);

  // Calculate totals for selected services
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceStartingAt, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMins, 0);

  // Toggle service selection for calendar mode
  const toggleCalendarService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    // Reset date/slot when services change
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(today, i));
    }
    setCalendarDates(dates);
  };

  const fetchData = async () => {
    try {
      const [salonRes, servicesRes, featuresRes] = await Promise.all([
        fetch(`${API}/salon`),
        fetch(`${API}/services/grouped`),
        fetch(`${API}/features`)
      ]);
      
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalon(salonData);
      }
      
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setGroupedServices(servicesData);
      }

      if (featuresRes.ok) {
        const featuresData = await featuresRes.json();
        setFeatures(featuresData);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (selectedServices.length === 0 || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      // Use the first service for availability check, but consider total duration
      const res = await fetch(`${API}/public/availability?serviceId=${selectedServices[0].id}&date=${dateStr}&totalDuration=${totalDuration}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (e) {
      console.error("Error fetching slots:", e);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedService || !selectedSlot || !formData.name || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch(`${API}/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          clientName: formData.name,
          clientPhone: formData.phone,
          startTime: selectedSlot.startTime,
          notes: formData.notes
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Booking created successfully!");
        
        // Open WhatsApp to confirm
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
        
        navigate("/");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to create booking");
      }
    } catch (e) {
      toast.error("Error creating booking");
    }
  };

  // WhatsApp fallback functions
  const totalPrice = formData.selectedServices.reduce((sum, s) => sum + s.priceStartingAt, 0);
  const totalDuration = formData.selectedServices.reduce((sum, s) => sum + s.durationMins, 0);

  const toggleService = (service) => {
    setFormData(prev => {
      const exists = prev.selectedServices.find(s => s.id === service.id);
      if (exists) {
        return { ...prev, selectedServices: prev.selectedServices.filter(s => s.id !== service.id) };
      } else {
        return { ...prev, selectedServices: [...prev.selectedServices, service] };
      }
    });
  };

  const handleWhatsAppBooking = (e) => {
    e.preventDefault();
    
    if (formData.selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    if (!salon?.whatsappNumber) {
      toast.error("WhatsApp number not available");
      return;
    }

    const servicesText = formData.selectedServices
      .map(s => `• ${s.name} (₹${s.priceStartingAt}+, ${s.durationMins} mins)`)
      .join("\n");
    
    const message = `Hi! I'd like to book an appointment at ${salon.name}.

*Name:* ${formData.name || "Not provided"}

*Services:*
${servicesText}

*Estimated Total:* ₹${totalPrice}+ (${totalDuration} mins)

*Preferred Date:* ${formData.date ? format(formData.date, "dd MMM yyyy") : "Flexible"}
*Preferred Time:* ${formData.time || "Flexible"}
*Area:* ${formData.area || "Not provided"}

Please confirm availability. Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${salon.whatsappNumber}?text=${encodedMessage}`;
    
    toast.success("Opening WhatsApp...");
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    navigate("/");
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

  // BOOKING CALENDAR UI (when enabled)
  if (features.booking_calendar_enabled) {
    return (
      <div data-testid="book-page" className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="font-accent text-xl text-[#9D5C63] mb-2">Book Online</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
              Book Your Appointment
            </h1>
            <p className="text-[#8C7B75]">Select a service and pick your preferred time slot</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  bookingStep >= step ? "bg-[#D69E8E] text-white" : "bg-[#F2E8E4] text-[#8C7B75]"
                }`}>
                  {bookingStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                <span className={`text-sm hidden sm:inline ${bookingStep >= step ? "text-[#4A403A]" : "text-[#8C7B75]"}`}>
                  {step === 1 ? "Service" : step === 2 ? "Date & Time" : "Details"}
                </span>
                {step < 3 && <div className="w-8 h-px bg-[#E6D5D0]" />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Service */}
          {bookingStep === 1 && (
            <Card className="border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl text-[#4A403A]">Select a Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupedServices.map((group) => (
                  <div key={group.category.id}>
                    <h3 className="text-sm font-semibold text-[#9D5C63] uppercase tracking-wide mb-3">
                      {group.category.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => {
                            setSelectedService(service);
                            setBookingStep(2);
                          }}
                          className="flex items-center justify-between p-4 rounded-xl bg-[#FDF8F5] border-2 border-transparent hover:border-[#D69E8E] transition-all text-left"
                          data-testid={`select-service-${service.id}`}
                        >
                          <div>
                            <p className="font-medium text-[#4A403A]">{service.name}</p>
                            <p className="text-xs text-[#8C7B75]">{service.durationMins} mins</p>
                          </div>
                          <p className="font-semibold text-[#9D5C63]">₹{service.priceStartingAt}+</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Date & Time */}
          {bookingStep === 2 && selectedService && (
            <Card className="border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-[#4A403A]">Select Date & Time</CardTitle>
                    <p className="text-sm text-[#8C7B75] mt-1">
                      {selectedService.name} • {selectedService.durationMins} mins • ₹{selectedService.priceStartingAt}+
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setBookingStep(1); setSelectedService(null); setSelectedDate(null); setSelectedSlot(null); }}>
                    Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-[#4A403A] mb-3 block">Select Date</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {calendarDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                        className={`flex-shrink-0 p-3 rounded-xl text-center min-w-[70px] transition-all ${
                          selectedDate && format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                            ? "bg-[#D69E8E] text-white"
                            : "bg-[#FDF8F5] text-[#4A403A] hover:bg-[#F2E8E4]"
                        }`}
                      >
                        <p className="text-xs font-medium">{format(date, "EEE")}</p>
                        <p className="text-lg font-bold">{format(date, "d")}</p>
                        <p className="text-xs">{format(date, "MMM")}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <Label className="text-[#4A403A] mb-3 block">Available Slots</Label>
                    {loadingSlots ? (
                      <div className="text-center py-8">
                        <Sparkles className="w-8 h-8 text-[#D69E8E] mx-auto animate-pulse" />
                        <p className="text-[#8C7B75] mt-2">Loading slots...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-8 bg-[#FDF8F5] rounded-xl">
                        <p className="text-[#8C7B75]">No slots available for this date</p>
                        <p className="text-sm text-[#8C7B75] mt-1">Try another date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-xl text-sm font-medium transition-all ${
                              selectedSlot?.startTime === slot.startTime
                                ? "bg-[#D69E8E] text-white"
                                : "bg-[#FDF8F5] text-[#4A403A] hover:bg-[#F2E8E4]"
                            }`}
                          >
                            {slot.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue Button */}
                {selectedSlot && (
                  <Button
                    onClick={() => setBookingStep(3)}
                    className="w-full bg-[#D69E8E] hover:bg-[#C0806E] text-white py-6 rounded-full"
                  >
                    Continue
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Enter Details */}
          {bookingStep === 3 && selectedService && selectedSlot && (
            <Card className="border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-[#4A403A]">Your Details</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setBookingStep(2)}>
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Summary */}
                <div className="bg-[#FDF8F5] p-4 rounded-xl">
                  <p className="font-semibold text-[#4A403A]">{selectedService.name}</p>
                  <p className="text-sm text-[#8C7B75]">
                    {format(new Date(selectedSlot.startTime), "EEEE, d MMMM yyyy")} at {selectedSlot.display}
                  </p>
                  <p className="text-sm text-[#9D5C63] mt-1">₹{selectedService.priceStartingAt}+ • {selectedService.durationMins} mins</p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl border-[#E6D5D0]"
                      data-testid="booking-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="rounded-xl border-[#E6D5D0]"
                      data-testid="booking-phone-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requests?"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="rounded-xl border-[#E6D5D0]"
                    />
                  </div>
                </div>

                {/* Book Button */}
                <Button
                  onClick={handleCreateBooking}
                  className="w-full bg-[#25D366] hover:bg-[#20BD5C] text-white py-6 rounded-full text-lg"
                  data-testid="confirm-booking-btn"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Confirm & Send WhatsApp
                </Button>
                <p className="text-center text-xs text-[#8C7B75]">
                  You'll receive a WhatsApp message to confirm your booking
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // WHATSAPP FALLBACK UI (when booking calendar is disabled)
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
            Select services and send us a WhatsApp message to book
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Service Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl border-[#E6D5D0]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Your Area</Label>
                    <Input
                      id="area"
                      placeholder="Enter your area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="rounded-xl border-[#E6D5D0]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Select Services</CardTitle>
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
                            formData.selectedServices.find(s => s.id === service.id)
                              ? "bg-[#D69E8E]/10 border-2 border-[#D69E8E]"
                              : "bg-[#FDF8F5] border-2 border-transparent hover:border-[#E6D5D0]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              formData.selectedServices.find(s => s.id === service.id)
                                ? "bg-[#D69E8E] border-[#D69E8E]"
                                : "border-[#E6D5D0]"
                            }`}>
                              {formData.selectedServices.find(s => s.id === service.id) && (
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

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white border-[#E6D5D0] rounded-2xl sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-[#4A403A]">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.selectedServices.length === 0 ? (
                  <p className="text-sm text-[#8C7B75] text-center py-4">No services selected</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {formData.selectedServices.map((service) => (
                        <div key={service.id} className="flex items-center justify-between bg-[#FDF8F5] p-3 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-[#4A403A]">{service.name}</p>
                            <p className="text-xs text-[#8C7B75]">{service.durationMins} mins</p>
                          </div>
                          <span className="text-sm font-semibold text-[#9D5C63]">₹{service.priceStartingAt}+</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#E6D5D0] pt-4">
                      <div className="flex justify-between text-sm mb-2">
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

                <button
                  onClick={handleWhatsAppBooking}
                  disabled={formData.selectedServices.length === 0}
                  className={`flex items-center justify-center gap-3 w-full py-4 rounded-full font-medium text-lg shadow-lg transition-all ${
                    formData.selectedServices.length > 0
                      ? "bg-[#25D366] hover:bg-[#20BD5C] text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                  data-testid="book-whatsapp-btn"
                >
                  <MessageCircle className="w-6 h-6" />
                  Book via WhatsApp
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

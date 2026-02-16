import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Phone, MapPin, Clock, Calendar, User, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BookPage() {
  const [searchParams] = useSearchParams();
  const preSelectedService = searchParams.get("service") || "";

  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    service: preSelectedService,
    date: null,
    time: "",
    area: "Dombivli"
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preSelectedService) {
      setFormData(prev => ({ ...prev, service: preSelectedService }));
    }
  }, [preSelectedService]);

  const fetchData = async () => {
    try {
      const [salonRes, servicesRes] = await Promise.all([
        fetch(`${API}/salon`),
        fetch(`${API}/services`)
      ]);
      
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalon(salonData);
      }
      
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
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

  const generateWhatsAppMessage = () => {
    const dateStr = formData.date ? format(formData.date, "dd MMM yyyy") : "Not selected";
    const message = `Hi! I'd like to book an appointment at Glow Beauty Studio.

Name: ${formData.name || "Not provided"}
Service: ${formData.service || "Not selected"}
Preferred Date: ${dateStr}
Preferred Time: ${formData.time || "Not selected"}
Area: ${formData.area}

Please confirm availability. Thank you!`;
    
    return encodeURIComponent(message);
  };

  const whatsappUrl = salon 
    ? `https://wa.me/${salon.whatsappNumber}?text=${generateWhatsAppMessage()}`
    : "#";

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
            Fill in your details below and we'll confirm your booking via WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl text-[#4A403A]">Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
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

                {/* Service Selection */}
                <div className="space-y-2">
                  <Label className="text-[#4A403A]">Select Service</Label>
                  <Select 
                    value={formData.service} 
                    onValueChange={(value) => setFormData({ ...formData, service: value })}
                  >
                    <SelectTrigger 
                      className="rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] focus:ring-[#D69E8E]/20"
                      data-testid="book-service-select"
                    >
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name} - ₹{service.priceStartingAt}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectValue placeholder="Select time slot" />
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

                {/* Book Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20BD5C] text-white py-4 rounded-full font-medium text-lg shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  data-testid="book-whatsapp-btn"
                >
                  <MessageCircle className="w-6 h-6" />
                  Book via WhatsApp
                </a>

                <p className="text-center text-sm text-[#8C7B75]">
                  You'll be redirected to WhatsApp with your booking details
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Salon Info Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="bg-[#FDF8F5] border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A403A]">Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {salon && (
                  <>
                    <a
                      href={`tel:${salon.phone}`}
                      className="flex items-center gap-3 text-[#4A403A] hover:text-[#D69E8E]"
                      data-testid="sidebar-phone"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#D69E8E]/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-[#D69E8E]" />
                      </div>
                      <span>{salon.phone}</span>
                    </a>
                    
                    <a
                      href={salon.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 text-[#4A403A] hover:text-[#D69E8E]"
                      data-testid="sidebar-address"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#D69E8E]/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-[#D69E8E]" />
                      </div>
                      <span className="text-sm">{salon.address}</span>
                    </a>
                    
                    <div className="flex items-start gap-3 text-[#4A403A]">
                      <div className="w-10 h-10 rounded-full bg-[#D69E8E]/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-[#D69E8E]" />
                      </div>
                      <span className="text-sm">{salon.openingHours}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-white border-[#E6D5D0] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A403A]">Booking Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-[#8C7B75]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D69E8E]">•</span>
                    <span>Book at least 1 day in advance for regular services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D69E8E]">•</span>
                    <span>Bridal packages require 2-week advance booking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D69E8E]">•</span>
                    <span>Arrive 10 minutes early for your appointment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D69E8E]">•</span>
                    <span>Cancellations accepted up to 2 hours before</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

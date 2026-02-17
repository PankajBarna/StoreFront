import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  LogOut, Calendar, Clock, User, Phone, FileText, Check, X, RotateCcw,
  ChevronLeft, ChevronRight, AlertCircle, Sparkles, RefreshCw, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  pending: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  confirmed: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  completed: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  no_show: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" }
};

const CALENDAR_EVENT_COLORS = {
  pending: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", textColor: "#92400E" },
  confirmed: { backgroundColor: "#D1FAE5", borderColor: "#10B981", textColor: "#065F46" },
  cancelled: { backgroundColor: "#FEE2E2", borderColor: "#EF4444", textColor: "#991B1B" },
  completed: { backgroundColor: "#DBEAFE", borderColor: "#3B82F6", textColor: "#1E40AF" },
  no_show: { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
};

export default function SalonDashboardPage() {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem("salon_token") || "");
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  
  // Data
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [salon, setSalon] = useState(null);
  const [features, setFeatures] = useState({ booking_calendar_enabled: false });
  
  // UI State
  const [calendarView, setCalendarView] = useState("timeGridWeek");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ newStartTime: "", reason: "" });
  const [calendarRef, setCalendarRef] = useState(null);
  const [currentDateRange, setCurrentDateRange] = useState({ start: null, end: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  
  // Tooltip state for hover
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, booking: null });
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/salon/login");
      return;
    }
    verifyAndFetchData();
  }, [token]);

  const verifyAndFetchData = async () => {
    try {
      // Verify token
      const authRes = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!authRes.ok) {
        handleLogout();
        return;
      }
      
      // Fetch initial data
      await Promise.all([
        fetchSalonData(),
        fetchServices(),
        fetchStaff(),
        fetchFeatures()
      ]);
      
      // Set initial date range
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      setCurrentDateRange({ start: weekStart, end: weekEnd });
      
    } catch (e) {
      console.error("Error verifying token:", e);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchSalonData = async () => {
    try {
      const res = await fetch(`${API}/salon`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
      }
    } catch (e) {
      console.error("Error fetching salon:", e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API}/services?active_only=false`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (e) {
      console.error("Error fetching services:", e);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (e) {
      console.error("Error fetching staff:", e);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await fetch(`${API}/features`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch (e) {
      console.error("Error fetching features:", e);
    }
  };

  const fetchBookings = useCallback(async (start, end) => {
    if (!start || !end) return;
    
    setBookingsLoading(true);
    try {
      const fromDate = format(start, "yyyy-MM-dd'T'00:00:00");
      const toDate = format(addDays(end, 1), "yyyy-MM-dd'T'00:00:00");
      
      const res = await fetch(
        `${API}/salon/bookings?from_date=${fromDate}&to_date=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else if (res.status === 403) {
        toast.error("Booking calendar is disabled");
        setBookings([]);
      }
    } catch (e) {
      console.error("Error fetching bookings:", e);
    } finally {
      setBookingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (currentDateRange.start && currentDateRange.end) {
      fetchBookings(currentDateRange.start, currentDateRange.end);
    }
  }, [currentDateRange, fetchBookings]);

  const handleLogout = () => {
    localStorage.removeItem("salon_token");
    localStorage.removeItem("salon_role");
    navigate("/salon/login");
    toast.success("Logged out successfully");
  };

  const handleDateRangeChange = (info) => {
    setCurrentDateRange({ start: info.start, end: info.end });
  };

  const handleEventClick = (info) => {
    const booking = bookings.find(b => b.id === info.event.id);
    if (booking) {
      setSelectedBooking(booking);
      setBookingDetailOpen(true);
    }
  };

  const handleEventDrop = async (info) => {
    const booking = bookings.find(b => b.id === info.event.id);
    if (!booking) return;
    
    const newStart = info.event.start;
    
    // Open reschedule dialog with pre-filled data
    setSelectedBooking(booking);
    setRescheduleData({
      newStartTime: format(newStart, "yyyy-MM-dd'T'HH:mm"),
      reason: "Rescheduled via drag & drop"
    });
    setRescheduleOpen(true);
    
    // Revert the event until confirmed
    info.revert();
  };

  const updateBookingStatus = async (bookingId, status, staffId = null) => {
    try {
      const bodyData = { status };
      if (staffId) bodyData.staffId = staffId;
      
      const res = await fetch(`${API}/salon/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Booking ${status}${staffId ? ' and assigned to staff' : ''}`);
        fetchBookings(currentDateRange.start, currentDateRange.end);
        setBookingDetailOpen(false);
        setSelectedStaffId("");
        
        // Open WhatsApp notification if available (for confirmed or cancelled)
        if (data.whatsappNotificationUrl && (status === "confirmed" || status === "cancelled")) {
          const shouldNotify = window.confirm(
            `Would you like to notify the client via WhatsApp about the ${status} booking?`
          );
          if (shouldNotify) {
            window.open(data.whatsappNotificationUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to update booking");
      }
    } catch (e) {
      toast.error("Error updating booking");
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !rescheduleData.newStartTime || !rescheduleData.reason) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      const res = await fetch(`${API}/salon/bookings/${selectedBooking.id}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newStartTime: new Date(rescheduleData.newStartTime).toISOString(),
          reason: rescheduleData.reason
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success("Booking rescheduled successfully");
        fetchBookings(currentDateRange.start, currentDateRange.end);
        setRescheduleOpen(false);
        setBookingDetailOpen(false);
        setRescheduleData({ newStartTime: "", reason: "" });
        
        // Open WhatsApp notification for reschedule
        if (data.whatsappNotificationUrl) {
          const shouldNotify = window.confirm(
            "Would you like to notify the client via WhatsApp about the rescheduled booking?"
          );
          if (shouldNotify) {
            window.open(data.whatsappNotificationUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to reschedule booking");
      }
    } catch (e) {
      toast.error("Error rescheduling booking");
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || "Unknown Service";
  };

  // Hover handlers for tooltips
  const handleEventMouseEnter = (info) => {
    const booking = info.event.extendedProps.booking;
    const rect = info.el.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      booking
    });
  };

  const handleEventMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, booking: null });
  };

  // Convert bookings to calendar events
  const calendarEvents = bookings.map(booking => ({
    id: booking.id,
    title: `${booking.clientName} - ${booking.serviceName || getServiceName(booking.serviceId)}`,
    start: booking.startTime,
    end: booking.endTime,
    ...CALENDAR_EVENT_COLORS[booking.status] || CALENDAR_EVENT_COLORS.pending,
    extendedProps: { booking }
  }));

  // Filter bookings for list view
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      booking.clientName?.toLowerCase().includes(term) ||
      booking.clientPhone?.includes(term) ||
      booking.serviceName?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCFA]">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#D69E8E] mx-auto animate-pulse" />
          <p className="mt-4 text-[#8C7B75]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Feature disabled state
  if (!features.booking_calendar_enabled) {
    return (
      <div className="min-h-screen bg-[#FFFCFA]">
        <DashboardHeader salon={salon} onLogout={handleLogout} />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-[#4A403A] mb-2">Booking Calendar Disabled</h2>
            <p className="text-[#8C7B75] mb-6">
              The booking calendar feature is currently disabled by the admin.
              Clients are using WhatsApp for booking requests.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              Go to Website
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCFA]" data-testid="salon-dashboard">
      <DashboardHeader salon={salon} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today", value: bookings.filter(b => {
              const d = new Date(b.startTime);
              const today = new Date();
              return d.toDateString() === today.toDateString() && b.status !== "cancelled";
            }).length, color: "bg-[#D69E8E]" },
            { label: "Pending", value: bookings.filter(b => b.status === "pending").length, color: "bg-amber-500" },
            { label: "Confirmed", value: bookings.filter(b => b.status === "confirmed").length, color: "bg-emerald-500" },
            { label: "Completed", value: bookings.filter(b => b.status === "completed").length, color: "bg-blue-500" }
          ].map((stat, i) => (
            <Card key={i} className="border-[#E6D5D0] rounded-xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-[#4A403A]">{stat.value}</p>
                  <p className="text-sm text-[#8C7B75]">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content - Tabs */}
        <Tabs defaultValue="calendar" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="bg-[#F2E8E4]">
              <TabsTrigger value="calendar" className="data-[state=active]:bg-white">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-white">
                <FileText className="w-4 h-4 mr-2" />
                List View
              </TabsTrigger>
            </TabsList>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBookings(currentDateRange.start, currentDateRange.end)}
              className="rounded-full"
              data-testid="refresh-bookings-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${bookingsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card className="border-[#E6D5D0] rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="salon-calendar p-4">
                  <FullCalendar
                    ref={setCalendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={calendarView}
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay"
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventMouseEnter={handleEventMouseEnter}
                    eventMouseLeave={handleEventMouseLeave}
                    editable={true}
                    droppable={true}
                    datesSet={handleDateRangeChange}
                    slotMinTime="08:00:00"
                    slotMaxTime="22:00:00"
                    height="auto"
                    aspectRatio={1.8}
                    eventTimeFormat={{
                      hour: "numeric",
                      minute: "2-digit",
                      meridiem: "short"
                    }}
                    slotLabelFormat={{
                      hour: "numeric",
                      minute: "2-digit",
                      meridiem: "short"
                    }}
                    nowIndicator={true}
                    allDaySlot={false}
                    slotEventOverlap={false}
                    businessHours={{
                      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
                      startTime: salon?.workingHoursJson?.[0]?.open || "10:00",
                      endTime: salon?.workingHoursJson?.[0]?.close || "20:00"
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <span className="text-[#8C7B75]">Status:</span>
              {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border`} />
                  <span className="capitalize text-[#4A403A]">{status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <Card className="border-[#E6D5D0] rounded-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-lg text-[#4A403A]">
                    Bookings ({filteredBookings.length})
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7B75]" />
                    <Input
                      placeholder="Search client or service..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-[#E6D5D0]"
                      data-testid="booking-search-input"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-[#8C7B75]">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => { setSelectedBooking(booking); setBookingDetailOpen(true); }}
                        className="flex items-center justify-between p-4 rounded-xl bg-[#FDF8F5] hover:bg-[#F2E8E4] cursor-pointer transition-colors"
                        data-testid={`booking-row-${booking.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <User className="w-5 h-5 text-[#D69E8E]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#4A403A]">{booking.clientName}</p>
                            <p className="text-sm text-[#8C7B75]">
                              {booking.serviceName || getServiceName(booking.serviceId)}
                            </p>
                            {booking.staffName && (
                              <p className="text-xs text-[#9D5C63] font-medium mt-0.5">
                                Staff: {booking.staffName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#4A403A]">
                            {format(parseISO(booking.startTime), "MMM d, h:mm a")}
                          </p>
                          <Badge className={`${STATUS_COLORS[booking.status]?.bg} ${STATUS_COLORS[booking.status]?.text} border-0 capitalize`}>
                            {booking.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Booking Detail Dialog */}
      <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A403A]">Booking Details</DialogTitle>
            <DialogDescription className="sr-only">View and manage booking details</DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${STATUS_COLORS[selectedBooking.status]?.bg} ${STATUS_COLORS[selectedBooking.status]?.text} border-0 capitalize px-3 py-1`}>
                  {selectedBooking.status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-[#8C7B75]">ID: {selectedBooking.id.slice(0, 8)}...</span>
              </div>
              
              {/* Client Info */}
              <div className="bg-[#FDF8F5] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#D69E8E]" />
                  <div>
                    <p className="text-sm text-[#8C7B75]">Client</p>
                    <p className="font-medium text-[#4A403A]">{selectedBooking.clientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#D69E8E]" />
                  <div>
                    <p className="text-sm text-[#8C7B75]">Phone</p>
                    <a href={`tel:${selectedBooking.clientPhone}`} className="font-medium text-[#4A403A] hover:text-[#D69E8E]">
                      {selectedBooking.clientPhone}
                    </a>
                  </div>
                </div>
              </div>
              
              {/* Service Info */}
              <div className="bg-[#FDF8F5] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#D69E8E]" />
                  <div>
                    <p className="text-sm text-[#8C7B75]">Service</p>
                    <p className="font-medium text-[#4A403A]">
                      {selectedBooking.serviceName || getServiceName(selectedBooking.serviceId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#D69E8E]" />
                  <div>
                    <p className="text-sm text-[#8C7B75]">Date & Time</p>
                    <p className="font-medium text-[#4A403A]">
                      {format(parseISO(selectedBooking.startTime), "EEEE, MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-[#8C7B75]">
                      {format(parseISO(selectedBooking.startTime), "h:mm a")} - {format(parseISO(selectedBooking.endTime), "h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Staff Assignment */}
              <div className="bg-[#FDF8F5] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-[#9D5C63]" />
                    <div>
                      <p className="text-sm text-[#8C7B75]">Assigned Staff</p>
                      {selectedBooking.staffName ? (
                        <p className="font-medium text-[#4A403A]">{selectedBooking.staffName}</p>
                      ) : (
                        <p className="text-sm text-amber-600">Not assigned</p>
                      )}
                    </div>
                  </div>
                  {["pending", "confirmed"].includes(selectedBooking.status) && (
                    <Select
                      value={selectedStaffId || selectedBooking.staffId || "none"}
                      onValueChange={(val) => setSelectedStaffId(val === "none" ? "" : val)}
                    >
                      <SelectTrigger className="w-36 h-9 rounded-lg border-[#E6D5D0] text-sm">
                        <SelectValue placeholder="Assign staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              {/* Notes */}
              {selectedBooking.notes && (
                <div className="bg-[#FDF8F5] rounded-xl p-4">
                  <p className="text-sm text-[#8C7B75] mb-1">Notes</p>
                  <p className="text-[#4A403A]">{selectedBooking.notes}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {selectedBooking.status === "pending" && (
                  <>
                    <Button
                      onClick={() => updateBookingStatus(selectedBooking.id, "confirmed", selectedStaffId || null)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                      data-testid="confirm-booking-btn"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      onClick={() => updateBookingStatus(selectedBooking.id, "cancelled")}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                      data-testid="cancel-booking-btn"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
                
                {selectedBooking.status === "confirmed" && (
                  <>
                    {/* Show Update Staff button only if staff selection changed */}
                    {selectedStaffId && selectedStaffId !== selectedBooking.staffId && (
                      <Button
                        onClick={() => updateBookingStatus(selectedBooking.id, "confirmed", selectedStaffId)}
                        className="col-span-2 bg-[#9D5C63] hover:bg-[#8D4C53] text-white rounded-xl"
                        data-testid="update-staff-btn"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Update Staff Assignment
                      </Button>
                    )}
                    <Button
                      onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                    <Button
                      onClick={() => updateBookingStatus(selectedBooking.id, "no_show")}
                      variant="outline"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
                    >
                      No Show
                    </Button>
                    <Button
                      onClick={() => updateBookingStatus(selectedBooking.id, "cancelled")}
                      variant="outline"
                      className="col-span-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                      data-testid="cancel-confirmed-btn"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel Booking
                    </Button>
                  </>
                )}
                
                {["pending", "confirmed"].includes(selectedBooking.status) && (
                  <Button
                    onClick={() => {
                      setRescheduleData({
                        newStartTime: format(parseISO(selectedBooking.startTime), "yyyy-MM-dd'T'HH:mm"),
                        reason: ""
                      });
                      setRescheduleOpen(true);
                    }}
                    variant="outline"
                    className="col-span-2 rounded-xl"
                    data-testid="reschedule-booking-btn"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A403A]">Reschedule Booking</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Date & Time</Label>
              <Input
                type="datetime-local"
                value={rescheduleData.newStartTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, newStartTime: e.target.value })}
                className="rounded-xl border-[#E6D5D0]"
                data-testid="reschedule-datetime-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Reschedule</Label>
              <Textarea
                placeholder="Enter reason for rescheduling..."
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                className="rounded-xl border-[#E6D5D0]"
                data-testid="reschedule-reason-input"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-xl"
              data-testid="confirm-reschedule-btn"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Styles */}
      <style>{`
        .salon-calendar .fc {
          font-family: 'Manrope', sans-serif;
        }
        .salon-calendar .fc-toolbar-title {
          font-size: 1.25rem !important;
          color: #4A403A;
        }
        .salon-calendar .fc-button {
          background-color: #FDF8F5 !important;
          border-color: #E6D5D0 !important;
          color: #4A403A !important;
          border-radius: 0.75rem !important;
          padding: 0.5rem 1rem !important;
          font-weight: 500 !important;
        }
        .salon-calendar .fc-button:hover {
          background-color: #F2E8E4 !important;
        }
        .salon-calendar .fc-button-active {
          background-color: #D69E8E !important;
          color: white !important;
          border-color: #D69E8E !important;
        }
        .salon-calendar .fc-daygrid-day-number,
        .salon-calendar .fc-col-header-cell-cushion {
          color: #4A403A;
        }
        .salon-calendar .fc-event {
          border-radius: 0.5rem !important;
          padding: 2px 6px !important;
          font-size: 0.75rem !important;
          cursor: pointer;
        }
        .salon-calendar .fc-timegrid-slot {
          height: 3rem !important;
        }
        .salon-calendar .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: #8C7B75;
        }
        .salon-calendar .fc-day-today {
          background-color: rgba(214, 158, 142, 0.1) !important;
        }
        .salon-calendar .fc-now-indicator-line {
          border-color: #D69E8E !important;
        }
        .salon-calendar .fc-now-indicator-arrow {
          border-color: #D69E8E !important;
          border-top-color: transparent !important;
          border-bottom-color: transparent !important;
        }
        .booking-tooltip {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          transform: translate(-50%, -100%);
        }
      `}</style>

      {/* Hover Tooltip */}
      {tooltip.visible && tooltip.booking && (
        <div
          ref={tooltipRef}
          className="booking-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E6D5D0] p-4 min-w-[250px] max-w-[300px]">
            <div className="flex items-center justify-between mb-3">
              <Badge className={`${STATUS_COLORS[tooltip.booking.status]?.bg} ${STATUS_COLORS[tooltip.booking.status]?.text} border-0 capitalize text-xs`}>
                {tooltip.booking.status?.replace("_", " ")}
              </Badge>
              <span className="text-xs text-[#8C7B75]">
                {format(parseISO(tooltip.booking.startTime), "h:mm a")} - {format(parseISO(tooltip.booking.endTime), "h:mm a")}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#D69E8E]" />
                <span className="font-medium text-[#4A403A]">{tooltip.booking.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D69E8E]" />
                <span className="text-sm text-[#8C7B75]">{tooltip.booking.clientPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D69E8E]" />
                <span className="text-sm text-[#8C7B75]">{tooltip.booking.serviceName || getServiceName(tooltip.booking.serviceId)}</span>
              </div>
              {tooltip.booking.staffName && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#9D5C63]" />
                  <span className="text-sm text-[#9D5C63] font-medium">Staff: {tooltip.booking.staffName}</span>
                </div>
              )}
              {tooltip.booking.notes && (
                <div className="flex items-start gap-2 pt-2 border-t border-[#E6D5D0]">
                  <FileText className="w-4 h-4 text-[#D69E8E] mt-0.5" />
                  <span className="text-xs text-[#8C7B75]">{tooltip.booking.notes}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[#8C7B75] mt-3 text-center">Click for more options</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Dashboard Header Component
function DashboardHeader({ salon, onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E6D5D0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D69E8E] to-[#9D5C63] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-[#4A403A]">Salon Dashboard</h1>
                <p className="text-xs text-[#8C7B75]">{salon?.name || "Salon"}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              className="text-sm text-[#8C7B75] hover:text-[#D69E8E] hidden sm:inline"
            >
              View Website
            </a>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="rounded-full border-[#E6D5D0]"
              data-testid="salon-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

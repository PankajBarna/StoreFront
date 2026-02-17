import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LogOut, Settings, Calendar, Shield, Sparkles, AlertTriangle,
  ToggleLeft, ToggleRight, ArrowLeft, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PlatformFeaturesPage() {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem("salon_token") || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [features, setFeatures] = useState({ booking_calendar_enabled: false });
  const [originalFeatures, setOriginalFeatures] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/salon/login");
      return;
    }
    verifyAndFetchData();
  }, [token]);

  const verifyAndFetchData = async () => {
    try {
      // Verify token and check role
      const authRes = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!authRes.ok) {
        handleLogout();
        return;
      }
      
      const userData = await authRes.json();
      setUser(userData);
      
      // Check if user is platform admin
      if (userData.role !== "platform_admin") {
        toast.error("Access denied. Platform admin only.");
        navigate("/salon/dashboard");
        return;
      }
      
      // Fetch feature flags
      await fetchFeatures();
      
    } catch (e) {
      console.error("Error verifying token:", e);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await fetch(`${API}/admin/features`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
        setOriginalFeatures(data);
      } else {
        toast.error("Failed to load feature settings");
      }
    } catch (e) {
      console.error("Error fetching features:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("salon_token");
    localStorage.removeItem("salon_role");
    navigate("/salon/login");
    toast.success("Logged out successfully");
  };

  const handleToggleFeature = async (featureName, enabled) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [featureName]: enabled })
      });
      
      if (res.ok) {
        const updatedFeatures = await res.json();
        setFeatures(updatedFeatures);
        setOriginalFeatures(updatedFeatures);
        toast.success(`Feature ${enabled ? "enabled" : "disabled"} successfully`);
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to update feature");
      }
    } catch (e) {
      toast.error("Error updating feature");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCFA]">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#D69E8E] mx-auto animate-pulse" />
          <p className="mt-4 text-[#8C7B75]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCFA] to-[#FDF8F5]" data-testid="platform-features-page">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-[#E6D5D0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/salon/dashboard")}
                className="text-[#8C7B75]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 border-0">
                  <Shield className="w-3 h-3 mr-1" />
                  Platform Admin
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-full border-[#E6D5D0]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#4A403A]">Platform Settings</h1>
              <p className="text-[#8C7B75]">Manage global feature toggles</p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-6">
          {/* Booking Calendar Feature */}
          <Card className="border-[#E6D5D0] rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#FDF8F5] to-white pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D69E8E]/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#D69E8E]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-[#4A403A]">Booking Calendar</CardTitle>
                    <CardDescription>Enable online appointment booking system</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={features.booking_calendar_enabled 
                    ? "bg-emerald-100 text-emerald-800 border-0" 
                    : "bg-gray-100 text-gray-600 border-0"
                  }>
                    {features.booking_calendar_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Toggle Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#FDF8F5]">
                  <div className="flex items-center gap-4">
                    {features.booking_calendar_enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <Label htmlFor="booking-toggle" className="text-base font-medium text-[#4A403A]">
                        {features.booking_calendar_enabled ? "Calendar is Active" : "Calendar is Inactive"}
                      </Label>
                      <p className="text-sm text-[#8C7B75]">
                        {features.booking_calendar_enabled 
                          ? "Clients can book appointments online" 
                          : "Clients use WhatsApp for booking requests"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="booking-toggle"
                    checked={features.booking_calendar_enabled}
                    onCheckedChange={(checked) => handleToggleFeature("booking_calendar_enabled", checked)}
                    disabled={saving}
                    data-testid="booking-calendar-toggle"
                  />
                </div>

                {/* Feature Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      When Enabled
                    </h4>
                    <ul className="text-sm text-emerald-700 space-y-1.5">
                      <li>• Clients see available time slots</li>
                      <li>• Online booking with instant confirmation</li>
                      <li>• Salon dashboard shows calendar view</li>
                      <li>• Automatic conflict detection</li>
                      <li>• Reschedule & cancellation management</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      When Disabled
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1.5">
                      <li>• "Book via WhatsApp" button shown</li>
                      <li>• No availability checking</li>
                      <li>• Manual booking management</li>
                      <li>• Salon dashboard shows disabled message</li>
                      <li>• Booking APIs return 403 error</li>
                    </ul>
                  </div>
                </div>

                {/* Warning Alert */}
                {features.booking_calendar_enabled && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Important</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Disabling this feature will prevent new bookings. Existing bookings will remain in the system
                      but clients won't be able to create new appointments through the website.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {features.updated_at && (
            <Card className="border-[#E6D5D0] rounded-2xl">
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm text-[#8C7B75]">
                  <span>Last updated: {new Date(features.updated_at).toLocaleString()}</span>
                  {features.updated_by && <span>By: {features.updated_by}</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Future Features Placeholder */}
          <Card className="border-dashed border-2 border-[#E6D5D0] rounded-2xl bg-transparent">
            <CardContent className="py-8 text-center">
              <Settings className="w-8 h-8 text-[#E6D5D0] mx-auto mb-3" />
              <p className="text-[#8C7B75]">More platform features coming soon</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SalonLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Check if user has salon access
        if (!["salon_owner", "salon_admin", "platform_admin"].includes(data.role)) {
          toast.error("You don't have access to the salon dashboard");
          return;
        }
        
        localStorage.setItem("salon_token", data.access_token);
        localStorage.setItem("salon_role", data.role);
        toast.success("Login successful!");
        navigate("/salon/dashboard");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Invalid email or password");
      }
    } catch (e) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFCFA] to-[#FDF8F5] px-4" data-testid="salon-login-page">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-32 h-32 border border-[#E6D5D0] rounded-full opacity-50" />
      <div className="absolute bottom-20 right-10 w-48 h-48 border border-[#E6D5D0] rounded-full opacity-30" />
      
      <Card className="w-full max-w-md border-[#E6D5D0] rounded-3xl shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D69E8E] to-[#9D5C63] flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#4A403A]">Salon Dashboard</CardTitle>
          <p className="text-sm text-[#8C7B75] mt-2">Sign in to manage your bookings</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4A403A] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="salon@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] h-12"
                data-testid="salon-email-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#4A403A] font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="rounded-xl border-[#E6D5D0] focus:border-[#D69E8E] pr-10 h-12"
                  data-testid="salon-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B75] hover:text-[#4A403A]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#D69E8E] to-[#9D5C63] hover:from-[#C0806E] hover:to-[#8C4B52] text-white rounded-full py-6 font-medium text-base shadow-lg"
              data-testid="salon-login-btn"
            >
              {loading ? (
                <Sparkles className="w-5 h-5 animate-pulse" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-[#E6D5D0] text-center">
            <p className="text-sm text-[#8C7B75]">
              Need help? Contact your platform administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

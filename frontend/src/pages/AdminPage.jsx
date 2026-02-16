import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  LogIn, LogOut, Eye, EyeOff, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  Sparkles, Menu, X, Home, Scissors, Image, Star, Gift, Settings, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [activeTab, setActiveTab] = useState("salon");
  
  // Data states
  const [salon, setSalon] = useState(null);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [offers, setOffers] = useState([]);
  
  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false, type: "", data: null });
  
  // Search state
  const [serviceSearch, setServiceSearch] = useState("");

  // Auto logout when navigating away from /admin
  useEffect(() => {
    return () => {
      // Cleanup: logout when component unmounts (user leaves /admin)
      localStorage.removeItem("admin_token");
    };
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const verifyToken = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("admin_token");
        setToken("");
      }
    } catch (e) {
      console.error("Token verification failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem("admin_token", data.access_token);
        setIsAuthenticated(true);
        toast.success("Login successful!");
      } else {
        toast.error("Invalid email or password");
      }
    } catch (e) {
      toast.error("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  };

  const fetchAllData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [salonRes, catRes, svcRes, galRes, revRes, offRes] = await Promise.all([
        fetch(`${API}/salon`),
        fetch(`${API}/categories`),
        fetch(`${API}/services?active_only=false`),
        fetch(`${API}/gallery`),
        fetch(`${API}/reviews`),
        fetch(`${API}/offers?active_only=false`)
      ]);
      
      if (salonRes.ok) setSalon(await salonRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
      if (galRes.ok) setGallery(await galRes.json());
      if (revRes.ok) setReviews(await revRes.json());
      if (offRes.ok) setOffers(await offRes.json());
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  const apiCall = async (endpoint, method = "GET", body = null) => {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API}${endpoint}`, options);
    if (!res.ok) throw new Error("API call failed");
    return res.json();
  };

  // CRUD Operations
  const handleSaveSalon = async (data) => {
    try {
      await apiCall("/admin/salon", "PUT", data);
      toast.success("Salon profile updated!");
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to update salon profile");
    }
  };

  const handleSaveCategory = async (data) => {
    try {
      if (editDialog.data?.id) {
        await apiCall(`/admin/categories/${editDialog.data.id}`, "PUT", data);
        toast.success("Category updated!");
      } else {
        await apiCall("/admin/categories", "POST", data);
        toast.success("Category created!");
      }
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to save category");
    }
  };

  const handleSaveService = async (data) => {
    try {
      if (editDialog.data?.id) {
        await apiCall(`/admin/services/${editDialog.data.id}`, "PUT", data);
        toast.success("Service updated!");
      } else {
        await apiCall("/admin/services", "POST", data);
        toast.success("Service created!");
      }
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to save service");
    }
  };

  const handleToggleService = async (id) => {
    try {
      await apiCall(`/admin/services/${id}/toggle`, "PATCH");
      toast.success("Service status updated!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to toggle service");
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await apiCall(`/admin/services/${id}`, "DELETE");
      toast.success("Service deleted!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to delete service");
    }
  };

  const handleSaveGallery = async (data) => {
    try {
      if (editDialog.data?.id) {
        await apiCall(`/admin/gallery/${editDialog.data.id}`, "PUT", data);
        toast.success("Image updated!");
      } else {
        await apiCall("/admin/gallery", "POST", data);
        toast.success("Image added!");
      }
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to save image");
    }
  };

  const handleDeleteGallery = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await apiCall(`/admin/gallery/${id}`, "DELETE");
      toast.success("Image deleted!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to delete image");
    }
  };

  const handleSaveReview = async (data) => {
    try {
      if (editDialog.data?.id) {
        await apiCall(`/admin/reviews/${editDialog.data.id}`, "PUT", data);
        toast.success("Review updated!");
      } else {
        await apiCall("/admin/reviews", "POST", data);
        toast.success("Review added!");
      }
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to save review");
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await apiCall(`/admin/reviews/${id}`, "DELETE");
      toast.success("Review deleted!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to delete review");
    }
  };

  const handleSaveOffer = async (data) => {
    try {
      if (editDialog.data?.id) {
        await apiCall(`/admin/offers/${editDialog.data.id}`, "PUT", data);
        toast.success("Offer updated!");
      } else {
        await apiCall("/admin/offers", "POST", data);
        toast.success("Offer created!");
      }
      fetchAllData();
      setEditDialog({ open: false, type: "", data: null });
    } catch (e) {
      toast.error("Failed to save offer");
    }
  };

  const handleToggleOffer = async (id) => {
    try {
      await apiCall(`/admin/offers/${id}/toggle`, "PATCH");
      toast.success("Offer status updated!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to toggle offer");
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await apiCall(`/admin/offers/${id}`, "DELETE");
      toast.success("Offer deleted!");
      fetchAllData();
    } catch (e) {
      toast.error("Failed to delete offer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCFA]">
        <Sparkles className="w-12 h-12 text-[#D69E8E] animate-pulse" />
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCFA] px-4" data-testid="admin-login-page">
        <Card className="w-full max-w-md border-[#E6D5D0] rounded-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-[#D69E8E]" />
            </div>
            <CardTitle className="text-2xl text-[#4A403A]">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#4A403A]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@glowbeauty.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="rounded-xl border-[#E6D5D0]"
                  data-testid="admin-email-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#4A403A]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="rounded-xl border-[#E6D5D0] pr-10"
                    data-testid="admin-password-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B75]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#D69E8E] hover:bg-[#C0806E] text-white rounded-full py-3"
                data-testid="admin-login-btn"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "salon", label: "Salon", icon: Home },
    { id: "services", label: "Services", icon: Scissors },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "offers", label: "Offers", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-[#FFFCFA]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E6D5D0]">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D69E8E]" />
              <span className="font-semibold text-[#4A403A]">Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              className="text-sm text-[#8C7B75] hover:text-[#D69E8E]"
            >
              View Site
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-full border-[#E6D5D0]"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block w-64 min-h-[calc(100vh-64px)] bg-white border-r border-[#E6D5D0] fixed lg:sticky top-16 z-30`}>
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#D69E8E] text-white"
                    : "text-[#4A403A] hover:bg-[#FDF8F5]"
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Salon Tab */}
          {activeTab === "salon" && salon && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#4A403A]">Salon Profile</h2>
                <Button
                  onClick={() => setEditDialog({ open: true, type: "salon", data: salon })}
                  className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-full"
                  data-testid="edit-salon-btn"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              <Card className="border-[#E6D5D0] rounded-2xl">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[#8C7B75]">Name</p>
                    <p className="font-medium text-[#4A403A]">{salon.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8C7B75]">Area</p>
                    <p className="font-medium text-[#4A403A]">{salon.area}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-[#8C7B75]">Address</p>
                    <p className="font-medium text-[#4A403A]">{salon.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8C7B75]">Phone</p>
                    <p className="font-medium text-[#4A403A]">{salon.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8C7B75]">WhatsApp</p>
                    <p className="font-medium text-[#4A403A]">{salon.whatsappNumber}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-[#8C7B75]">Opening Hours</p>
                    <p className="font-medium text-[#4A403A]">{salon.openingHours}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#4A403A]">Services</h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Search Box */}
                  <div className="relative flex-1 sm:flex-none sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7B75]" />
                    <Input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-10 rounded-xl border-[#E6D5D0] focus:border-[#D69E8E]"
                      data-testid="service-search-input"
                    />
                  </div>
                  <Button
                    onClick={() => setEditDialog({ open: true, type: "service", data: null })}
                    className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-full whitespace-nowrap"
                    data-testid="add-service-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </div>
              <Card className="border-[#E6D5D0] rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FDF8F5]">
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services
                      .filter(service => 
                        service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                        categories.find(c => c.id === service.categoryId)?.name.toLowerCase().includes(serviceSearch.toLowerCase())
                      )
                      .map((service) => (
                      <TableRow key={service.id} data-testid={`service-row-${service.id}`}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          {categories.find(c => c.id === service.categoryId)?.name || "-"}
                        </TableCell>
                        <TableCell>₹{service.priceStartingAt}+</TableCell>
                        <TableCell>{service.durationMins} mins</TableCell>
                        <TableCell>
                          <Switch
                            checked={service.active}
                            onCheckedChange={() => handleToggleService(service.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditDialog({ open: true, type: "service", data: service })}
                              className="rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteService(service.id)}
                              className="rounded-lg text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#4A403A]">Gallery</h2>
                <Button
                  onClick={() => setEditDialog({ open: true, type: "gallery", data: null })}
                  className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-full"
                  data-testid="add-gallery-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((image) => (
                  <Card key={image.id} className="border-[#E6D5D0] rounded-2xl overflow-hidden" data-testid={`gallery-admin-${image.id}`}>
                    <div className="aspect-square">
                      <img src={image.imageUrl} alt={image.caption} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium truncate">{image.caption || "No caption"}</p>
                      <p className="text-xs text-[#8C7B75] capitalize">{image.tag}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, type: "gallery", data: image })}
                          className="flex-1 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteGallery(image.id)}
                          className="flex-1 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#4A403A]">Reviews</h2>
                <Button
                  onClick={() => setEditDialog({ open: true, type: "review", data: null })}
                  className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-full"
                  data-testid="add-review-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Review
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="border-[#E6D5D0] rounded-2xl" data-testid={`review-admin-${review.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-[#4A403A]">{review.name}</p>
                          <p className="text-sm text-[#8C7B75]">{review.source}</p>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-[#8C7B75] mb-4">"{review.text}"</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, type: "review", data: review })}
                          className="flex-1 rounded-lg"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteReview(review.id)}
                          className="flex-1 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Offers Tab */}
          {activeTab === "offers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#4A403A]">Offers</h2>
                <Button
                  onClick={() => setEditDialog({ open: true, type: "offer", data: null })}
                  className="bg-[#D69E8E] hover:bg-[#C0806E] rounded-full"
                  data-testid="add-offer-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Offer
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="border-[#E6D5D0] rounded-2xl" data-testid={`offer-admin-${offer.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-[#4A403A]">{offer.title}</h3>
                        <Switch
                          checked={offer.active}
                          onCheckedChange={() => handleToggleOffer(offer.id)}
                        />
                      </div>
                      <p className="text-sm text-[#8C7B75] mb-2">{offer.description}</p>
                      {offer.validTill && (
                        <p className="text-xs text-[#9D5C63]">Valid till: {offer.validTill}</p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, type: "offer", data: offer })}
                          className="flex-1 rounded-lg"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="flex-1 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Dialogs */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: "", data: null })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Salon Edit */}
          {editDialog.type === "salon" && (
            <SalonEditForm data={editDialog.data} onSave={handleSaveSalon} />
          )}
          
          {/* Service Edit */}
          {editDialog.type === "service" && (
            <ServiceEditForm 
              data={editDialog.data} 
              categories={categories} 
              onSave={handleSaveService}
              onCreateCategory={handleSaveCategory}
              refreshCategories={fetchAllData}
            />
          )}
          
          {/* Gallery Edit */}
          {editDialog.type === "gallery" && (
            <GalleryEditForm data={editDialog.data} onSave={handleSaveGallery} />
          )}
          
          {/* Review Edit */}
          {editDialog.type === "review" && (
            <ReviewEditForm data={editDialog.data} onSave={handleSaveReview} />
          )}
          
          {/* Offer Edit */}
          {editDialog.type === "offer" && (
            <OfferEditForm data={editDialog.data} onSave={handleSaveOffer} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form Components
function SalonEditForm({ data, onSave }) {
  const [form, setForm] = useState(data || {});
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Salon Profile</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Area</Label>
          <Input value={form.area || ""} onChange={(e) => setForm({ ...form, area: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp Number</Label>
          <Input value={form.whatsappNumber || ""} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Opening Hours</Label>
          <Input value={form.openingHours || ""} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Google Maps URL</Label>
          <Input value={form.googleMapsUrl || ""} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Instagram URL</Label>
          <Input value={form.instagramUrl || ""} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} className="bg-[#D69E8E] hover:bg-[#C0806E]">Save Changes</Button>
      </DialogFooter>
    </>
  );
}

function ServiceEditForm({ data, categories, onSave, onCreateCategory, refreshCategories }) {
  const [form, setForm] = useState(data || { active: true });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      await onCreateCategory({ name: newCategoryName.trim(), order: categories.length });
      await refreshCategories();
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success("Category created!");
    } catch (e) {
      toast.error("Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{data ? "Edit Service" : "Add Service"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="service-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          {!showNewCategory ? (
            <div className="flex gap-2">
              <Select value={form.categoryId || ""} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewCategory(true)}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input 
                placeholder="New category name" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1"
                data-testid="new-category-input"
              />
              <Button 
                type="button"
                size="sm"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="bg-[#D69E8E] hover:bg-[#C0806E] shrink-0"
              >
                {creatingCategory ? "..." : "Add"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price (Starting)</Label>
            <Input type="number" value={form.priceStartingAt || ""} onChange={(e) => setForm({ ...form, priceStartingAt: parseInt(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Duration (mins)</Label>
            <Input type="number" value={form.durationMins || ""} onChange={(e) => setForm({ ...form, durationMins: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} className="bg-[#D69E8E] hover:bg-[#C0806E]" data-testid="save-service-btn">Save Service</Button>
      </DialogFooter>
    </>
  );
}

function GalleryEditForm({ data, onSave }) {
  const [form, setForm] = useState(data || {});
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{data ? "Edit Image" : "Add Image"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} data-testid="gallery-url-input" />
        </div>
        <div className="space-y-2">
          <Label>Caption</Label>
          <Input value={form.caption || ""} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Tag</Label>
          <Select value={form.tag || "general"} onValueChange={(v) => setForm({ ...form, tag: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hair">Hair</SelectItem>
              <SelectItem value="facial">Facial</SelectItem>
              <SelectItem value="nails">Nails</SelectItem>
              <SelectItem value="bridal">Bridal</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Order</Label>
          <Input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} className="bg-[#D69E8E] hover:bg-[#C0806E]" data-testid="save-gallery-btn">Save Image</Button>
      </DialogFooter>
    </>
  );
}

function ReviewEditForm({ data, onSave }) {
  const [form, setForm] = useState(data || { rating: 5 });
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{data ? "Edit Review" : "Add Review"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="review-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Rating</Label>
          <Select value={String(form.rating || 5)} onValueChange={(v) => setForm({ ...form, rating: parseInt(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((r) => (
                <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Review Text</Label>
          <Textarea value={form.text || ""} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={form.source || "Google"} onValueChange={(v) => setForm({ ...form, source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Google">Google</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Avatar URL (optional)</Label>
          <Input value={form.avatarUrl || ""} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} className="bg-[#D69E8E] hover:bg-[#C0806E]" data-testid="save-review-btn">Save Review</Button>
      </DialogFooter>
    </>
  );
}

function OfferEditForm({ data, onSave }) {
  const [form, setForm] = useState(data || { active: true });
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{data ? "Edit Offer" : "Add Offer"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="offer-title-input" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Valid Till (optional)</Label>
          <Input type="date" value={form.validTill || ""} onChange={(e) => setForm({ ...form, validTill: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          <Label>Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} className="bg-[#D69E8E] hover:bg-[#C0806E]" data-testid="save-offer-btn">Save Offer</Button>
      </DialogFooter>
    </>
  );
}

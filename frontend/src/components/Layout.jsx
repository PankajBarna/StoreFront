import { Outlet, Link, useLocation } from "react-router-dom";
import { Phone, MapPin, Clock, Instagram, Facebook, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { MobileBottomBar } from "./MobileBottomBar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Layout = () => {
  const location = useLocation();
  const [salon, setSalon] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSalonData();
  }, []);

  const fetchSalonData = async () => {
    try {
      const res = await fetch(`${API}/salon`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
        // Update CSS variables based on salon colors
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        }
        if (data.accentColor) {
          document.documentElement.style.setProperty('--color-accent', data.accentColor);
        }
      }
    } catch (e) {
      console.error("Error fetching salon data:", e);
    }
  };

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/gallery", label: "Gallery" },
    { path: "/book", label: "Book" },
    { path: "/policies", label: "FAQ" },
  ];

  const isActive = (path) => location.pathname === path;

  // Get display name parts
  const brandAccent = salon?.brandAccent || "";
  const fullName = salon?.name || "Beauty Studio";
  const nameWithoutAccent = brandAccent ? fullName.replace(brandAccent, "").trim() : fullName;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#E6D5D0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              {brandAccent && (
                <span className="font-accent text-2xl md:text-3xl text-[#9D5C63]">{brandAccent}</span>
              )}
              <span className="text-lg md:text-xl font-semibold text-[#4A403A]">{nameWithoutAccent}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                  className={`nav-link text-sm font-medium tracking-wide uppercase ${
                    isActive(link.path)
                      ? "text-[#D69E8E]"
                      : "text-[#4A403A] hover:text-[#D69E8E]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              {salon && (
                <a
                  href={`tel:${salon.phone}`}
                  className="flex items-center gap-2 text-sm text-[#4A403A] hover:text-[#D69E8E]"
                  data-testid="header-phone"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden lg:inline">{salon.phone}</span>
                </a>
              )}
              <Link
                to="/book"
                className="bg-[#D69E8E] hover:bg-[#C0806E] text-white px-6 py-2.5 rounded-full font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="header-book-btn"
              >
                {salon?.ctaText || "Book Now"}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[#4A403A]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E6D5D0] animate-fade-in">
            <nav className="flex flex-col py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                  className={`px-6 py-3 text-base font-medium ${
                    isActive(link.path)
                      ? "text-[#D69E8E] bg-[#FDF8F5]"
                      : "text-[#4A403A]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0">
        <Outlet context={{ salon }} />
      </main>

      {/* Footer - Desktop */}
      <footer className="hidden md:block bg-[#4A403A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                {brandAccent && (
                  <span className="font-accent text-3xl text-[#D69E8E]">{brandAccent}</span>
                )}
                <span className="text-xl font-semibold">{nameWithoutAccent}</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                {salon?.aboutText || "Your destination for beauty and self-care."}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-gray-300 hover:text-[#D69E8E] text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
              {salon && (
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-[#D69E8E]" />
                    <span>{salon.address}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#D69E8E]" />
                    <span>{salon.phone}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D69E8E]" />
                    <span>{salon.openingHours}</span>
                  </li>
                  {salon.instagramUrl && (
                    <li>
                      <a
                        href={salon.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-[#D69E8E]"
                      >
                        <Instagram className="w-4 h-4 text-[#D69E8E]" />
                        <span>Follow on Instagram</span>
                      </a>
                    </li>
                  )}
                  {salon.facebookUrl && (
                    <li>
                      <a
                        href={salon.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-[#D69E8E]"
                      >
                        <Facebook className="w-4 h-4 text-[#D69E8E]" />
                        <span>Follow on Facebook</span>
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {salon?.name || "Beauty Studio"}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Bar */}
      <MobileBottomBar salon={salon} />
    </div>
  );
};

export default Layout;

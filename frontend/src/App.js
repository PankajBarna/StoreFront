import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

// Pages
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import BookPage from "@/pages/BookPage";
import GalleryPage from "@/pages/GalleryPage";
import PoliciesPage from "@/pages/PoliciesPage";
import AdminPage from "@/pages/AdminPage";
import SalonLoginPage from "@/pages/SalonLoginPage";
import SalonDashboardPage from "@/pages/SalonDashboardPage";

// Components
import { Layout } from "@/components/Layout";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-[#FFFCFA]">
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
          </Route>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/salon/login" element={<SalonLoginPage />} />
          <Route path="/salon/dashboard" element={<SalonDashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;

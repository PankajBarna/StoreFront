import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import BookPage from "@/pages/BookPage";
import GalleryPage from "@/pages/GalleryPage";
import PoliciesPage from "@/pages/PoliciesPage";
import AdminPage from "@/pages/AdminPage";
import SalonLoginPage from "@/pages/SalonLoginPage";
import SalonDashboardPage from "@/pages/SalonDashboardPage";
import PlatformFeaturesPage from "@/pages/PlatformFeaturesPage";

// Components
import { Layout } from "@/components/Layout";

function App() {
  return (
    <div className="min-h-screen bg-[#FFFCFA]">
      <BrowserRouter>
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
          <Route path="/admin/features" element={<PlatformFeaturesPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;

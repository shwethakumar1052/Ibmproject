import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./i18n";
import Navbar        from "./components/Navbar";
import Footer        from "./components/Footer";
import AuthModal     from "./components/AuthModal";
import ErrorBoundary from "./components/ErrorBoundary";
import ChatBot       from "./components/ChatBot";

import Home                     from "./pages/Home";
import EligibilityQuestionnaire from "./pages/EligibilityQuestionnaire";
import Results                  from "./pages/Results";
import SchemeSearch              from "./pages/SchemeSearch";
import SchemeDetails             from "./pages/SchemeDetails";
import CompareSchemes            from "./pages/CompareSchemes";
import Profile                   from "./pages/Profile";
import SavedSchemes              from "./pages/SavedSchemes";
import RecommendationHistory     from "./pages/RecommendationHistory";
import ImpactDashboard           from "./pages/ImpactDashboard";

import AdminLayout    from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/Dashboard";
import ManageSchemes  from "./pages/Admin/ManageSchemes";
import UploadSchemes  from "./pages/Admin/UploadSchemes";
import AdminAnalytics from "./pages/Admin/Analytics";

const STORAGE_USER_KEY = "govmatch_user";

export default function App() {
  const [theme, setTheme]       = useState(() => localStorage.getItem("theme") || "light");
  const [user, setUser]         = useState(() => JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || "null"));
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  function handleAuthChange(u) {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
    else    localStorage.removeItem(STORAGE_USER_KEY);
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem(STORAGE_USER_KEY);
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Admin portal — full-screen, own layout ── */}
        <Route path="/admin" element={
          <ErrorBoundary>
            <AdminLayout />
          </ErrorBoundary>
        }>
          <Route index            element={<AdminDashboard />} />
          <Route path="schemes"   element={<ManageSchemes />} />
          <Route path="upload"    element={<UploadSchemes />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        {/* ── Citizen app — shared Navbar/Footer layout ── */}
        <Route path="*" element={
          <ErrorBoundary>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Navbar
                theme={theme}
                toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
                user={user}
                onAuthClick={() => setAuthOpen(true)}
                onLogout={handleLogout}
              />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
                <Routes>
                  <Route path="/"           element={<Home />} />
                  <Route path="/assess"     element={<EligibilityQuestionnaire />} />
                  <Route path="/results"    element={<Results />} />
                  <Route path="/search"     element={<SchemeSearch />} />
                  <Route path="/scheme/:id" element={<SchemeDetails />} />
                  <Route path="/compare"    element={<CompareSchemes />} />
                  <Route path="/profile"    element={<Profile user={user} onAuthChange={handleAuthChange} />} />
                  <Route path="/saved"      element={<SavedSchemes />} />
                  <Route path="/history"    element={<RecommendationHistory />} />
                  <Route path="/impact"     element={<ImpactDashboard />} />
                  <Route path="*"           element={<Home />} />
                </Routes>
              </main>
              <Footer />
            </div>
            <ChatBot />
            <AuthModal
              open={authOpen}
              onClose={() => setAuthOpen(false)}
              onAuthChange={handleAuthChange}
            />
          </ErrorBoundary>
        } />
      </Routes>
    </BrowserRouter>
  );
}

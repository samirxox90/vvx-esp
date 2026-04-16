import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import Apply from "./pages/Apply.tsx";
import Report from "./pages/Report.tsx";
import Inbox from "./pages/Inbox.tsx";
import Market from "./pages/Market.tsx";
import TermsPolicy from "./pages/TermsPolicy.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import NotFound from "./pages/NotFound.tsx";
import SiteFooter from "./components/SiteFooter";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/admin" element={user ? <Admin /> : <Navigate to="/login" replace />} />
      <Route path="/apply" element={user ? <Apply /> : <Navigate to="/login" replace />} />
      <Route path="/report" element={user ? <Report /> : <Navigate to="/login" replace />} />
      <Route path="/inbox" element={user ? <Inbox /> : <Navigate to="/login" replace />} />
      <Route path="/market-place" element={<Market />} />
      <Route path="/terms-policy" element={<TermsPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            <AppRoutes />
          </div>
          <SiteFooter />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


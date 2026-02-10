import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Catalogue from "./pages/Catalogue";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import CreateOrder from "./pages/CreateOrder";
import OrderDetail from "./pages/OrderDetail";
import OperationsPanel from "./pages/OperationsPanel";
import AdminPanel from "./pages/AdminPanel";
import SalesCoach from "./pages/SalesCoach";
import AICoachPage from "./pages/AICoachPage";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import { AICoachChatBubble } from "./components/ai-coach/AICoachChatBubble";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'operations' }) {
  const { user, loading, role, isApproved } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  // Check if user is approved
  if (!isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }
  
  // Role-based access control
  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (requiredRole === 'operations' && role !== 'admin' && role !== 'operations') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isApproved, role } = useAuth();
  const showChatBubble = user && isApproved && role === 'sales';

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/catalogue" element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/new" element={<ProtectedRoute><CreateOrder /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/sales-coach" element={<ProtectedRoute><SalesCoach /></ProtectedRoute>} />
        <Route path="/ai-coach" element={<ProtectedRoute><AICoachPage /></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute requiredRole="operations"><OperationsPanel /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showChatBubble && <AICoachChatBubble />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

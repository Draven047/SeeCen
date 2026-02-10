import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Catalogue from "./pages/Catalogue";
import Customers from "./pages/Customers";
import Customer360 from "./pages/Customer360";
import Orders from "./pages/Orders";
import OrderInbox from "./pages/OrderInbox";
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

type AllowedRole = 'admin' | 'manager' | 'sales' | 'operations' | 'finance' | 'viewer';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: AllowedRole[] }) {
  const { user, loading, role, isApproved } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (!isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }
  
  // Role-based access control
  if (allowedRoles && role && !allowedRoles.includes(role as AllowedRole)) {
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
        <Route path="/catalogue" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Catalogue /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customers /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customer360 /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Orders /></ProtectedRoute>} />
        <Route path="/order-inbox" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><OrderInbox /></ProtectedRoute>} />
        <Route path="/orders/new" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><CreateOrder /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><OrderDetail /></ProtectedRoute>} />
        <Route path="/sales-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><SalesCoach /></ProtectedRoute>} />
        <Route path="/ai-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><AICoachPage /></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><OperationsPanel /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
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

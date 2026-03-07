import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Hub from "./pages/Hub";
import Catalogue from "./pages/Catalogue";
import AddProduct from "./pages/AddProduct";
import ProductDetail from "./pages/ProductDetail";
import Customers from "./pages/Customers";
import Customer360 from "./pages/Customer360";
import Orders from "./pages/Orders";
// OrderInbox merged into Orders
import CreateOrder from "./pages/CreateOrder";
import OrderDetail from "./pages/OrderDetail";
import Fulfillment from "./pages/Fulfillment";
import Shipping from "./pages/Shipping";
import Inventory from "./pages/Inventory";
import Returns from "./pages/Returns";
import Employees from "./pages/Employees";
import Analytics from "./pages/Analytics";
import Finance from "./pages/Finance";
import Channels from "./pages/Channels";
import SettingsPage from "./pages/Settings";
import OperationsPanel from "./pages/OperationsPanel";
import AdminPanel from "./pages/AdminPanel";
import Approvals from "./pages/admin/Approvals";
import SalesCoach from "./pages/SalesCoach";
import AICoachPage from "./pages/AICoachPage";
import PendingApproval from "./pages/PendingApproval";
import Feedback from "./pages/Feedback";
import Growth from "./pages/Growth";
import UIKit from "./pages/UIKit";
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
  if (!isApproved) return <Navigate to="/pending-approval" replace />;

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

        {/* Core — SellerOS primary tabs */}
        <Route path="/dashboard" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Orders /></ProtectedRoute>} />
        <Route path="/orders/new" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><CreateOrder /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><OrderDetail /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><Inventory /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Finance /></ProtectedRoute>} />
        <Route path="/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />

        {/* Operations */}
        <Route path="/fulfillment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Fulfillment /></ProtectedRoute>} />
        <Route path="/shipping" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><Shipping /></ProtectedRoute>} />
        <Route path="/catalogue" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Catalogue /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Returns /></ProtectedRoute>} />

        {/* People */}
        <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customers /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customer360 /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Employees /></ProtectedRoute>} />

        {/* Insights */}
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'finance']}><Analytics /></ProtectedRoute>} />

        {/* Administration */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><Approvals /></ProtectedRoute>} />
        <Route path="/channels" element={<ProtectedRoute allowedRoles={['admin']}><Channels /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><OperationsPanel /></ProtectedRoute>} />

        {/* AI */}
        <Route path="/sales-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><SalesCoach /></ProtectedRoute>} />
        <Route path="/ai-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><AICoachPage /></ProtectedRoute>} />
        <Route path="/ui-kit" element={<ProtectedRoute allowedRoles={['admin']}><UIKit /></ProtectedRoute>} />

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
          <StoreProvider>
            <AppRoutes />
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { AICoachChatBubble } from "./components/ai-coach/AICoachChatBubble";

const queryClient = new QueryClient();

const Auth = lazy(() => import("./pages/Auth"));
const Hub = lazy(() => import("./pages/Hub"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Customers = lazy(() => import("./pages/Customers"));
const Customer360 = lazy(() => import("./pages/Customer360"));
const Orders = lazy(() => import("./pages/Orders"));
const CreateOrder = lazy(() => import("./pages/CreateOrder"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Fulfillment = lazy(() => import("./pages/Fulfillment"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Returns = lazy(() => import("./pages/Returns"));
const Employees = lazy(() => import("./pages/Employees"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Finance = lazy(() => import("./pages/Finance"));
const Channels = lazy(() => import("./pages/Channels"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const OperationsPanel = lazy(() => import("./pages/OperationsPanel"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Approvals = lazy(() => import("./pages/admin/Approvals"));
const SalesCoach = lazy(() => import("./pages/SalesCoach"));
const AICoachPage = lazy(() => import("./pages/AICoachPage"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Growth = lazy(() => import("./pages/Growth"));
const UIKit = lazy(() => import("./pages/UIKit"));
const NotFound = lazy(() => import("./pages/NotFound"));

type AllowedRole = 'admin' | 'manager' | 'sales' | 'operations' | 'finance' | 'viewer';

function AppLoadingShell({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Loading the next SeeCen view.</p>
          </div>
          <div className="mx-auto h-1.5 w-44 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: AllowedRole[] }) {
  const { user, loading, role, isApproved } = useAuth();

  if (loading) {
    return <AppLoadingShell label="Checking access" />;
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
      <Suspense fallback={<AppLoadingShell />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Core - SellerOS primary tabs */}
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
          <Route path="/catalogue/add" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><AddProduct /></ProtectedRoute>} />
          <Route path="/catalogue/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><ProductDetail /></ProtectedRoute>} />
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
      </Suspense>
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

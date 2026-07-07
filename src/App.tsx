import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { AICoachChatBubble } from "./components/ai-coach/AICoachChatBubble";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoading } from "@/components/ui/page-loading";

const queryClient = new QueryClient();

const Landing = lazy(() => import("./pages/Landing"));
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
    <div className="min-h-screen bg-[#f6f7f3] px-5 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <PageLoading label={label} rows={3} />
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
    return <Navigate to="/demo/dashboard" replace />;
  }

  return <>{children}</>;
}

function LegacyRedirect({ to }: { to: string }) {
  const params = useParams();
  const path = Object.entries(params).reduce(
    (next, [key, value]) => next.replace(`:${key}`, value || ''),
    to,
  );
  return <Navigate to={path} replace />;
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
          <Route path="/" element={<Landing />} />

          {/* Demo app */}
          <Route path="/demo/dashboard" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/demo/orders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Orders /></ProtectedRoute>} />
          <Route path="/demo/orders/new" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><CreateOrder /></ProtectedRoute>} />
          <Route path="/demo/orders/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><OrderDetail /></ProtectedRoute>} />
          <Route path="/demo/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><Inventory /></ProtectedRoute>} />
          <Route path="/demo/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/demo/finance" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><Finance /></ProtectedRoute>} />
          <Route path="/demo/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />

          {/* Operations */}
          <Route path="/demo/fulfillment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Fulfillment /></ProtectedRoute>} />
          <Route path="/demo/shipping" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><Shipping /></ProtectedRoute>} />
          <Route path="/demo/catalogue" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Catalogue /></ProtectedRoute>} />
          <Route path="/demo/catalogue/add" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><AddProduct /></ProtectedRoute>} />
          <Route path="/demo/catalogue/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><ProductDetail /></ProtectedRoute>} />
          <Route path="/demo/returns" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'operations']}><Returns /></ProtectedRoute>} />

          {/* People */}
          <Route path="/demo/customers" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customers /></ProtectedRoute>} />
          <Route path="/demo/customers/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customer360 /></ProtectedRoute>} />
          <Route path="/demo/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Employees /></ProtectedRoute>} />

          {/* Insights */}
          <Route path="/demo/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'finance']}><Analytics /></ProtectedRoute>} />

          {/* Administration */}
          <Route path="/demo/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
          <Route path="/demo/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><Approvals /></ProtectedRoute>} />
          <Route path="/demo/channels" element={<ProtectedRoute allowedRoles={['admin']}><Channels /></ProtectedRoute>} />
          <Route path="/demo/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
          <Route path="/demo/operations" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'operations']}><OperationsPanel /></ProtectedRoute>} />

          {/* AI */}
          <Route path="/demo/sales-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><SalesCoach /></ProtectedRoute>} />
          <Route path="/demo/ai-coach" element={<ProtectedRoute allowedRoles={['admin', 'sales']}><AICoachPage /></ProtectedRoute>} />
          <Route path="/demo/ui-kit" element={<ProtectedRoute allowedRoles={['admin']}><UIKit /></ProtectedRoute>} />

          {/* Legacy app paths redirect to the open demo namespace. */}
          <Route path="/dashboard" element={<Navigate to="/demo/dashboard" replace />} />
          <Route path="/orders" element={<Navigate to="/demo/orders" replace />} />
          <Route path="/orders/new" element={<Navigate to="/demo/orders/new" replace />} />
          <Route path="/orders/:id" element={<LegacyRedirect to="/demo/orders/:id" />} />
          <Route path="/inventory" element={<Navigate to="/demo/inventory" replace />} />
          <Route path="/feedback" element={<Navigate to="/demo/feedback" replace />} />
          <Route path="/finance" element={<Navigate to="/demo/finance" replace />} />
          <Route path="/growth" element={<Navigate to="/demo/growth" replace />} />
          <Route path="/fulfillment" element={<Navigate to="/demo/fulfillment" replace />} />
          <Route path="/shipping" element={<Navigate to="/demo/shipping" replace />} />
          <Route path="/catalogue" element={<Navigate to="/demo/catalogue" replace />} />
          <Route path="/catalogue/add" element={<Navigate to="/demo/catalogue/add" replace />} />
          <Route path="/catalogue/:id" element={<LegacyRedirect to="/demo/catalogue/:id" />} />
          <Route path="/returns" element={<Navigate to="/demo/returns" replace />} />
          <Route path="/customers" element={<Navigate to="/demo/customers" replace />} />
          <Route path="/customers/:id" element={<LegacyRedirect to="/demo/customers/:id" />} />
          <Route path="/employees" element={<Navigate to="/demo/employees" replace />} />
          <Route path="/analytics" element={<Navigate to="/demo/analytics" replace />} />
          <Route path="/admin" element={<Navigate to="/demo/admin" replace />} />
          <Route path="/admin/approvals" element={<Navigate to="/demo/admin/approvals" replace />} />
          <Route path="/channels" element={<Navigate to="/demo/channels" replace />} />
          <Route path="/settings" element={<Navigate to="/demo/settings" replace />} />
          <Route path="/operations" element={<Navigate to="/demo/operations" replace />} />
          <Route path="/sales-coach" element={<Navigate to="/demo/sales-coach" replace />} />
          <Route path="/ai-coach" element={<Navigate to="/demo/ai-coach" replace />} />
          <Route path="/ui-kit" element={<Navigate to="/demo/ui-kit" replace />} />

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
        <ErrorBoundary>
          <AuthProvider>
            <StoreProvider>
              <AppRoutes />
            </StoreProvider>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

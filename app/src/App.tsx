import axios from "axios";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/Login";
import SellPage from "./pages/Sell";
import ProductsPage from "./pages/Products";
import DashboardPage from "./pages/Dashboard";
import InventoryPage from "./pages/Inventory";
import SelectRegisterPage from "./pages/SelectRegister";
import CustomersPage from "./pages/Customers";
import { getPosContext } from "./posContext";
import SalesHistoryPage from "./pages/SalesHistory";
import UsersPage from "./pages/Users";
import ReceivingPage from "./pages/Receiving";
import SuppliersPage from "./pages/Suppliers";
import SupplierDetailPage from "./pages/SupplierDetail";
import TransfersList from "./pages/TransfersList";
import CreateTransfer from "./pages/CreateTransfer";
import TransferDetail from "./pages/TransferDetail";
import AppShell from "./layout/AppShell";
import OrderDetailPage from "./pages/OrderDetailPage";
import RefundCreatePage from "./pages/RefundCreatePage";
import RefundDetailPage from "./pages/RefundDetailPage";
import ReportsPage from "./pages/Reports";

// Set Authorization header from localStorage if present
if (typeof window !== "undefined") {
  const token = localStorage.getItem("authToken");
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}

function useAuth() {
  const raw = typeof window !== "undefined" ? localStorage.getItem("posUser") : null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function PosRoute({ children }: { children: JSX.Element }) {
  const ctx = getPosContext();
  const location = useLocation();

  if (!ctx) {
    return (
      <Navigate
        to="/select-register"
        replace
        state={{ from: location }}
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/select-register"
        element={
          <ProtectedRoute>
            <SelectRegisterPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sell"
        element={
          <ProtectedRoute>
            <PosRoute>
              <SellPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <PosRoute>
              <SalesHistoryPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <PosRoute>
              <ProductsPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />
     
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <PosRoute>
              <InventoryPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <PosRoute>
              <CustomersPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={<UsersPage />}
      />
    
      <Route
        path="/receiving"
        element={<ReceivingPage />}
      />
     
      <Route path="/suppliers" element={<SuppliersPage />} />
      <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
      

     <Route
  path="/transfers"
  element={
    <ProtectedRoute>
      <PosRoute>
        <AppShell title="Transfers">
          <TransfersList />
        </AppShell>
      </PosRoute>
    </ProtectedRoute>
  }
/>

<Route
  path="/transfers/new"
  element={
    <ProtectedRoute>
      <PosRoute>
        <AppShell title="New Transfer">
          <CreateTransfer />
        </AppShell>
      </PosRoute>
    </ProtectedRoute>
  }
/>

<Route
  path="/transfers/:id"
  element={
    <ProtectedRoute>
      <PosRoute>
        <AppShell title="Transfer Detail">
          <TransferDetail />
        </AppShell>
      </PosRoute>
    </ProtectedRoute>
  }
/>

<Route path="/orders/:orderId" element={<OrderDetailPage />} />
<Route path="/orders/:orderId/refund" element={<RefundCreatePage />} />
<Route path="/refunds/:refundId" element={<RefundDetailPage />} />
<Route path="/reports" element={<ReportsPage />} />


      <Route
        path="/transfers"
        element={
          <AppShell title="Transfers">
            <TransfersList />
          </AppShell>
        }
      />
      <Route
        path="/transfers/new"
        element={
          <AppShell title="New Transfer">
            <CreateTransfer />
          </AppShell>
        }
      />
      <Route
        path="/transfers/:id"
        element={
          <AppShell title="Transfer Detail">
            <TransferDetail />
          </AppShell>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PosRoute>
              <DashboardPage />
            </PosRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

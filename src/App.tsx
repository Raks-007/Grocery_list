/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { ShoppingLists } from "./pages/ShoppingLists";
import { ShoppingListDetail } from "./pages/ShoppingListDetail";
import { MasterItems } from "./pages/MasterItems";
import { Categories } from "./pages/Categories";
import { PurchaseHistory } from "./pages/PurchaseHistory";
import { Settings } from "./pages/Settings";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Auth } from "./pages/Auth";

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lists" element={<ShoppingLists />} />
        <Route path="/lists/:id" element={<ShoppingListDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/items" element={<MasterItems />} />
        <Route path="/history" element={<PurchaseHistory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}


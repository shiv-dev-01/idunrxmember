import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { OrderDetails } from "./pages/OrderDetails/OrderDetails";
import { AccountDetails } from "./pages/AccountDetails";
import { InstructionVideos } from "./pages/InstructionVideos";
import { UpdatePassword } from "./pages/UpdatePassword";
import { Login } from "./pages/Login/Login";
import { ChangePassword } from "./pages/ChangePassword/ChangePassword";
import { Auth0Callback } from "./auth/Auth0Callback";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ChatDetailsPage } from "./pages/chatwithdr/ChatDetailsPage";
import { Chatwithdoctor } from "./pages/chatwithdr/Chatwithdoctor";
import { UploadImage } from "./pages/UploadImage/UploadImage";
import { Coaching } from "./pages/Coaching/Coaching";
import { Refills } from "./pages/Refills";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/auth0-callback" element={<Auth0Callback />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:orderId" element={<OrderDetails />} />
        <Route path="refills" element={<Refills />} />
        <Route path="chatdetail/:orderId" element={<ChatDetailsPage />} />
        <Route path="account" element={<AccountDetails />} />
        <Route path="videos" element={<InstructionVideos />} />
        <Route path="chat" element={<Chatwithdoctor />} />
        <Route path="password" element={<UpdatePassword />} />
        <Route path="upload-image/:orderId" element={<UploadImage />} />
        <Route path="coaching" element={<Coaching />} />
        {/* <Route path="*" element={<Navigate to="/dashboard" replace />} /> */}
      </Route>
    </Routes>
  );
}

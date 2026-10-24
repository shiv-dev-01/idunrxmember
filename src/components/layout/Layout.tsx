import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { TourButton } from "../ui/TourButton";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth } from "../../hooks/useAuth";
import { navItems } from "../../config/navigation";
import { storage } from "../../utils/storage";
import { api } from "../../services/api/config";
import Intercom from "@intercom/messenger-js-sdk";

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { logout } = useAuth();
  const [hashId, setHashId] = useState<string | null>(null);
  const [intercomUserId, setIntercomUserId] = useState<string | null>(null);
  const userData = storage.getUserData();
  const [loading, setLoading] = useState(true);

  const getHashApi = async () => {
    if (!userData?.userId || !userData?.email) {
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("id", String(userData.userId));
    formData.append("email", userData.email);

    try {
      const response = await api.post("/generateHash", formData);
      console.log("API Response:", response);

      if (response.data) {
        setHashId(response.data.hash_id);
        setIntercomUserId(response.data.intercom_user_id);
      }
    } catch (error) {
      console.error("Error fetching hash:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getHashApi();
  }, []);

  useEffect(() => {
    if (hashId) {
      Intercom({
        app_id: "r2p0ub4f",
        region: "us",
        user_hash: hashId,
        user_id: intercomUserId,
        name: userData.firstName,
        email: userData.email,
        created_at: Math.floor(Date.now() / 1000), // Timestamp
      });
    }
  }, [hashId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex pt-[72px] md:pt-[80px]">
        <Sidebar onLogout={logout} />

        <MobileNav
          isOpen={isMobileMenuOpen}
          onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          navItems={navItems}
          onLogout={logout}
        />

        <main className="flex-1 p-4 md:p-8 w-full overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {/* <button
        // onClick={() => Intercom('show')}
        className="fixed bottom-2.5 right-1 text-black p-1 "
        // title="Need help? Chat with us!"
      >
        Support Chat
      </button> */}
      <TourButton />
    </div>
  );
}

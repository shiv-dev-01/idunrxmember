import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { LoadingBar } from "../ui/LoadingBar";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingBar isLoading={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

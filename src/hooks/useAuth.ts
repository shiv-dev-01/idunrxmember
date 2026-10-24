/**
 * Re-export AuthProvider's useAuth so Layout/Header/ProtectedRoute
 * share one cookie-based session (no duplicate token auth).
 */
export { useAuth } from "../providers/AuthProvider";

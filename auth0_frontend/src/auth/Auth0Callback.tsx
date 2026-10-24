import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

/**
 * Auth0Callback
 *
 * Mount this at the /auth0-callback route (matches the
 * redirect_uri set in Auth0ProviderWrapper). After Google login
 * completes, Auth0 sends the browser here — this component then
 * calls YOUR backend's bridge_to_session endpoint, which sets the
 * real httponly session cookies and confirms the user is a real
 * customer (rejects anyone who isn't).
 *
 * ⚠️ SET THIS per-brand — each project points at its own backend:
 *   CoreAgeRx:        https://panel.whitelabelmd.com/ageshiftrx_token_v2/api/auth0/bridge_to_session
 *   RestoreDelivered: https://panel.whitelabelmd.com/restoredelivered_v2/api/auth0/bridge_to_session
 */
const BRIDGE_TO_SESSION_ENDPOINT =
  "https://panel.whitelabelmd.com/REPLACE_WITH_YOUR_PROJECT/api/auth0/bridge_to_session";

export function Auth0Callback() {
  const { isAuthenticated, isLoading, getAccessTokenSilently, error } = useAuth0();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isLoading) return;

    if (error) {
      setStatus("error");
      setErrorMessage(error.message || "Login failed.");
      return;
    }

    if (!isAuthenticated) {
      setStatus("error");
      setErrorMessage("Not authenticated.");
      return;
    }

    (async () => {
      try {
        const accessToken = await getAccessTokenSilently();

        const res = await fetch(BRIDGE_TO_SESSION_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include", // required — this is what lets the httponly cookies get set
        });

        const data = await res.json();

        if (data.status === 1) {
          setStatus("success");
          // Redirect into the app — adjust to wherever your
          // logged-in dashboard/home route actually is
          window.location.href = "/dashboard";
        } else {
          setStatus("error");
          setErrorMessage(data.message || "Unable to sign in.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage("Network error. Please try again.");
      }
    })();
  }, [isLoading, isAuthenticated, error, getAccessTokenSilently]);

  if (status === "loading") {
    return <p>Signing you in...</p>;
  }

  if (status === "error") {
    return (
      <div>
        <p style={{ color: "#b91c1c" }}>{errorMessage}</p>
        <a href="/login">Back to login</a>
      </div>
    );
  }

  return <p>Success! Redirecting...</p>;
}

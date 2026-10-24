import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Logo } from "../components/layout/Logo";
import { useAuth } from "../providers/AuthProvider";
import { API_ORIGIN, ensureCsrfCookieIfNeeded } from "../services/api/config";
import { getUserProfileData } from "../services/api/user";
import type { LoginResponse } from "../types/auth";

const BRIDGE_TO_SESSION_ENDPOINT = `${API_ORIGIN}/api/auth0/bridge_to_session`;

type CallbackStatus = "loading" | "error" | "success";

let bridgeAttempt: Promise<LoginResponse> | null = null;

function hasLoginFields(data: LoginResponse): data is LoginResponse & {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
} {
  return Boolean(data.user_id && data.email && data.first_name && data.last_name);
}

async function resolveSessionFromProfile(email: string): Promise<LoginResponse> {
  const profile = await getUserProfileData(email);
  const details = profile.user_details;

  if (profile.status !== 1 || !details?.email || !details.first_name || !details.last_name) {
    throw new Error(profile.message || "Unable to load account details.");
  }

  if (!details.id) {
    throw new Error("Unable to load account details.");
  }

  return {
    status: 1,
    message: profile.message || "Success",
    user_id: details.id,
    email: details.email,
    first_name: details.first_name,
    last_name: details.last_name,
    phone_number: details.phone_number || "",
    gender: details.gender || "",
  };
}

async function bridgeToSession(
  accessToken: string,
  auth0Email?: string
): Promise<LoginResponse> {
  await ensureCsrfCookieIfNeeded();

  const res = await fetch(BRIDGE_TO_SESSION_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  let data: LoginResponse;
  try {
    data = (await res.json()) as LoginResponse;
  } catch {
    throw new Error("Unable to sign in.");
  }

  if (data.status !== 1) {
    throw new Error(data.message || "Unable to sign in.");
  }

  if (hasLoginFields(data)) {
    return data;
  }

  const email = data.email || auth0Email;
  if (!email) {
    throw new Error("Unable to sign in.");
  }

  return resolveSessionFromProfile(email);
}

export function Auth0Callback() {
  const { isAuthenticated, isLoading, getAccessTokenSilently, error, user } =
    useAuth0();
  const { establishSession } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("loading");
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

    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        if (!bridgeAttempt) {
          bridgeAttempt = (async () => {
            const accessToken = await getAccessTokenSilently();
            return bridgeToSession(accessToken, user?.email);
          })();
        }

        const session = await bridgeAttempt;

        if (cancelled) return;

        establishSession(session);
        setStatus("success");
        window.location.replace("/dashboard");
      } catch (err) {
        bridgeAttempt = null;
        if (cancelled) return;
        setStatus("error");
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" &&
                err &&
                "message" in err &&
                typeof (err as { message: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Network error. Please try again.";
        setErrorMessage(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    isAuthenticated,
    error,
    getAccessTokenSilently,
    user,
    establishSession,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {status === "error" ? "Sign in failed" : "Signing you in"}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {status === "loading" && (
            <p className="text-sm text-gray-600">Signing you in...</p>
          )}

          {status === "success" && (
            <p className="text-sm text-gray-600">Success! Redirecting...</p>
          )}

          {status === "error" && (
            <div>
              <p className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
                {errorMessage}
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

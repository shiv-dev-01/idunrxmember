import { useAuth0 } from "@auth0/auth0-react";

/**
 * GoogleLoginButton
 *
 * Clicking this goes STRAIGHT to Google's account picker —
 * skips Auth0's own email/password login page entirely, since
 * Google is the only sign-in method wanted.
 *
 * Drop this anywhere in your existing login page, e.g. replacing
 * whatever the current "Sign In" button does.
 */
export function GoogleLoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleClick = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: "google-oauth2",
      },
    });
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Loading..." : "Sign in with Google"}
    </button>
  );
}

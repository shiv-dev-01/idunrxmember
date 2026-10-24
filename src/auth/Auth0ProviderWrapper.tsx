import { Auth0Provider } from "@auth0/auth0-react";
import type { ReactNode } from "react";

/**
 * Shared "Sign In Secure" tenant/app — same values across every brand.
 * Only redirect_uri differs per-domain, via window.location.origin.
 */
const AUTH0_DOMAIN = "signinsecure.us.auth0.com";
const AUTH0_CLIENT_ID = "ZDkvJjgduDzCAdBiW9Jmxwd7uvG29Ebu";
const AUTH0_AUDIENCE = "api.signinsecure.internal";

export function Auth0ProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + "/auth0-callback",
        audience: AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      skipRedirectCallback={window.location.pathname !== "/auth0-callback"}
    >
      {children}
    </Auth0Provider>
  );
}

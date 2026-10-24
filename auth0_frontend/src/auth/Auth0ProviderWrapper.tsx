import { Auth0Provider } from "@auth0/auth0-react";
import type { ReactNode } from "react";

/**
 * Auth0ProviderWrapper
 *
 * These 3 values are the SAME across every brand — this is the
 * shared "Sign In Secure" tenant/app, not a per-brand one.
 * Only redirect_uri differs automatically per-domain, via
 * window.location.origin.
 *
 * Wrap your whole app with this, e.g. in main.tsx:
 *   <Auth0ProviderWrapper>
 *     <App />
 *   </Auth0ProviderWrapper>
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
    >
      {children}
    </Auth0Provider>
  );
}

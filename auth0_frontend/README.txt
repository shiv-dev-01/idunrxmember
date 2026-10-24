═══════════════════════════════════════════════════════════════
 AUTH0 GOOGLE-ONLY LOGIN — Setup Instructions
═══════════════════════════════════════════════════════════════

3 files:
  Auth0ProviderWrapper.tsx   — wraps the whole app (identical for both brands)
  GoogleLoginButton.tsx      — the actual login button (identical for both brands)
  Auth0Callback.tsx          — handles the redirect back (ONE LINE differs per brand)


═══════════════════════════════════════════════════════════════
 STEP 1 — Install the package
═══════════════════════════════════════════════════════════════

npm install @auth0/auth0-react


═══════════════════════════════════════════════════════════════
 STEP 2 — Wrap your app
═══════════════════════════════════════════════════════════════

In main.tsx (or wherever your app root is):

  import { Auth0ProviderWrapper } from "./auth/Auth0ProviderWrapper";

  <Auth0ProviderWrapper>
    <App />
  </Auth0ProviderWrapper>


═══════════════════════════════════════════════════════════════
 STEP 3 — Add the login button
═══════════════════════════════════════════════════════════════

Drop <GoogleLoginButton /> anywhere on your login page — replace
whatever the current login button does with this one.

  import { GoogleLoginButton } from "./auth/GoogleLoginButton";

  <GoogleLoginButton />

Clicking it goes STRAIGHT to Google's account picker — no
Auth0-branded login page shown at all, matching "direct Google
button, click and it works" from the brief.


═══════════════════════════════════════════════════════════════
 STEP 4 — Add the callback route
═══════════════════════════════════════════════════════════════

Add a route for /auth0-callback pointing at the Auth0Callback
component (exact syntax depends on your router — react-router
example):

  import { Auth0Callback } from "./auth/Auth0Callback";

  <Route path="/auth0-callback" element={<Auth0Callback />} />


═══════════════════════════════════════════════════════════════
 ⚠️ STEP 5 — REQUIRED: set the correct backend URL per brand
═══════════════════════════════════════════════════════════════

Open Auth0Callback.tsx, find this line near the top:

  const BRIDGE_TO_SESSION_ENDPOINT =
    "https://panel.whitelabelmd.com/REPLACE_WITH_YOUR_PROJECT/api/auth0/bridge_to_session";

Replace REPLACE_WITH_YOUR_PROJECT with the correct backend folder
for whichever brand this build is for:

  CoreAgeRx:
    https://panel.whitelabelmd.com/ageshiftrx_token_v2/api/auth0/bridge_to_session

  RestoreDelivered:
    https://panel.whitelabelmd.com/restoredelivered_v2/api/auth0/bridge_to_session

This is the ONLY line that differs between the two brands' builds
— everything else in all 3 files is identical.


═══════════════════════════════════════════════════════════════
 WHAT HAPPENS WHEN A USER CLICKS THE BUTTON
═══════════════════════════════════════════════════════════════

1. Click "Sign in with Google" → straight to Google's picker
2. User approves → Google sends them back to Auth0
3. Auth0 sends them to /auth0-callback on your site
4. Auth0Callback.tsx gets the Auth0 token, calls your backend's
   bridge_to_session endpoint
5. Backend checks: is this email a REAL customer of this brand
   (via sticky.io/local patient lookup)?
     - Yes → sets real httponly session cookies, logs them in
     - No  → clean rejection: "No account found for this email.
             Please complete your purchase first."
6. On success, redirects to /dashboard (change this in
   Auth0Callback.tsx if your logged-in route is named differently)


═══════════════════════════════════════════════════════════════
 TESTING
═══════════════════════════════════════════════════════════════

Test with an email that's NOT a customer — should get rejected
cleanly.

Test with an email that IS a real customer — should log in and
land on /dashboard with real session cookies set (check DevTools
→ Application → Cookies for login_token, login_email, and the
brand's own session cookie).

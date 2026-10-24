import { useAuth0 } from "@auth0/auth0-react";

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.23-1.18 3.05-.79.85-2.1 1.51-3.22 1.42-.13-1.1.4-2.25 1.16-3.05.79-.85 2.16-1.47 3.24-1.42zM20.76 17.37c-.55 1.27-.81 1.84-1.52 2.96-1 1.56-2.4 3.5-4.14 3.52-1.54.02-1.94-.99-4.04-.98-2.1.01-2.54 1.01-4.08.99-1.74-.02-3.07-1.77-4.07-3.33-2.79-4.36-3.08-9.48-1.36-12.2 1.22-1.93 3.15-3.06 4.96-3.06 1.85 0 3.01 1.01 4.54 1.01 1.49 0 2.4-1.02 4.55-1.02 1.62 0 3.34.88 4.56 2.4-4.01 2.2-3.36 7.93.6 9.71z" />
    </svg>
  );
}

export function AppleLoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleClick = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: "apple",
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white min-h-[40px] shadow-sm transition-all duration-200 hover:bg-neutral-900 disabled:bg-neutral-400 disabled:text-white"
    >
      <AppleIcon />
      {isLoading ? "Loading..." : "Sign in with Apple"}
    </button>
  );
}

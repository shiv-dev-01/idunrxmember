import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Logo } from "../../components/layout/Logo";
import { useAuth } from "../../providers/AuthProvider";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { ForgotPasswordModal } from "../../components/auth/ForgotPasswordModal";
import { MagicLinkForm } from "../../components/auth/MagicLinkForm";
import { GoogleLoginButton } from "../../auth/GoogleLoginButton";
import { AppleLoginButton } from "../../auth/AppleLoginButton";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login, loginWithMagicLink, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasAttemptedAutoLogin, setHasAttemptedAutoLogin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // If user is already authenticated, AuthProvider will handle navigation
    if (isAuthenticated) {
      console.log(
        "User is already authenticated, AuthProvider will handle navigation"
      );
      return;
    }

    // Only attempt auto-login once
    if (hasAttemptedAutoLogin) {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const email = query.get("email");
    const password = query.get("password");

    if (email && password) {
      // Both email and password provided - use regular login
      console.log("Auto-login with email and password");
      const autoLogin = async () => {
        try {
          setIsLoading(true);
          setError(null);
          await login({ email, password });
        } catch (err: any) {
          setError(err.message || "Invalid credentials from URL");
        } finally {
          setIsLoading(false);
        }
      };
      autoLogin();
      setHasAttemptedAutoLogin(true);
    } else if (email && !password) {
      // Only email provided - use magic link login
      console.log("Auto-login with magic link for email:", email);
      const autoMagicLogin = async () => {
        try {
          setIsLoading(true);
          setError(null);
          await loginWithMagicLink(email);
        } catch (err: any) {
          setError(err.message || "Magic link authentication failed");
        } finally {
          setIsLoading(false);
        }
      };
      autoMagicLogin();
      setHasAttemptedAutoLogin(true);
    }
  }, [login, loginWithMagicLink, isAuthenticated, hasAttemptedAutoLogin]);

  // Remove the duplicate navigation effect since AuthProvider handles it

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data);
    } catch (error: any) {
      setError(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {showMagicLink ? (
              <>
                <MagicLinkForm />
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowMagicLink(false)}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Back to password login
                  </button>
                </div>
              </>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
               <div className="mb-6">
                  

                  <div className="mb-6 space-y-3">
                    <GoogleLoginButton />
                    <AppleLoginButton />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      {...register("email")}
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="form-input"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                        {...register("password")}
                        id="password"
                        // type="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="form-input"
                        placeholder="Enter your password"
                      />

                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label> */}
                  </div>

                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="font-medium text-primary-600 hover:text-primary-500"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>

                <div>
                  <Button type="submit" fullWidth disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>

               
              </form>
            )}
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
}

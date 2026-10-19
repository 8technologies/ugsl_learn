import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { AuthLayout } from "~/components/auth/AuthLayout";
import { PasswordInput } from "~/components/auth/PasswordInput";
import { ResendVerificationButton } from "~/components/auth/ResendVerificationButton";
import { getErrorCode } from "~/utils/errors";
import { GoogleLogoSvg } from "~/components/LoginScreen";
import { useBoundStore } from "~/hooks/useBoundStore";
import { LOGIN } from "~/gql/mutations";
import { toast } from "sonner";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
};

type LoginMutationResult = {
  login: {
    success: boolean;
    message: string | null;
    token: string;
    user: AuthUser | null;
  };
};

const LoginPage: NextPage = () => {
  const router = useRouter();
  const setAuthenticatedUser = useBoundStore((x) => x.setAuthenticatedUser);

  const emailInputRef = useRef<null | HTMLInputElement>(null);
  const passwordInputRef = useRef<null | HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Set when login is refused because the email isn't verified yet
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const [login, { loading }] = useMutation<LoginMutationResult>(LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnverifiedEmail(null);

    const email = emailInputRef.current?.value.trim() ?? "";
    const password = passwordInputRef.current?.value ?? "";

    if (!email || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    try {
      const { data } = await login({ variables: { email, password } });
      const result = data?.login;

      if (!result?.success || !result.token || !result.user) {
        setErrorMessage(result?.message || "Invalid email or password.");
        return;
      }

      setAuthenticatedUser({ token: result.token, user: result.user });
      toast('Authentication successfull')
      void router.push("/home");
    } catch (error) {
      if (getErrorCode(error) === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email);
      setErrorMessage(
        error instanceof Error ? error.message : "Login failed. Please try again.",
      );
      toast('Authentication failed')
    }
  };

  const handleGoogleClick = () => {
    setErrorMessage("Social login isn't available yet.");
  };

  return (
    <AuthLayout
      headline="Welcome back. Your streak is waiting."
      subtext="Pick up right where you left off — real UGSL video lessons, at your own pace."
    >
      <h2 className="text-3xl font-bold text-gray-900">Log in</h2>
      <p className="mt-1 text-sm text-gray-500">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-orange-500 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            ref={emailInputRef}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-gray-500 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput ref={passwordInputRef} placeholder="••••••••" />
        </div>

        {errorMessage && (
          <p className="text-sm font-bold text-red-500">{errorMessage}</p>
        )}
        {unverifiedEmail && <ResendVerificationButton email={unverifiedEmail} />}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      {/* <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or continue with
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <GoogleLogoSvg className="h-4 w-4" /> Google
      </button> */}
    </AuthLayout>
  );
};

export default LoginPage;

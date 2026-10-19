import type { NextPage } from "next";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "~/components/auth/AuthLayout";
import { PasswordInput } from "~/components/auth/PasswordInput";
import { ResendVerificationButton } from "~/components/auth/ResendVerificationButton";
import { GoogleLogoSvg } from "~/components/LoginScreen";
import { REGISTER } from "~/gql/mutations";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
};

type RegisterMutationResult = {
  register: {
    success: boolean;
    message: string | null;
    user: AuthUser | null;
  };
};

const SignupPage: NextPage = () => {
  const [registered, setRegistered] = useState<{ email: string; message: string } | null>(null);

  const nameInputRef = useRef<null | HTMLInputElement>(null);
  const usernameInputRef = useRef<null | HTMLInputElement>(null);
  const emailInputRef = useRef<null | HTMLInputElement>(null);
  const passwordInputRef = useRef<null | HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [register, { loading: registerLoading }] =
    useMutation<RegisterMutationResult>(REGISTER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = nameInputRef.current?.value.trim() ?? "";
    const username = usernameInputRef.current?.value.trim() ?? "";
    const email = emailInputRef.current?.value.trim() ?? "";
    const password = passwordInputRef.current?.value ?? "";

    if (!name || !username || !email || !password) {
      setErrorMessage("Fill in your name, username, email, and password.");
      return;
    }

    try {
      const { data: registerData } = await register({
        variables: { payload: { name, username, email, password } },
      });
      const registerResult = registerData?.register;

      if (!registerResult?.success) {
        setErrorMessage(
          registerResult?.message || "Could not create your account.",
        );
        return;
      }

      // New accounts must verify their email before they can log in
      setRegistered({
        email,
        message: registerResult.message || "We've sent a verification link to your email.",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registration failed. Please try again.",
      );
    }
  };

  const handleGoogleClick = () => {
    setErrorMessage("Social login isn't available yet.");
  };

  const saving = registerLoading;

  if (registered) {
    return (
      <AuthLayout
        headline="Almost there — check your inbox."
        subtext="Verify your email to unlock your UGSL lessons."
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <MailCheck className="h-6 w-6 text-orange-500" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Check your email</h2>
        <p className="mt-2 text-sm text-gray-500">{registered.message}</p>
        <p className="mt-2 text-sm text-gray-500">
          We sent it to <span className="font-semibold text-gray-700">{registered.email}</span>.
          Open the link in the email to verify your account, then log in. The link expires
          in 24 hours.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-xl bg-orange-500 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-600"
          >
            Go to log in
          </Link>
          <ResendVerificationButton email={registered.email} />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline="Start signing today — it's free."
      subtext="Real UGSL video lessons, bite-sized and gamified. No credit card, just five minutes."
    >
      <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
      <p className="mt-1 text-sm text-gray-500">
        Already have one?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-500 hover:underline"
        >
          Log in
        </Link>
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            ref={nameInputRef}
            placeholder="Your name"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            ref={usernameInputRef}
            placeholder="username"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <PasswordInput ref={passwordInputRef} placeholder="••••••••" />
        </div>

        {errorMessage && (
          <p className="text-sm font-bold text-red-500">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? "Creating account..." : "Get Started"}
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

export default SignupPage;

import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { AuthLayout } from "~/components/auth/AuthLayout";
import { ResendVerificationButton } from "~/components/auth/ResendVerificationButton";
import { VERIFY_EMAIL } from "~/gql/mutations";
import { toFriendlyErrorMessage } from "~/utils/errors";

type VerifyEmailResult = {
  verifyEmail: { success: boolean; message: string };
};

type Status = "verifying" | "success" | "error";

// Landing page for the link in the verification email: /verify-email?token=…
const VerifyEmailPage: NextPage = () => {
  const router = useRouter();
  const [verifyEmail] = useMutation<VerifyEmailResult>(VERIFY_EMAIL);
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your email…");
  const [resendEmail, setResendEmail] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!router.isReady || started.current) return;
    started.current = true;

    const token = typeof router.query.token === "string" ? router.query.token : "";
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token. Request a new one below.");
      return;
    }

    verifyEmail({ variables: { token } })
      .then(({ data }) => {
        setStatus(data?.verifyEmail.success ? "success" : "error");
        setMessage(data?.verifyEmail.message ?? "Your email is verified.");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(toFriendlyErrorMessage(error, "We couldn't verify your email."));
      });
  }, [router.isReady, router.query.token, verifyEmail]);

  return (
    <AuthLayout
      headline="One last step."
      subtext="Verifying your email keeps your account and progress safe."
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
        {status === "verifying" && <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />}
        {status === "success" && <CircleCheck className="h-6 w-6 text-green-600" />}
        {status === "error" && <CircleX className="h-6 w-6 text-red-500" />}
      </div>
      <h2 className="mt-4 text-3xl font-bold text-gray-900">
        {status === "verifying" && "Verifying…"}
        {status === "success" && "Email verified"}
        {status === "error" && "Verification failed"}
      </h2>
      <p className="mt-2 text-sm text-gray-500">{message}</p>

      {status === "success" && (
        <Link
          href="/login"
          className="mt-6 block w-full rounded-xl bg-orange-500 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-600"
        >
          Log in
        </Link>
      )}

      {status === "error" && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="block text-sm font-medium text-gray-700">
            Email address
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value.trim())}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-normal text-gray-900 placeholder:text-gray-400"
            />
          </label>
          <ResendVerificationButton email={resendEmail} />
          <Link href="/login" className="text-center text-sm font-semibold text-orange-500 hover:underline">
            Back to log in
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};

export default VerifyEmailPage;

import type { NextPage } from "next";
import Link from "next/link";
import { HexagonLogoSvg } from "~/components/LoginScreen";

const ForgotPassword: NextPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 p-8">
      <header className="flex items-center gap-2 text-gray-800">
        <HexagonLogoSvg className="h-8 w-8 text-blue-500" />
        <span className="text-xl font-bold">UGSL Learn</span>
      </header>
      <div className="flex grow items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <p className="text-sm text-gray-400">Please enter your details</p>
          <h2 className="mb-6 text-3xl font-bold text-gray-900">
            Forgot password
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            We will send you instructions on how to reset your password by
            email.
          </p>
          <div className="flex flex-col gap-4">
            <input
              className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400"
              placeholder="Email address"
              type="email"
            />
          </div>
          <button className="mt-6 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white transition hover:bg-blue-600">
            Submit
          </button>
          <p className="mt-6 text-center text-sm text-gray-500">
            Remembered your password?{" "}
            <Link
              className="font-semibold text-blue-500 hover:underline"
              href="/?login"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

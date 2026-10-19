import Link from "next/link";
import { CloseSvg } from "./Svgs";
import type { ComponentProps } from "react";
import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useRouter } from "next/router";
import { LOGIN, REGISTER } from "~/gql/mutations";

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

type RegisterMutationResult = {
  register: {
    success: boolean;
    message: string | null;
    user: AuthUser | null;
  };
};

export const HexagonLogoSvg = (props: ComponentProps<"svg">) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 7L12 12L21 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

export const GoogleLogoSvg = (props: ComponentProps<"svg">) => {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        ></path>
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        ></path>
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        ></path>
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        ></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
      </g>
    </svg>
  );
};

export type LoginScreenState = "HIDDEN" | "LOGIN" | "SIGNUP";

export const useLoginScreen = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const queryState: LoginScreenState = (() => {
    if (loggedIn) return "HIDDEN";
    if ("login" in router.query) return "LOGIN";
    if ("sign-up" in router.query) return "SIGNUP";
    return "HIDDEN";
  })();
  const [loginScreenState, setLoginScreenState] = useState(queryState);
  useEffect(() => setLoginScreenState(queryState), [queryState]);
  return { loginScreenState, setLoginScreenState };
};

export const LoginScreen = ({
  loginScreenState,
  setLoginScreenState,
}: {
  loginScreenState: LoginScreenState;
  setLoginScreenState: React.Dispatch<React.SetStateAction<LoginScreenState>>;
}) => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const setAuthenticatedUser = useBoundStore((x) => x.setAuthenticatedUser);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<null | HTMLInputElement>(null);
  const usernameInputRef = useRef<null | HTMLInputElement>(null);
  const emailInputRef = useRef<null | HTMLInputElement>(null);
  const passwordInputRef = useRef<null | HTMLInputElement>(null);

  const [login, { loading: loginLoading }] =
    useMutation<LoginMutationResult>(LOGIN);
  const [register, { loading: registerLoading }] =
    useMutation<RegisterMutationResult>(REGISTER);

  useEffect(() => {
    if (loginScreenState !== "HIDDEN" && loggedIn) {
      setLoginScreenState("HIDDEN");
    }
  }, [loginScreenState, loggedIn, setLoginScreenState]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const email = emailInputRef.current?.value.trim() ?? "";
    const password = passwordInputRef.current?.value ?? "";

    if (loginScreenState === "SIGNUP") {
      const name = nameInputRef.current?.value.trim() ?? "";
      const username = usernameInputRef.current?.value.trim() ?? "";

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

        const { data: loginData } = await login({ variables: { email, password } });
        const loginResult = loginData?.login;

        if (!loginResult?.success || !loginResult.token || !loginResult.user) {
          setErrorMessage("Account created — please log in.");
          setLoginScreenState("LOGIN");
          return;
        }

        setAuthenticatedUser({ token: loginResult.token, user: loginResult.user });
        void router.push("/learn");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Registration failed. Please try again.",
        );
      }
      return;
    }

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
      void router.push("/learn");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login failed. Please try again.",
      );
    }
  };

  const handleSocialLoginClick = () => {
    setErrorMessage("Social login isn't available yet.");
  };

  return (
    <article
      className={[
        "fixed inset-0 z-30 flex flex-col bg-gray-50 p-8 transition duration-300",
        loginScreenState === "HIDDEN"
          ? "pointer-events-none opacity-0"
          : "opacity-100",
      ].join(" ")}
      aria-hidden={!loginScreenState}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <HexagonLogoSvg className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold">UGSL Learn</span>
        </div>
        <button
          className="flex text-gray-400"
          onClick={() => setLoginScreenState("HIDDEN")}
        >
          <CloseSvg />
          <span className="sr-only">Close</span>
        </button>
      </header>
      <div className="flex grow items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <p className="text-sm text-gray-400">Please enter your details</p>
          <h2 className="mb-6 text-3xl font-bold text-gray-900">
            {loginScreenState === "LOGIN" ? "Welcome back" : "Create your account"}
          </h2>
          <div className="flex flex-col gap-4">
            {loginScreenState === "SIGNUP" && (
              <>
                <input
                  className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400"
                  placeholder="Name"
                  ref={nameInputRef}
                />
                <input
                  className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400"
                  placeholder="Username"
                  ref={usernameInputRef}
                />
              </>
            )}
            <input
              className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400"
              placeholder="Email address"
              type="email"
              ref={emailInputRef}
            />
            <input
              className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400"
              placeholder="Password"
              type="password"
              ref={passwordInputRef}
            />
            {loginScreenState === "LOGIN" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-500"
                  />
                  Remember for 30 days
                </label>
                <Link
                  className="font-medium text-blue-500 hover:underline"
                  href="/forgot-password"
                >
                  Forgot password
                </Link>
              </div>
            )}
            {errorMessage && (
              <p className="text-sm font-bold text-red-500">{errorMessage}</p>
            )}
          </div>
          <button
            className="mt-6 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={loginLoading || registerLoading}
          >
            {loginScreenState === "LOGIN"
              ? loginLoading
                ? "Logging in..."
                : "Log in"
              : registerLoading || loginLoading
                ? "Creating account..."
                : "Create account"}
          </button>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            onClick={handleSocialLoginClick}
          >
            <GoogleLogoSvg className="h-5 w-5" /> Sign in with Google
          </button>
          <p className="mt-6 text-center text-sm text-gray-500">
            {loginScreenState === "LOGIN"
              ? "Don't have an account?"
              : "Have an account?"}{" "}
            <button
              className="font-semibold text-blue-500 hover:underline"
              onClick={() =>
                setLoginScreenState((x) => (x === "LOGIN" ? "SIGNUP" : "LOGIN"))
              }
            >
              {loginScreenState === "LOGIN" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </article>
  );
};

import Link from "next/link";
import type { PropsWithChildren } from "react";

export const AuthLayout = ({
  headline,
  subtext,
  children,
}: PropsWithChildren<{ headline: string; subtext: string }>) => {
  return (
    <div className="flex min-h-screen bg-[#f4f1ec]">
      <div className="hidden w-full max-w-md flex-col justify-between bg-[#2b2f5c] px-10 py-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold">
            4
          </div>
          <span className="text-lg font-bold">
            UGSL <span className="text-orange-400">Learn</span>
          </span>
        </Link>

        <div>
          <h1 className="text-4xl font-bold leading-tight">{headline}</h1>
          <p className="mt-4 text-indigo-200">{subtext}</p>

          <div className="mt-8 rounded-2xl bg-white/10 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">
                A
              </div>
              <div>
                <p className="text-sm italic">
                  &quot;I learned to introduce myself in UGSL in a week.&quot;
                </p>
                <p className="mt-1 text-xs text-indigo-300">
                  Aisha, learner since 2026
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-indigo-300">
          © {new Date().getFullYear()} UGSL Learn
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

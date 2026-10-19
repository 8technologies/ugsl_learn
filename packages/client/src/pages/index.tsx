import { type NextPage } from "next";
import Link from "next/link";
import React from "react";
import { BarChart3, Bookmark, ChevronRight, Hand, Play, Video } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About UGSL", href: "#" },
] as const;

const FEATURES = [
  {
    icon: Video,
    iconBg: "bg-orange-100 text-orange-500",
    title: "Real signing video",
    description:
      "Every lesson is filmed with real UGSL signers — not illustrations — with slow-motion and replay built in.",
  },
  {
    icon: BarChart3,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "Bite-sized, gamified path",
    description:
      "Short modules, streaks, and XP keep you coming back — structured from Beginner to Advanced.",
  },
  {
    icon: Bookmark,
    iconBg: "bg-indigo-100 text-indigo-600",
    title: "Searchable dictionary",
    description:
      "Look up any sign instantly and save it to Favourites for quick review before you need it.",
  },
] as const;

const STEPS = [
  {
    title: "Watch a sign",
    description: "Real video, slow-motion on tap.",
  },
  {
    title: "Practice it back",
    description: "Match, recall, or record yourself signing.",
  },
  {
    title: "Build your streak",
    description: "A few minutes a day, tracked and rewarded.",
  },
] as const;

const LandingPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#f4f1ec] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold text-white">
              4
            </div>
            <span className="text-lg font-bold">
              UGSL <span className="text-orange-500">Learn</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-gray-900">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#2b2f5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#232650]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
              Free · Built for Uganda
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Learn Ugandan Sign Language, one sign at a time.
            </h1>
            <p className="mt-4 max-w-md text-gray-600">
              Real UGSL videos, bite-sized lessons, and daily practice that
              actually sticks — built with the Uganda National Association of
              the Deaf.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link
                href="/signup"
                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Start learning free
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                <ChevronRight className="h-4 w-4" />
                See how it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-8">
              <div>
                <div className="text-2xl font-bold">1,200+</div>
                <div className="text-xs text-gray-500">signs taught</div>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div>
                <div className="text-2xl font-bold">Free</div>
                <div className="text-xs text-gray-500">forever, no ads</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#1c1f3b] shadow-xl">
            <div className="flex items-center gap-1.5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
            </div>
            <div className="flex aspect-video flex-col items-center justify-center gap-3 text-white">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label="Play preview"
              >
                <Play className="h-6 w-6" />
              </button>
              <span className="text-sm text-indigo-200">
                Watch a 30-second preview
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">
            Everything you need to actually learn
          </h2>
          <p className="mt-3 text-gray-600">
            Not a dictionary you&apos;ll forget to open. A daily habit that
            builds real fluency.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, iconBg, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div
                className={[
                  "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
                  iconBg,
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 items-center gap-10 rounded-2xl border border-gray-200 bg-white p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">How it works</h2>
            <div className="mt-6 flex flex-col gap-6">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2b2f5c] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {step.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex h-56 w-56 items-center justify-center rounded-full bg-[#f4f1ec]">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#2b2f5c] text-orange-400">
                <Hand className="h-12 w-12" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#2b2f5c] p-10 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">
              Start signing today — it&apos;s free.
            </h2>
            <p className="mt-1 text-indigo-200">
              No credit card. Just 5 minutes and your first lesson.
            </p>
          </div>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            Get Started
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500 sm:flex-row">
          <span>© 2026 UGSL Learn · Built with UCC and UNAD</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-700">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-700">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

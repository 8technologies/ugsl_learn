import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { BookOpen, Heart, Play, Type, Zap } from "lucide-react";
import { AppShell } from "~/components/AppShell";
import { CompleteProfilePrompt } from "~/components/CompleteProfilePrompt";
import { useBoundStore } from "~/hooks/useBoundStore";
import { HOME_DASHBOARD_MOCK } from "~/data/homeDashboardMock";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const QUICK_LINKS = [
  { label: "Fingerspelling", icon: Type, href: "/signs" },
  { label: "Dictionary", icon: BookOpen, href: "/signs" },
  { label: "Favourites", icon: Heart, href: "/favourites" },
] as const;

const HomePage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);
  const name = useBoundStore((x) => x.name);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  const { continueLesson, stats, dailyChallenge } = HOME_DASHBOARD_MOCK;
  const progressPercent = Math.round(
    (continueLesson.lessonNumber / continueLesson.totalLessons) * 100,
  );
  const challengePercent = Math.round(
    (dailyChallenge.done / dailyChallenge.total) * 100,
  );

  return (
    <AppShell>
      <CompleteProfilePrompt />
      <h1 className="text-3xl font-bold text-gray-900">
        {getGreeting()}, {name || "there"}
      </h1>
      <p className="mt-1 text-gray-500">Ready to continue learning UGSL?</p>

      <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-2xl bg-[#2b2f5c] text-white lg:grid-cols-[1.4fr_1fr]">
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">
            Continue Learning
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] normal-case text-white">
              {continueLesson.levelName}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{continueLesson.moduleName}</h2>
          <p className="mt-1 text-sm text-indigo-200">
            Lesson {continueLesson.lessonNumber} · {continueLesson.lessonTitle}
          </p>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs text-indigo-200">
              <span>Lesson progress</span>
              <span>
                {continueLesson.lessonNumber} of {continueLesson.totalLessons} ·{" "}
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Continue Lesson
            </button>
            <span className="flex items-center gap-1 text-sm font-semibold text-orange-300">
              <Zap className="h-4 w-4" />+{continueLesson.xpReward} XP
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 bg-[#23264f] p-6 text-center">
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Play video"
          >
            <Play className="h-6 w-6" />
          </button>
          <div>
            <div className="font-semibold">{continueLesson.videoLabel}</div>
            <div className="text-xs text-indigo-200">
              Tap to watch at normal or slow speed
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700">
          ✓ {stats.lessonsCompleted} lessons completed
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700">
          Level: <span className="font-bold">{stats.level}</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700">
          ~{stats.minutesLeftToday} min left today
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map(({ label, icon: Icon, href }) => (
          <button
            key={label}
            type="button"
            onClick={() => void router.push(href)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-8 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Icon className="h-6 w-6 text-gray-500" />
            {label}
          </button>
        ))}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-orange-500">
            <Zap className="h-3.5 w-3.5" />
            Daily Challenge
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {dailyChallenge.title}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${challengePercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {dailyChallenge.done} of {dailyChallenge.total} done · +
            {dailyChallenge.xpReward} XP on completion
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default HomePage;

import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Check, Lock, Play } from "lucide-react";
import { AppShell } from "~/components/AppShell";
import { useBoundStore } from "~/hooks/useBoundStore";
import type { LearningNode, LearningNodeStatus, LearningUnit } from "~/data/learningPathMock";
import { LOAD_MODULES_TABLE } from "~/gql/lessons";
import { useQuery } from "@apollo/client/react";

type LearnTab = "path" | "modules";

type PathModule = {
  id: string;
  title: string;
  sequence: number;
  status: string;
  lessons: { id: string; title: string; sequence: number; xpReward: number; status: string }[] | null;
};

type PathModulesResult = { modules: PathModule[] };

// Turns modules from the server into the sections + nodes the path view draws.
// There's no learner progress query yet, so every learner is treated as new:
// the first lesson is "current" and everything after it is locked.
const toLearningPath = (modules: PathModule[]): LearningUnit[] => {
  const ordered = [...modules].sort((a, b) => a.sequence - b.sequence);
  return ordered.map((module, moduleIndex) => {
    const lessons = (module.lessons ?? [])
      .filter((lesson) => lesson.status === "published")
      .sort((a, b) => a.sequence - b.sequence);
    return {
      id: module.id,
      unitLabel: `Module ${moduleIndex + 1}`,
      title: module.title,
      doneCount: 0,
      totalCount: lessons.length,
      locked: moduleIndex > 0,
      nodes: lessons.map(
        (lesson, lessonIndex): LearningNode => ({
          id: lesson.id,
          label: lesson.title,
          xp: lesson.xpReward,
          status: moduleIndex === 0 && lessonIndex === 0 ? "current" : "locked",
        }),
      ),
    };
  });
};

const lessonHref = (lessonId: string) => ({ pathname: "/lesson", query: { id: lessonId } });

const nodePosition =(globalIndex: number): "center" | "left" | "right" =>
  (["center", "left", "right"] as const)[globalIndex % 3] ?? "center";

const nodeOffsetClassName: Record<"center" | "left" | "right", string> = {
  center: "",
  left: "-translate-x-24 sm:-translate-x-32",
  right: "translate-x-24 sm:translate-x-32",
};

const NodeCircle = ({ status }: { status: LearningNodeStatus }) => {
  if (status === "done") {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
        <Check className="h-7 w-7" />
      </div>
    );
  }
  if (status === "current") {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-4 ring-orange-200">
        <Play className="h-6 w-6" />
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-400">
      <Lock className="h-6 w-6" />
    </div>
  );
};

const LearningPathView = ({ units }: { units: LearningUnit[] }) => {
  let globalIndex = 0;
  console.log(units);

  return (
    <div className="flex flex-col gap-10">
      {units.map((unit) => (
        <div key={unit.id}>
          <div className="flex items-center justify-between rounded-2xl bg-[#2b2f5c] px-6 py-4 text-white">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                {unit.unitLabel}
              </div>
              <div className="text-lg font-bold">{unit.title}</div>
            </div>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-bold",
                unit.locked
                  ? "bg-white/10 text-indigo-200"
                  : "bg-orange-500 text-white",
              ].join(" ")}
            >
              {unit.locked ? "Locked" : `${unit.doneCount} of ${unit.totalCount} done`}
            </span>
          </div>

          <div className="relative mx-auto mt-10 flex max-w-md flex-col items-center gap-10">
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l-2 border-dashed border-gray-300" />
            {unit.nodes.map((node: LearningNode) => {
              const position = nodePosition(globalIndex);
              globalIndex += 1;
              const nodeContent = (
                <>
                  <NodeCircle status={node.status} />
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-900">
                      {node.label}
                    </div>
                    <div
                      className={[
                        "text-xs font-semibold",
                        node.status === "current"
                          ? "text-orange-500"
                          : "text-gray-400",
                      ].join(" ")}
                    >
                      {node.status === "current"
                        ? `Start · +${node.xp} XP`
                        : `+${node.xp} XP`}
                    </div>
                  </div>
                </>
              );
              const nodeClassName = [
                "relative flex flex-col items-center gap-2",
                nodeOffsetClassName[position],
              ].join(" ");
              // Locked lessons can't be opened yet
              return node.status === "locked" ? (
                <div key={node.id} className={nodeClassName}>
                  {nodeContent}
                </div>
              ) : (
                <Link
                  key={node.id}
                  href={lessonHref(node.id)}
                  className={`${nodeClassName} rounded-2xl transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500`}
                >
                  {nodeContent}
                </Link>
              ); 
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ModuleListView = ({ units }: { units: LearningUnit[] }) => (
  <div className="flex flex-col gap-4">
    {units.map((unit) => (
      <div
        key={unit.id}
        className="rounded-2xl border border-gray-200 bg-white p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {unit.unitLabel}
            </div>
            <div className="text-lg font-bold text-gray-900">{unit.title}</div>
          </div>
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-bold",
              unit.locked
                ? "bg-gray-100 text-gray-500"
                : "bg-orange-100 text-orange-600",
            ].join(" ")}
          >
            {unit.locked ? "Locked" : `${unit.doneCount} of ${unit.totalCount} done`}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-gray-100">
          {unit.nodes.map((node) => (
            <div
              key={node.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <div className="flex items-center gap-3">
                {node.status === "done" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : node.status === "current" ? (
                  <Play className="h-4 w-4 text-orange-500" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-300" />
                )}
                {node.status === "locked" ? (
                  <span className="font-semibold text-gray-800">{node.label}</span>
                ) : (
                  <Link
                    href={lessonHref(node.id)}
                    className="font-semibold text-gray-800 hover:text-orange-500 hover:underline"
                  >
                    {node.label}
                  </Link>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-400">
                +{node.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const LearnPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);
  const [tab, setTab] = useState<LearnTab>("path");

  // Hooks must run before the early return below, on every render
  const {
    data: modulesData,
    loading: modulesLoading,
    error: modulesError,
  } = useQuery<PathModulesResult>(LOAD_MODULES_TABLE, {
    // Learners only see published content
    variables: { limit: 100, offset: 0, status: "published" },
    skip: !loggedIn,
    fetchPolicy: "network-only",
  });
  const units = toLearningPath(modulesData?.modules ?? []);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Your Learning Path</h1>
      <p className="mt-1 text-gray-500">
        Follow the UGSL curriculum from Beginner to Advanced
      </p>

      <div className="mt-6 flex gap-6  text-sm font-semibold">
        {/* <button
          type="button"
          onClick={() => setTab("path")}
          className={[
            "border-b-2 pb-3",
            tab === "path"
              ? "border-orange-500 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600",
          ].join(" ")}
        >
          Learning Path
        </button> */}
        <button
          type="button"
          onClick={() => setTab("modules")}
          className={[
            "border-b-2 pb-3",
            tab === "modules"
              ? "border-orange-500 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600",
          ].join(" ")}
        >
          Module List
        </button>
      </div>

      <div className="mt-8">
        {modulesLoading ? (
          <p className="py-10 text-center text-gray-400">Loading your learning path…</p>
        ) : modulesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {modulesError.message}
          </div>
        ) : units.length === 0 ? (
          <p className="py-10 text-center text-gray-500">No lessons are published yet. Check back soon!</p>
        ) : tab === "path" ? (
          <ModuleListView units={units} />
        ) : (
          
          <LearningPathView units={units} />
        )}
      </div>
    </AppShell>
  );
};

export default LearnPage;

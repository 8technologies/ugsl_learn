import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Check, Lock, Play } from "lucide-react";
import { AppShell } from "~/components/AppShell";
import { useBoundStore } from "~/hooks/useBoundStore";
import {
  LEARNING_PATH_MOCK,
  type LearningNode,
  type LearningNodeStatus,
} from "~/data/learningPathMock";
import { LOAD_MODULES } from "~/gql/lessons";
import { useQuery } from "@apollo/client/react";

type LearnTab = "path" | "modules";

const nodePosition = (globalIndex: number): "center" | "left" | "right" =>
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

const LearningPathView = () => {
  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-10">
      {LEARNING_PATH_MOCK.map((unit) => (
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
              return (
                <div
                  key={node.id}
                  className={[
                    "relative flex flex-col items-center gap-2",
                    nodeOffsetClassName[position],
                  ].join(" ")}
                >
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ModuleListView = () => (
  <div className="flex flex-col gap-4">
    {LEARNING_PATH_MOCK.map((unit) => (
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
                <span className="font-semibold text-gray-800">{node.label}</span>
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

      <div className="mt-6 flex gap-6 border-b border-gray-200 text-sm font-semibold">
        <button
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
        </button>
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
        {tab === "path" ? <LearningPathView /> : <ModuleListView />}
      </div>
    </AppShell>
  );
};

export default LearnPage;

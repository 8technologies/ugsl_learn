import { ChevronDown, ChevronLeft, ChevronRight, List, Pencil, Plus, Search } from "lucide-react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { AppShell } from "~/components/AppShell";
import { ModuleFormDialog, type ModuleFormValues } from "~/components/content/ModuleFormDialog";
import { CONTENT_STATUSES, StatusPill, statusLabel } from "~/components/content/StatusPill";
import { useBoundStore } from "~/hooks/useBoundStore";
import { LOAD_LEVELS, LOAD_MODULES_TABLE } from "~/gql/lessons";

const PAGE_SIZE = 10;

type Level = {
  id: string;
  name: string;
};

type Module = ModuleFormValues & {
  requiresModule: { id: string; title: string } | null;
  unitCount: number;
  lessons: { id: string }[] | null;
};

type LevelsQueryResult = { levels: Level[] };
type ModulesQueryResult = { modules: Module[] };

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// A select styled as a "Label: Value ⌄" pill, like the filters in the design
const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => {
  const selected = options.find((o) => o.value === value)?.label ?? "All";
  return (
    <label className="relative flex cursor-pointer items-center gap-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-600 transition hover:bg-gray-50">
      {label}:
      <span className="font-semibold capitalize text-gray-900">{selected}</span>
      <ChevronDown className="h-4 w-4 text-gray-500" />
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};

const ModulesPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: levelsData } = useQuery<LevelsQueryResult>(LOAD_LEVELS, {
    variables: { limit: 100, offset: 0 },
    fetchPolicy: "network-only",
  });
  const levels = levelsData?.levels ?? [];
  const levelName = (levelId: number) =>
    levels.find((level) => Number(level.id) === levelId)?.name ?? "—";

  const {
    data: modulesData,
    loading: modulesLoading,
    error: modulesError,
    refetch,
  } = useQuery<ModulesQueryResult>(LOAD_MODULES_TABLE, {
    variables: {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search.trim() || undefined,
      levelId: levelFilter ? Number(levelFilter) : undefined,
      status: statusFilter || undefined,
    },
    fetchPolicy: "network-only",
  });
  const modules = modulesData?.modules ?? [];
  const hasNextPage = modules.length === PAGE_SIZE;
  const firstShown = page * PAGE_SIZE + 1;
  const lastShown = page * PAGE_SIZE + modules.length;

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  const openForm = (module: Module | null) => {
    setEditingModule(module);
    setIsFormOpen(true);
  };

  const headCell = "px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500";

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modules</h1>
            <p className="mt-1 text-sm text-gray-500">
              Modules are the sections of the learner&apos;s path, like Alphabet or Numbers. Open a
              module&apos;s lessons to add or edit content.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openForm(null)}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New module
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400"
              placeholder="Search modules…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <FilterSelect
            label="Level"
            value={levelFilter}
            onChange={(value) => {
              setLevelFilter(value);
              setPage(0);
            }}
            options={levels.map((level) => ({ value: level.id, label: level.name }))}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
            options={CONTENT_STATUSES.map((status) => ({ value: status, label: statusLabel(status) }))}
          />
          {!modulesLoading && (
            <span className="ml-auto text-sm text-gray-500">
              {modules.length} {modules.length === 1 ? "module" : "modules"}
              {(page > 0 || hasNextPage) && " on this page"}
            </span>
          )}
        </div>

        {modulesError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {getErrorMessage(modulesError, "Failed to load modules.")}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={headCell}>Module</th>
                  <th className={headCell}>Level</th>
                  <th className={headCell}>Lessons</th>
                  <th className={headCell}>Units</th>
                  <th className={headCell}>XP</th>
                  <th className={headCell}>Unlocks after</th>
                  <th className={headCell}>Status</th>
                  <th className={`${headCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modulesLoading ? (
                  <tr>
                    <td className="py-12 text-center text-gray-400" colSpan={8}>
                      Loading modules…
                    </td>
                  </tr>
                ) : modules.length === 0 ? (
                  <tr>
                    <td className="py-12 text-center text-gray-400" colSpan={8}>
                      {search || levelFilter || statusFilter
                        ? "No modules match your filters."
                        : 'No modules yet. Click "New module" to add one.'}
                    </td>
                  </tr>
                ) : (
                  modules.map((module) => {
                    const lessonCount = module.lessons?.length ?? 0;
                    return (
                      <tr
                        key={module.id}
                        className="border-b border-gray-100 transition last:border-0 hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4 font-semibold text-gray-900">{module.title}</td>
                        <td className="px-5 py-4 text-gray-700">{levelName(module.levelId)}</td>
                        <td className={`px-5 py-4 ${lessonCount ? "text-gray-700" : "text-gray-400"}`}>
                          {lessonCount}
                        </td>
                        <td className={`px-5 py-4 ${module.unitCount ? "text-gray-700" : "text-gray-400"}`}>
                          {module.unitCount}
                        </td>
                        <td className="px-5 py-4 text-gray-700">{module.xpReward}</td>
                        <td className="px-5 py-4 text-gray-700">
                          {module.requiresModule?.title ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={module.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/content/modules/${module.id}`}
                              className="flex items-center gap-1.5 rounded-lg border border-[#2b2f5c] px-3.5 py-1.5 text-xs font-semibold text-[#2b2f5c] transition hover:bg-[#2b2f5c] hover:text-white"
                            >
                              <List className="h-3.5 w-3.5" />
                              Lessons
                            </Link>
                            <button
                              type="button"
                              onClick={() => openForm(module)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                              aria-label={`Edit ${module.title}`}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            <span>{modules.length ? `Showing ${firstShown}–${lastShown}` : "Showing 0"}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <ModuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        module={editingModule}
        levels={levels}
        defaultLevelId={levelFilter}
        onSaved={() => void refetch()}
      />
    </AppShell>
  );
};

export default ModulesPage;

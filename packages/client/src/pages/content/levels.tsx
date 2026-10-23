import { ChevronLeft, ChevronRight, Layers, Pencil, Plus, Search } from "lucide-react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { AppShell } from "~/components/AppShell";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormField } from "~/components/ui/form-field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useBoundStore } from "~/hooks/useBoundStore";
import { LOAD_LEVELS_WITH_MODULES, SAVE_LEVEL } from "~/gql/lessons";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["draft", "published", "archived"] as const;
const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"] as const;

type Level = {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  sequence: number;
  status: string;
  updatedAt: string;
  modules: { id: string }[] | null;
};

type LevelsQueryResult = { levels: Level[] };
type SaveLevelResult = { saveLevel: { success: boolean; message: string } };

type LevelFormState = {
  id: string | null;
  name: string;
  description: string;
  difficulty: string;
  sequence: string;
  status: string;
};

const emptyForm: LevelFormState = {
  id: null,
  name: "",
  description: "",
  difficulty: "beginner",
  sequence: "",
  status: "draft",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusBadgeClass: Record<string, string> = {
  published: "bg-green-50 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-amber-50 text-amber-700",
};

const difficultyBadgeClass: Record<string, string> = {
  beginner: "bg-sky-50 text-sky-700",
  intermediate: "bg-indigo-50 text-indigo-700",
  advanced: "bg-purple-50 text-purple-700",
};

const selectClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900";

const LevelsPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState<LevelFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<LevelsQueryResult>(LOAD_LEVELS_WITH_MODULES, {
    variables: {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
    },
    fetchPolicy: "network-only",
  });
  const levels = data?.levels ?? [];
  const hasNextPage = levels.length === PAGE_SIZE;

  const [saveLevel, { loading: saving }] = useMutation<SaveLevelResult>(SAVE_LEVEL);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  const isEditing = form.id !== null;

  const openCreateForm = () => {
    // Suggest the next position after the levels currently shown
    const nextSequence = levels.reduce((max, level) => Math.max(max, level.sequence), 0) + 1;
    setForm({ ...emptyForm, sequence: String(nextSequence) });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const openEditForm = (level: Level) => {
    setForm({
      id: level.id,
      name: level.name,
      description: level.description ?? "",
      difficulty: level.difficulty,
      sequence: String(level.sequence),
      status: level.status,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const { data: result } = await saveLevel({
        variables: {
          input: {
            ...(form.id ? { id: form.id } : {}),
            name: form.name.trim(),
            description: form.description.trim() || null,
            difficulty: form.difficulty,
            sequence: Number(form.sequence),
            status: form.status,
          },
        },
      });

      if (!result?.saveLevel.success) {
        setErrorMessage(result?.saveLevel.message || "Could not save this level.");
        return;
      }

      setIsFormOpen(false);
      toast.success(result.saveLevel.message);
      void refetch();
    } catch (err) {
      const message = getErrorMessage(err, "Could not save this level.");
      // Level names are unique in the database
      setErrorMessage(
        /unique constraint/i.test(message) ? "A level with this name already exists." : message,
      );
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Levels</h1>
            <p className="mt-1 text-gray-500">
              The top of the course structure. Each level groups its{" "}
              <Link href="/content/modules-lessons" className="font-semibold text-orange-500 hover:underline">
                modules and lessons
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New level
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="Search levels"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm capitalize text-gray-700"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {getErrorMessage(error, "Failed to load levels.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Difficulty</th>
                  <th className="px-5 py-3">Modules</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={5}>
                      Loading levels…
                    </td>
                  </tr>
                ) : levels.length === 0 ? (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={5}>
                      {search || statusFilter
                        ? "No levels match your filters."
                        : 'No levels yet. Click "New level" to add the first one.'}
                    </td>
                  </tr>
                ) : (
                  levels.map((level) => (
                    <tr
                      key={level.id}
                      className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-sm font-bold text-orange-600">
                            {level.sequence}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">{level.name}</div>
                            {level.description && (
                              <div className="max-w-xs truncate text-xs text-gray-500">
                                {level.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            difficultyBadgeClass[level.difficulty] ?? "bg-gray-100 text-gray-600",
                          ].join(" ")}
                        >
                          {level.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                          <Layers className="h-3.5 w-3.5 text-gray-400" />
                          {level.modules?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            statusBadgeClass[level.status] ?? "bg-gray-100 text-gray-600",
                          ].join(" ")}
                        >
                          {level.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openEditForm(level)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            aria-label={`Edit ${level.name}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
            <span>Page {page + 1}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit level" : "New level"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
              <FormField label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alphabet Basics"
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What learners will achieve in this level"
                  maxLength={500}
                  rows={3}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Order">
                  <Input
                    type="number"
                    min={1}
                    value={form.sequence}
                    onChange={(e) => setForm({ ...form, sequence: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Difficulty">
                  <select
                    className={`${selectClass} capitalize`}
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    {DIFFICULTY_OPTIONS.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select
                    className={`${selectClass} capitalize`}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {errorMessage && <p className="text-sm font-semibold text-red-500">{errorMessage}</p>}

              <DialogFooter className="mt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create level"}
                </button>
              </DialogFooter>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default LevelsPage;

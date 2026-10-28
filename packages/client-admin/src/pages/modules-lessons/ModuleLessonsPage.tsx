import {
  Check,
  ChevronLeft,
  CircleAlert,
  Ellipsis,
  FileQuestion,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Container } from "@/components/container";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { URL_2 } from "@/config/urls";
import {
  DELETE_UNIT,
  LESSONQUIZ,
  LOAD_LESSON_UNITS,
  LOAD_LEVELS,
  LOAD_MODULE_DETAIL,
  SAVE_LESSON,
  SAVE_UNIT,
} from "@/gql/content";
import { LessonFormDialog, type LessonFormValues } from "./components/LessonFormDialog";
import { ModuleFormDialog } from "./components/ModuleFormDialog";
import { StatusPill } from "./components/StatusPill";
import { UnitFormDialog, type UnitFormValues } from "./components/UnitFormDialog";

type Lesson = LessonFormValues & {
  moduleId: number;
  updatedAt: string;
  unitCount: number;
};

type ModuleDetail = {
  id: string;
  levelId: number;
  title: string;
  description: string | null;
  sequence: number;
  xpReward: number;
  status: string;
  unitCount: number;
  level: { id: string; name: string } | null;
  requiresModule: { id: string; title: string } | null;
  lessons: Lesson[] | null;
};

type Unit = UnitFormValues & {
  lessonId: number;
  sequence: number;
  entryId: number | null;
  needsVideo: boolean;
};

type ModuleDetailResult = { module: ModuleDetail | null };
type LessonUnitsResult = { units: Unit[] };
type LevelsResult = { levels: { id: string; name: string }[] };
type LessonQuizResult = { lessonQuiz: { id: string; quizQuestions: { id: number }[] | null }[] };
type MutationResult = { success: boolean; message: string };

const NAVY = "#2b2f5c";

// Unit videos are saved by the server under public/unitsMedia/
const unitMediaUrl = (mediaRef: string) => `${URL_2}/unitsMedia/${encodeURIComponent(mediaRef)}`;

// Uploads keep their original extension (<uuid>.png, <uuid>.mp4), so the
// file name tells us whether a unit's sign is a picture or a video
const isImageMedia = (mediaRef: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(mediaRef);

// "Letter M" -> "M": the badge shows the thing being taught
const unitBadge = (title: string) => (title.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();

const relativeTime = (iso: string) => {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

// Moves the dragged item to the drop target's position
function reorder<T extends { id: string }>(items: T[], draggedId: string, targetId: string): T[] {
  const from = items.findIndex((item) => item.id === draggedId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
    <div className="mt-1 font-semibold text-gray-900">{children}</div>
  </div>
);

const ModuleLessonsPage = () => {
  const { moduleId = "" } = useParams();
  const [searchParams] = useSearchParams();

  // ?lesson=<id> opens that lesson, e.g. when coming back from its quiz
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(searchParams.get("lesson"));
  const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState<{ open: boolean; lesson: Lesson | null }>({
    open: false,
    lesson: null,
  });
  const [unitForm, setUnitForm] = useState<{ open: boolean; unit: Unit | null }>({ open: false, unit: null });
  const [playingUnit, setPlayingUnit] = useState<Unit | null>(null);
  const [menuUnitId, setMenuUnitId] = useState<string | null>(null);
  const [dragged, setDragged] = useState<{ kind: "lesson" | "unit"; id: string } | null>(null);
  const [reordering, setReordering] = useState(false);

  const {
    data: moduleData,
    loading: moduleLoading,
    error: moduleError,
    refetch: refetchModule,
  } = useQuery<ModuleDetailResult>(LOAD_MODULE_DETAIL, {
    variables: { id: moduleId },
    skip: !moduleId,
    fetchPolicy: "network-only",
  });
  const module = moduleData?.module ?? null;
  const lessons = [...(module?.lessons ?? [])].sort((a, b) => a.sequence - b.sequence);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0] ?? null;

  const { data: levelsData } = useQuery<LevelsResult>(LOAD_LEVELS, { variables: { limit: 100, offset: 0 } });

  const {
    data: unitsData,
    loading: unitsLoading,
    refetch: refetchUnits,
  } = useQuery<LessonUnitsResult>(LOAD_LESSON_UNITS, {
    variables: { lessonId: Number(selectedLesson?.id) },
    skip: !selectedLesson,
    fetchPolicy: "network-only",
  });
  const units = [...(unitsData?.units ?? [])].sort((a, b) => a.sequence - b.sequence);

  const { data: quizData } = useQuery<LessonQuizResult>(LESSONQUIZ, {
    variables: { lessonId: Number(selectedLesson?.id) },
    skip: !selectedLesson,
    fetchPolicy: "network-only",
  });
  const quiz = quizData?.lessonQuiz[0] ?? null;
  const unitsNeedingVideo = units.filter((unit) => unit.needsVideo);
  const readyCount = units.length - unitsNeedingVideo.length;

  const [saveLesson, { loading: submitting }] = useMutation<{ saveLessons: MutationResult }>(SAVE_LESSON);
  const [saveUnit] = useMutation<{ saveUnit: MutationResult }>(SAVE_UNIT);
  const [deleteUnit] = useMutation<{ deleteUnit: MutationResult }>(DELETE_UNIT);

  const refreshAll = () => {
    void refetchModule();
    if (selectedLesson) void refetchUnits();
  };

  // Saves the new order: only items whose position changed are updated
  const saveLessonOrder = async (ordered: Lesson[]) => {
    setReordering(true);
    try {
      for (const [index, lesson] of ordered.entries()) {
        if (lesson.sequence === index + 1) continue;
        await saveLesson({
          variables: {
            input: { id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, sequence: index + 1 },
          },
        });
      }
      toast.success("Lesson order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder lessons.");
    } finally {
      setReordering(false);
      void refetchModule();
    }
  };

  const saveUnitOrder = async (ordered: Unit[]) => {
    setReordering(true);
    try {
      for (const [index, unit] of ordered.entries()) {
        if (unit.sequence === index + 1) continue;
        await saveUnit({ variables: { input: { id: unit.id, sequence: index + 1 } } });
      }
      toast.success("Unit order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder units.");
    } finally {
      setReordering(false);
      void refetchUnits();
    }
  };

  const handleDrop = (kind: "lesson" | "unit", targetId: string) => {
    if (!dragged || dragged.kind !== kind || dragged.id === targetId || reordering) return;
    if (kind === "lesson") void saveLessonOrder(reorder(lessons, dragged.id, targetId));
    else void saveUnitOrder(reorder(units, dragged.id, targetId));
    setDragged(null);
  };

  const handleDeleteUnit = async (unit: Unit) => {
    setMenuUnitId(null);
    if (!window.confirm(`Delete unit "${unit.title}"?`)) return;
    try {
      const { data } = await deleteUnit({ variables: { id: unit.id } });
      toast.success(data?.deleteUnit.message ?? "Unit deleted");
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this unit.");
    }
  };

  const submitForReview = async () => {
    if (!selectedLesson) return;
    try {
      const { data } = await saveLesson({
        variables: {
          input: {
            id: selectedLesson.id,
            moduleId: selectedLesson.moduleId,
            title: selectedLesson.title,
            status: "in_review",
          },
        },
      });
      toast.success(data?.saveLessons.success ? "Lesson submitted for review" : data?.saveLessons.message);
      void refetchModule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit this lesson.");
    }
  };

  if (moduleError || (!moduleLoading && moduleId && !module)) {
    return (
      <Container>
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Module not found</h1>
          <p className="mt-2 text-sm text-gray-500">{moduleError?.message ?? "It may have been deleted."}</p>
          <Link
            to="/content/modules"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-active"
          >
            Back to modules
          </Link>
        </div>
      </Container>
    );
  }

  const canSubmit =
    !!selectedLesson && units.length > 0 && unitsNeedingVideo.length === 0 && selectedLesson.status === "draft";
  const nextLessonSequence = lessons.reduce((max, l) => Math.max(max, l.sequence), 0) + 1;
  const headCell = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500";

  return (
    <>
      <Container>
        <div className="flex flex-col gap-5 pb-8">
          {/* Breadcrumb + title */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1.5 text-sm text-gray-500">
                <ChevronLeft className="h-4 w-4" />
                <Link to="/content/modules" className="hover:text-gray-900 hover:underline">
                  Modules
                </Link>
                <span>/</span>
                <span className="font-semibold text-gray-900">{module?.title ?? "…"}</span>
              </nav>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Lessons in {module?.title ?? "…"}</h1>
              <p className="mt-1 text-sm text-gray-500">Select a lesson to see and edit its units. Drag to reorder.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModuleFormOpen(true)}
              disabled={!module}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Edit module
            </button>
          </div>

          {/* Module stats */}
          <section className="flex flex-wrap gap-x-12 gap-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
            <Stat label="Level">{module?.level?.name ?? "—"}</Stat>
            <Stat label="Lessons">{lessons.length}</Stat>
            <Stat label="Units">{module?.unitCount ?? 0}</Stat>
            <Stat label="Module XP">{module?.xpReward ?? 0}</Stat>
            <Stat label="Unlocks after">{module?.requiresModule?.title ?? "—"}</Stat>
            <Stat label="Module status">{module ? <StatusPill status={module.status} /> : "—"}</Stat>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
            {/* Lessons list */}
            <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Lessons
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-700">{lessons.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLessonForm({ open: true, lesson: null })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50"
                  aria-label="Add lesson"
                  title="Add lesson"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <ol className="flex flex-col gap-2 p-3">
                {moduleLoading && <li className="py-6 text-center text-sm text-gray-400">Loading lessons…</li>}
                {!moduleLoading && lessons.length === 0 && (
                  <li className="py-6 text-center text-sm text-gray-400">No lessons yet.</li>
                )}
                {lessons.map((lesson) => {
                  const selected = lesson.id === selectedLesson?.id;
                  return (
                    <li
                      key={lesson.id}
                      draggable={!reordering}
                      onDragStart={() => setDragged({ kind: "lesson", id: lesson.id })}
                      onDragOver={(e) => dragged?.kind === "lesson" && e.preventDefault()}
                      onDrop={() => handleDrop("lesson", lesson.id)}
                      onDragEnd={() => setDragged(null)}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedLessonId(lesson.id)}
                        className={[
                          "group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                          selected
                            ? "border-[#2b2f5c] bg-indigo-50/50 ring-1 ring-[#2b2f5c]"
                            : "border-transparent hover:bg-gray-50",
                          dragged?.id === lesson.id ? "opacity-40" : "",
                        ].join(" ")}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />
                        <span
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                            selected ? "bg-[#2b2f5c] text-white" : "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {lesson.sequence}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-gray-900">{lesson.title}</div>
                          <div className="text-xs text-gray-500">
                            {lesson.unitCount} units · {lesson.xpReward} XP
                          </div>
                        </div>
                        <StatusPill status={lesson.status} />
                      </div>
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={() => setLessonForm({ open: true, lesson: null })}
                className="mt-auto flex items-center justify-center gap-2 border-t border-gray-100 py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Add lesson
              </button>
            </section>

            {/* Selected lesson's units */}
            <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {!selectedLesson ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                  <p className="text-gray-500">Add a lesson to start building this module.</p>
                  <button
                    type="button"
                    onClick={() => setLessonForm({ open: true, lesson: null })}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-active"
                  >
                    <Plus className="h-4 w-4" />
                    Add lesson
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{selectedLesson.title}</h2>
                        <StatusPill status={selectedLesson.status} />
                        <button
                          type="button"
                          onClick={() => setLessonForm({ open: true, lesson: selectedLesson })}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Edit lesson"
                          title="Edit lesson"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {units.length} units · {selectedLesson.xpReward} XP · Edited{" "}
                        {relativeTime(selectedLesson.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/content/modules/${moduleId}/lessons/${selectedLesson.id}/quiz`}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                      <FileQuestion className="h-4 w-4" />
                      {quiz ? `Quiz · ${quiz.quizQuestions?.length ?? 0} questions` : "Add quiz"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setUnitForm({ open: true, unit: null })}
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-active"
                    >
                      <Plus className="h-4 w-4" />
                      Add unit
                    </button>
                    </div>
                  </div>

                  {unitsNeedingVideo.length > 0 && (
                    <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {unitsNeedingVideo.length} {unitsNeedingVideo.length === 1 ? "issue" : "issues"} to fix before
                        this lesson can be submitted: {unitsNeedingVideo.map((u) => u.title).join(", ")}{" "}
                        {unitsNeedingVideo.length === 1 ? "has" : "have"} no sign video or image.
                      </span>
                    </div>
                  )}

                  <div className="flex-1 overflow-x-auto px-2 pt-2">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="w-6" />
                          <th className={headCell}>Unit</th>
                          <th className={headCell}>Sign</th>
                          <th className={headCell}>Readiness</th>
                          <th className="w-24" />
                        </tr>
                      </thead>
                      <tbody>
                        {unitsLoading ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-gray-400">
                              Loading units…
                            </td>
                          </tr>
                        ) : units.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-gray-400">
                              This lesson has no units yet.
                            </td>
                          </tr>
                        ) : (
                          units.map((unit) => (
                            <tr
                              key={unit.id}
                              draggable={!reordering}
                              onDragStart={() => setDragged({ kind: "unit", id: unit.id })}
                              onDragOver={(e) => dragged?.kind === "unit" && e.preventDefault()}
                              onDrop={() => handleDrop("unit", unit.id)}
                              onDragEnd={() => setDragged(null)}
                              className={[
                                "border-t border-gray-100 transition hover:bg-gray-50/70",
                                dragged?.id === unit.id ? "opacity-40" : "",
                              ].join(" ")}
                            >
                              <td className="pl-2">
                                <GripVertical className="h-4 w-4 cursor-grab text-gray-300" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={[
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold",
                                      unit.needsVideo ? "bg-amber-50 text-amber-600" : "bg-[#2b2f5c] text-white",
                                    ].join(" ")}
                                  >
                                    {unitBadge(unit.title)}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-gray-900">{unit.title}</div>
                                    {unit.description && (
                                      <div className="max-w-[220px] truncate text-xs text-gray-500">
                                        {unit.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                {unit.mediaRef && isImageMedia(unit.mediaRef) ? (
                                  <button
                                    type="button"
                                    onClick={() => setPlayingUnit(unit)}
                                    className="block h-9 w-16 overflow-hidden rounded-lg border border-gray-200 transition hover:opacity-90"
                                    aria-label={`View ${unit.title} image`}
                                  >
                                    <img
                                      src={unitMediaUrl(unit.mediaRef)}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  </button>
                                ) : unit.mediaRef ? (
                                  <button
                                    type="button"
                                    onClick={() => setPlayingUnit(unit)}
                                    className="flex h-9 w-16 items-center justify-center rounded-lg text-white transition hover:opacity-90"
                                    style={{ backgroundColor: NAVY }}
                                    aria-label={`Play ${unit.title} video`}
                                  >
                                    <Play className="h-3.5 w-3.5 " />
                                  </button>
                                ) : unit.entryId ? (
                                  <span className="text-xs text-gray-500">Linked sign</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setUnitForm({ open: true, unit })}
                                    className="flex h-9 w-16 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50/50 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50"
                                  >
                                    No media
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {unit.needsVideo ? (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                    <CircleAlert className="h-3.5 w-3.5" />
                                    Needs media
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                    <Check className="h-3.5 w-3.5" />
                                    Ready
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="relative flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setUnitForm({ open: true, unit })}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                    aria-label={`Edit ${unit.title}`}
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMenuUnitId(menuUnitId === unit.id ? null : unit.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                    aria-label={`More actions for ${unit.title}`}
                                    aria-expanded={menuUnitId === unit.id}
                                  >
                                    <Ellipsis className="h-3.5 w-3.5" />
                                  </button>
                                  {menuUnitId === unit.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setMenuUnitId(null)} />
                                      <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteUnit(unit)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete unit
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <button
                      type="button"
                      onClick={() => setUnitForm({ open: true, unit: null })}
                      className="my-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add another unit
                    </button>
                  </div>

                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm text-white"
                    style={{ backgroundColor: NAVY }}
                  >
                    <span>
                      <span className="font-bold">
                        {readyCount} of {units.length}
                      </span>{" "}
                      units ready
                    </span>
                    {selectedLesson.status === "draft" ? (
                      <button
                        type="button"
                        onClick={() => void submitForReview()}
                        disabled={!canSubmit || submitting}
                        title={canSubmit ? undefined : "Every unit needs a sign video or image first"}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting ? "Submitting…" : "Submit lesson for review"}
                      </button>
                    ) : (
                      <span className="text-xs capitalize text-indigo-200">
                        Lesson is {selectedLesson.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </Container>

      {module && (
        <ModuleFormDialog
          open={isModuleFormOpen}
          onOpenChange={setIsModuleFormOpen}
          module={module}
          levels={levelsData?.levels ?? []}
          onSaved={() => void refetchModule()}
        />
      )}

      {module && (
        <LessonFormDialog
          open={lessonForm.open}
          onOpenChange={(open) => setLessonForm((prev) => ({ ...prev, open }))}
          moduleId={Number(module.id)}
          lesson={lessonForm.lesson}
          nextSequence={nextLessonSequence}
          onSaved={() => void refetchModule()}
        />
      )}

      {selectedLesson && (
        <UnitFormDialog
          open={unitForm.open}
          onOpenChange={(open) => setUnitForm((prev) => ({ ...prev, open }))}
          lessonId={Number(selectedLesson.id)}
          unit={unitForm.unit}
          onSaved={refreshAll}
        />
      )}

      <Dialog open={!!playingUnit} onOpenChange={(open) => !open && setPlayingUnit(null)}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{playingUnit?.title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {playingUnit?.mediaRef &&
              (isImageMedia(playingUnit.mediaRef) ? (
                <img
                  key={playingUnit.id}
                  src={unitMediaUrl(playingUnit.mediaRef)}
                  alt={playingUnit.title}
                  className="mx-auto max-h-[70vh] w-auto rounded-xl"
                />
              ) : (
                <video
                  key={playingUnit.id}
                  src={unitMediaUrl(playingUnit.mediaRef)}
                  controls
                  autoPlay
                  className="w-full rounded-xl bg-black"
                />
              ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { ModuleLessonsPage };

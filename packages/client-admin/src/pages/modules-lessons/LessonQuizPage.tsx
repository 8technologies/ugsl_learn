import { Check, ChevronLeft, CircleAlert, Eye, GripVertical, Play, Plus, Trash2, Upload, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Container } from "@/components/container";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { URL_2 } from "@/config/urls";
import { DELETE_QUIZ_QUESTION, LESSONQUIZ, LOAD_MODULE_DETAIL, SAVE_QUIZ, SAVE_QUIZ_QUESTION } from "@/gql/content";
import { StatusPill } from "./components/StatusPill";

type QuestionType = "watch_match" | "multiple_choice" | "sign_recall" | "video_record" | "fill_blank";

type QuizOption = { id: number; label: string | null; mediaRef: string | null; correctFlag: boolean };

type QuizQuestion = {
  id: number;
  questionType: QuestionType;
  prompt: string | null;
  mediaRef: string | null;
  sequence: number;
  correctAnswer: unknown;
  updatedAt: string;
  Options: QuizOption[] | null;
};

type Quiz = {
  id: string;
  lessonId: number;
  passThreshold: number | null;
  status: string;
  updatedAt: string;
  quizQuestions: QuizQuestion[] | null;
};

type LessonSummary = { id: string; title: string; unitCount: number };
type ModuleSummary = { id: string; title: string; lessons: LessonSummary[] | null };

type LessonQuizResult = { lessonQuiz: Quiz[] };
type ModuleDetailResult = { module: ModuleSummary | null };
type MutationResult = { success: boolean; message: string };

// Editable copy of a question; `id` is null until a new question is saved
type OptionDraft = {
  key: string;
  id: number | null;
  label: string;
  correctFlag: boolean;
  mediaRef: string | null;
  video: File | null;
};

type QuestionDraft = {
  id: number | null;
  questionType: QuestionType;
  prompt: string;
  mediaRef: string | null;
  video: File | null;
  correctAnswer: string;
  options: OptionDraft[];
};

// How each question type is built: whether the question shows a sign video,
// and whether the learner picks an option or gives a text answer
const QUESTION_TYPES: Record<
  QuestionType,
  { label: string; hint: string; video: "required" | "optional" | "none"; answer: "options" | "text"; optionVideos?: boolean }
> = {
  watch_match: {
    label: "Watch & match",
    hint: "The learner watches the sign video and picks the matching answer.",
    video: "required",
    answer: "options",
  },
  multiple_choice: {
    label: "Multiple choice",
    hint: "The learner reads the prompt and picks the matching sign video.",
    video: "none",
    answer: "options",
    optionVideos: true,
  },
  sign_recall: {
    label: "Sign recall",
    hint: "The learner sees the word and recalls its sign from memory.",
    video: "none",
    answer: "text",
  },
  video_record: {
    label: "Video record",
    hint: "The learner records themselves signing; it is compared with the expected sign.",
    video: "optional",
    answer: "text",
  },
  fill_blank: {
    label: "Fill blank",
    hint: "The learner watches the sign video and types what they see.",
    video: "required",
    answer: "text",
  },
};

const NAVY = "#2b2f5c";
const OPTION_LETTERS = "ABCDEF";
const MIN_QUESTIONS = 3;
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

// Quiz videos are saved by the server under public/quizMedia/
const quizMediaUrl = (mediaRef: string) => `${URL_2}/quizMedia/${encodeURIComponent(mediaRef)}`;

const isImageMedia = (name: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(name);

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

let keySeed = 0;
const nextKey = () => `option-${++keySeed}`;

const emptyOption = (): OptionDraft => ({
  key: nextKey(),
  id: null,
  label: "",
  correctFlag: false,
  mediaRef: null,
  video: null,
});

const newDraft = (): QuestionDraft => ({
  id: null,
  questionType: "watch_match",
  prompt: "",
  mediaRef: null,
  video: null,
  correctAnswer: "",
  options: Array.from({ length: 4 }, emptyOption),
});

// correctAnswer is JSON on the server; text answers are stored as plain strings
const answerText = (value: unknown) =>
  value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);

const toDraft = (question: QuizQuestion): QuestionDraft => ({
  id: question.id,
  questionType: question.questionType in QUESTION_TYPES ? question.questionType : "watch_match",
  prompt: question.prompt ?? "",
  mediaRef: question.mediaRef,
  video: null,
  correctAnswer: answerText(question.correctAnswer),
  options: (question.Options ?? []).map((option) => ({
    key: nextKey(),
    id: option.id,
    label: option.label ?? "",
    correctFlag: option.correctFlag,
    mediaRef: option.mediaRef,
    video: null,
  })),
});

// Options that count: a label, or a video for option-video types
const filledOptions = (draft: QuestionDraft) =>
  draft.options.filter((option) =>
    QUESTION_TYPES[draft.questionType].optionVideos ? option.mediaRef || option.video : option.label.trim(),
  );

// What still stops a question from being ready, or null when it is complete
const questionIssue = (draft: QuestionDraft): string | null => {
  const type = QUESTION_TYPES[draft.questionType];
  if (!draft.prompt.trim()) return "no prompt";
  if (type.video === "required" && !draft.mediaRef && !draft.video) return "no sign video";
  if (type.answer === "text") return draft.correctAnswer.trim() ? null : "no correct answer";
  if (filledOptions(draft).length < 2) return "needs at least 2 answers";
  return draft.options.some((option) => option.correctFlag) ? null : "no correct answer";
};

// Second line of a question row, e.g. "Watch & match · M"
const questionDetail = (draft: QuestionDraft) => {
  const type = QUESTION_TYPES[draft.questionType];
  const issue = questionIssue(draft);
  if (issue) return `${type.label} · ${issue}`;
  if (type.answer === "text") return `${type.label} · ${draft.correctAnswer.trim()}`;
  if (type.optionVideos) return `${type.label} · ${filledOptions(draft).length} sign videos`;
  const correct = draft.options.find((option) => option.correctFlag);
  return `${type.label} · ${correct?.label.trim() || "answer set"}`;
};

// A temporary URL for previewing a chosen file before it is uploaded
const useObjectUrl = (file: File | null) => {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
};

// Rejects files the server would refuse, so the editor can say why straight away
const checkMediaFile = (file: File) => {
  if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) return "Choose a video or an image file.";
  if (file.size > MAX_MEDIA_BYTES) return "The file must be 50 MB or smaller.";
  return null;
};

// Moves the dragged item to the drop target's position
function reorder<T extends { id: number }>(items: T[], draggedId: number, targetId: number): T[] {
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{children}</div>
);

// Small sign video or image; the play overlay opens it full size
const MediaThumb = ({
  src,
  name,
  onOpen,
  className = "h-20 w-32",
}: {
  src: string;
  name: string;
  onOpen: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className={`relative shrink-0 overflow-hidden rounded-xl text-white transition hover:opacity-90 ${className}`}
    style={{ backgroundColor: NAVY }}
    aria-label="Play sign"
  >
    {isImageMedia(name) ? (
      <img src={src} alt="" className="h-full w-full object-cover" />
    ) : (
      <>
        <video src={src} muted preload="metadata" className="h-full w-full object-cover opacity-60" />
        <Play className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 fill-white" />
      </>
    )}
  </button>
);

const MediaView = ({ src, name }: { src: string; name: string }) =>
  isImageMedia(name) ? (
    <img src={src} alt="" className="mx-auto max-h-[60vh] w-auto rounded-xl" />
  ) : (
    <video src={src} controls autoPlay className="w-full rounded-xl bg-black" />
  );

// One answer option row: letter, label, optional sign video, correct toggle, remove
const OptionRow = ({
  index,
  option,
  withVideo,
  onChange,
  onMarkCorrect,
  onRemove,
  onPlay,
}: {
  index: number;
  option: OptionDraft;
  withVideo: boolean;
  onChange: (changes: Partial<OptionDraft>) => void;
  onMarkCorrect: () => void;
  onRemove: () => void;
  onPlay: (src: string, name: string) => void;
}) => {
  const fileUrl = useObjectUrl(option.video);
  const mediaSrc = fileUrl ?? (option.mediaRef ? quizMediaUrl(option.mediaRef) : null);
  const mediaName = option.video?.name ?? option.mediaRef ?? "";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkMediaFile(file);
    if (problem) toast.error(problem);
    else onChange({ video: file });
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          option.correctFlag ? "bg-emerald-600 text-white" : "bg-stone-100 text-gray-700",
        ].join(" ")}
      >
        {OPTION_LETTERS[index]}
      </span>
      {withVideo &&
        (mediaSrc ? (
          <MediaThumb src={mediaSrc} name={mediaName} onOpen={() => onPlay(mediaSrc, mediaName)} className="h-10 w-16" />
        ) : (
          <label
            className="flex h-10 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 transition hover:bg-gray-50"
            title="Add sign video"
          >
            <Upload className="h-4 w-4" />
            <input type="file" accept="video/*,image/*" className="sr-only" onChange={handleFile} />
          </label>
        ))}
      <input
        value={option.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder={withVideo ? "Caption (optional)" : "Answer"}
        maxLength={255}
        className={[
          "min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2b2f5c]",
          option.correctFlag ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 bg-white",
        ].join(" ")}
      />
      {withVideo && mediaSrc && (
        <label className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800">
          Replace
          <input type="file" accept="video/*,image/*" className="sr-only" onChange={handleFile} />
        </label>
      )}
      <button
        type="button"
        onClick={onMarkCorrect}
        className={[
          "flex w-32 shrink-0 items-center gap-2 text-xs font-semibold",
          option.correctFlag ? "text-emerald-700" : "text-gray-500 hover:text-gray-800",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-4 w-4 items-center justify-center rounded-full border-2",
            option.correctFlag ? "border-emerald-600" : "border-gray-300",
          ].join(" ")}
        >
          {option.correctFlag && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
        </span>
        {option.correctFlag ? "Correct answer" : "Mark correct"}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"
        aria-label={`Remove answer ${OPTION_LETTERS[index]}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const LessonQuizPage = () => {
  const { moduleId = "", lessonId = "" } = useParams();

  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [passMark, setPassMark] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [playing, setPlaying] = useState<{ src: string; name: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: moduleData } = useQuery<ModuleDetailResult>(LOAD_MODULE_DETAIL, {
    variables: { id: moduleId },
    skip: !moduleId,
  });
  const module = moduleData?.module ?? null;
  const lesson = module?.lessons?.find((l) => l.id === lessonId) ?? null;

  const {
    data: quizData,
    loading: quizLoading,
    error: quizError,
    refetch: refetchQuiz,
  } = useQuery<LessonQuizResult>(LESSONQUIZ, {
    variables: { lessonId: Number(lessonId) },
    skip: !lessonId,
    fetchPolicy: "network-only",
  });
  // A lesson has one quiz; the newest wins if there are more
  const quiz = quizData?.lessonQuiz[0] ?? null;
  const questions = useMemo(
    () => [...(quiz?.quizQuestions ?? [])].sort((a, b) => a.sequence - b.sequence),
    [quiz],
  );

  const [saveQuiz, { loading: savingQuiz }] = useMutation<{ saveQuiz: MutationResult }>(SAVE_QUIZ);
  const [saveQuestion, { loading: savingQuestion }] = useMutation<{ saveQuizQuestion: MutationResult }>(
    SAVE_QUIZ_QUESTION,
  );
  const [deleteQuestion] = useMutation<{ deleteQuizQuestion: MutationResult }>(DELETE_QUIZ_QUESTION);

  useEffect(() => {
    setPassMark(quiz?.passThreshold != null ? String(quiz.passThreshold) : "");
  }, [quiz?.passThreshold]);

  // Open the first question once the quiz has loaded
  useEffect(() => {
    if (selectedId !== null || !questions[0]) return;
    setSelectedId(questions[0].id);
    setDraft(toDraft(questions[0]));
  }, [questions, selectedId]);

  const fileUrl = useObjectUrl(draft?.video ?? null);
  const questionMediaSrc = fileUrl ?? (draft?.mediaRef ? quizMediaUrl(draft.mediaRef) : null);
  const questionMediaName = draft?.video?.name ?? draft?.mediaRef ?? "";

  const confirmDiscard = () => !dirty || window.confirm("Discard your unsaved changes to this question?");

  const openQuestion = (question: QuizQuestion | null) => {
    setSelectedId(question?.id ?? null);
    setDraft(question ? toDraft(question) : null);
    setDirty(false);
  };

  const selectQuestion = (question: QuizQuestion) => {
    if (question.id === selectedId || !confirmDiscard()) return;
    openQuestion(question);
  };

  const addQuestion = () => {
    if (!quiz || !confirmDiscard()) return;
    setSelectedId("new");
    setDraft(newDraft());
    setDirty(true);
  };

  const patch = (changes: Partial<QuestionDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));
    setDirty(true);
  };

  const patchOption = (key: string, changes: Partial<OptionDraft>) => {
    if (!draft) return;
    patch({ options: draft.options.map((option) => (option.key === key ? { ...option, ...changes } : option)) });
  };

  // Only one answer is correct at a time
  const markCorrect = (key: string) => {
    if (!draft) return;
    patch({ options: draft.options.map((option) => ({ ...option, correctFlag: option.key === key })) });
  };

  const handleQuestionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkMediaFile(file);
    if (problem) toast.error(problem);
    else patch({ video: file });
  };

  const createQuiz = async () => {
    try {
      const { data } = await saveQuiz({ variables: { input: { lessonId: Number(lessonId), passThreshold: 70 } } });
      toast.success(data?.saveQuiz.message ?? "Quiz created");
      void refetchQuiz();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the quiz.");
    }
  };

  const passMarkValue = Number(passMark);
  const passMarkValid = passMark.trim() !== "" && Number.isInteger(passMarkValue) && passMarkValue >= 0 && passMarkValue <= 100;

  const saveDraft = async () => {
    if (!quiz) return;
    if (!passMarkValid) {
      toast.error("Pass mark must be a whole number from 0 to 100.");
      return;
    }
    try {
      if (dirty && draft) {
        const saved = await saveCurrentQuestion();
        if (!saved) return;
      }
      const { data } = await saveQuiz({ variables: { input: { id: quiz.id, passThreshold: passMarkValue } } });
      toast.success(data?.saveQuiz.success ? "Draft saved" : data?.saveQuiz.message);
      void refetchQuiz();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the quiz.");
    }
  };

  // Saves the open question, then reopens it from the server's copy. Returns false if it failed.
  const saveCurrentQuestion = async () => {
    if (!quiz || !draft) return false;
    const type = QUESTION_TYPES[draft.questionType];
    // Types without a question video drop any left over from a previous type
    const keepVideo = type.video !== "none";
    try {
      const { data } = await saveQuestion({
        variables: {
          input: {
            ...(draft.id ? { id: String(draft.id) } : { quizId: Number(quiz.id) }),
            questionType: draft.questionType,
            prompt: draft.prompt.trim() || null,
            correctAnswer: type.answer === "text" ? draft.correctAnswer.trim() || null : null,
            ...(keepVideo && draft.video ? { video: draft.video } : {}),
            ...(draft.id && (!keepVideo || (!draft.video && !draft.mediaRef)) ? { removeMedia: true } : {}),
            options:
              type.answer === "options"
                ? draft.options.map((option) => ({
                    ...(option.id ? { id: String(option.id) } : {}),
                    label: option.label.trim() || null,
                    correctFlag: option.correctFlag,
                    ...(option.video && type.optionVideos ? { video: option.video } : {}),
                  }))
                : [],
          },
        },
      });
      if (!data?.saveQuizQuestion.success) {
        toast.error(data?.saveQuizQuestion.message ?? "Could not save this question.");
        return false;
      }

      const knownIds = new Set(questions.map((question) => question.id));
      const { data: refreshed } = await refetchQuiz();
      const latest = refreshed?.lessonQuiz[0]?.quizQuestions ?? [];
      // A new question is the one id we had not seen before
      const saved = latest.find((question) => (draft.id ? question.id === draft.id : !knownIds.has(question.id)));
      openQuestion(saved ?? null);
      toast.success(data.saveQuizQuestion.message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this question.");
      return false;
    }
  };

  const discardChanges = () => {
    if (!draft) return;
    const saved = questions.find((question) => question.id === draft.id) ?? questions[0] ?? null;
    openQuestion(saved);
  };

  const handleDelete = async () => {
    if (!draft) return;
    if (draft.id === null) {
      openQuestion(questions[0] ?? null);
      return;
    }
    if (!window.confirm("Delete this question?")) return;
    try {
      const { data } = await deleteQuestion({ variables: { id: String(draft.id) } });
      toast.success(data?.deleteQuizQuestion.message ?? "Question deleted");
      const { data: refreshed } = await refetchQuiz();
      const remaining = [...(refreshed?.lessonQuiz[0]?.quizQuestions ?? [])].sort((a, b) => a.sequence - b.sequence);
      openQuestion(remaining[0] ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this question.");
    }
  };

  // Saves the new order: only questions whose position changed are updated
  const handleDrop = async (targetId: number) => {
    if (draggedId === null || draggedId === targetId || reordering) return;
    const ordered = reorder(questions, draggedId, targetId);
    setDraggedId(null);
    setReordering(true);
    try {
      for (const [index, question] of ordered.entries()) {
        if (question.sequence === index + 1) continue;
        await saveQuestion({ variables: { input: { id: String(question.id), sequence: index + 1 } } });
      }
      toast.success("Question order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder questions.");
    } finally {
      setReordering(false);
      void refetchQuiz();
    }
  };

  const submitForReview = async () => {
    if (!quiz) return;
    try {
      const { data } = await saveQuiz({
        variables: { input: { id: quiz.id, passThreshold: passMarkValue, status: "in_review" } },
      });
      toast.success(data?.saveQuiz.success ? "Quiz submitted for review" : data?.saveQuiz.message);
      void refetchQuiz();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit this quiz.");
    }
  };

  // The open question shows its unsaved edits in the list too
  const rows = questions.map((question) => (question.id === draft?.id ? draft : toDraft(question)));
  const listRows = selectedId === "new" && draft ? [...rows, draft] : rows;
  const incomplete = rows
    .map((row, index) => ({ number: index + 1, issue: questionIssue(row) }))
    .filter((row) => row.issue);
  const checklist = [
    { ok: passMarkValid, text: passMarkValid ? `Pass mark is set (${passMarkValue}%)` : "Set a pass mark from 0 to 100" },
    { ok: questions.length >= MIN_QUESTIONS, text: `At least ${MIN_QUESTIONS} questions` },
    {
      ok: questions.length > 0 && incomplete.length === 0,
      text:
        incomplete.length === 0
          ? "Every question has a correct answer"
          : `Every question is complete — ${incomplete
              .map((row) => `question ${row.number} has ${row.issue}`)
              .join(", ")}`,
    },
  ];
  const ready = checklist.every((item) => item.ok);
  const canSubmit = !!quiz && quiz.status === "draft" && ready && !dirty;
  const correctNeeded = questions.length && passMarkValid ? Math.ceil((passMarkValue / 100) * questions.length) : 0;
  const draftIndex = draft ? listRows.indexOf(draft) : -1;
  const type = draft ? QUESTION_TYPES[draft.questionType] : null;
  const lessonTitle = lesson?.title ?? "…";

  if (quizError) {
    return (
      <Container>
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Could not load this quiz</h1>
          <p className="mt-2 text-sm text-gray-500">{quizError.message}</p>
          <Link
            to={`/content/modules/${moduleId}?lesson=${lessonId}`}
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-active"
          >
            Back to lesson
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <div className="flex flex-col gap-5 pb-8">
          {/* Breadcrumb + title */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1.5 text-sm text-gray-500">
                <ChevronLeft className="h-4 w-4" />
                <Link to={`/content/modules/${moduleId}`} className="hover:text-gray-900 hover:underline">
                  {module?.title ?? "Module"}
                </Link>
                <span>/</span>
                <Link
                  to={`/content/modules/${moduleId}?lesson=${lessonId}`}
                  className="hover:text-gray-900 hover:underline"
                >
                  Lesson {lessonTitle}
                </Link>
                <span>/</span>
                <span className="font-semibold text-gray-900">Quiz</span>
              </nav>
              <div className="mt-2 flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Quiz for lesson {lessonTitle}</h1>
                {quiz && <StatusPill status={quiz.status} />}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Learners take this after finishing the {lesson?.unitCount ?? ""} units. Passing completes the lesson.
              </p>
            </div>
            {quiz && (
              <div className="flex flex-wrap items-center gap-2">
                {/* <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!draft}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  Preview as learner
                </button> */}
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={savingQuiz || savingQuestion}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => void submitForReview()}
                  disabled={!canSubmit || savingQuiz}
                  title={
                    quiz.status !== "draft"
                      ? `Quiz is ${quiz.status.replace(/_/g, " ")}`
                      : dirty
                        ? "Save the open question first"
                        : ready
                          ? undefined
                          : "Finish the checklist first"
                  }
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit for review
                </button>
              </div>
            )}
          </div>

          {quizLoading && !quiz ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              Loading quiz…
            </div>
          ) : !quiz ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-500">This lesson has no quiz yet.</p>
              <button
                type="button"
                onClick={() => void createQuiz()}
                disabled={savingQuiz}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-active disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create quiz
              </button>
            </div>
          ) : (
            <>
              {/* Quiz stats */}
              <section className="flex flex-wrap items-start gap-x-12 gap-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
                <Stat label="Lesson">
                  {lessonTitle} · {module?.title ?? "…"}
                </Stat>
                <Stat label="Questions">{questions.length}</Stat>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Pass mark</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passMark}
                      onChange={(e) => setPassMark(e.target.value)}
                      className={[
                        "w-16 rounded-lg border px-2 py-1 text-center font-semibold text-gray-900 outline-none focus:border-[#2b2f5c]",
                        passMarkValid ? "border-gray-300" : "border-red-400",
                      ].join(" ")}
                      aria-label="Pass mark percentage"
                    />
                    <span className="text-sm text-gray-500">
                      % to pass
                      {questions.length > 0 && ` · ${correctNeeded} of ${questions.length} correct`}
                    </span>
                  </div>
                </div>
                <Stat label="Retakes">Unlimited</Stat>
              </section>

              <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
                {/* Questions list */}
                <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Questions
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-700">{questions.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50"
                      aria-label="Add question"
                      title="Add question"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <ol className="flex flex-col gap-2 p-3">
                    {listRows.length === 0 && (
                      <li className="py-6 text-center text-sm text-gray-400">No questions yet.</li>
                    )}
                    {listRows.map((row, index) => {
                      const saved = row.id !== null ? questions.find((q) => q.id === row.id) : null;
                      const selected = row === draft;
                      const issue = questionIssue(row);
                      return (
                        <li
                          key={row.id ?? "new"}
                          draggable={!!saved && !reordering}
                          onDragStart={() => saved && setDraggedId(saved.id)}
                          onDragOver={(e) => draggedId !== null && saved && e.preventDefault()}
                          onDrop={() => saved && void handleDrop(saved.id)}
                          onDragEnd={() => setDraggedId(null)}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => saved && selectQuestion(saved)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && saved && selectQuestion(saved)}
                            className={[
                              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                              selected
                                ? "border-[#2b2f5c] bg-indigo-50/50 ring-1 ring-[#2b2f5c]"
                                : issue
                                  ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                                  : "border-transparent hover:bg-gray-50",
                              draggedId !== null && draggedId === row.id ? "opacity-40" : "",
                            ].join(" ")}
                          >
                            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />
                            <span
                              className={[
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                selected ? "bg-[#2b2f5c] text-white" : "bg-gray-100 text-gray-700",
                              ].join(" ")}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-gray-900">
                                {row.prompt.trim() || "Untitled question"}
                              </div>
                              <div className={`truncate text-xs ${issue ? "text-amber-700" : "text-gray-500"}`}>
                                {questionDetail(row)}
                              </div>
                            </div>
                            {issue ? (
                              <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                            ) : (
                              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="mt-auto flex items-center justify-center gap-2 border-t border-dashed border-gray-200 py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add question
                  </button>

                  <div className="border-t border-gray-100 bg-stone-50/60 px-4 py-3.5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Ready to submit?
                    </div>
                    <ul className="flex flex-col gap-1.5 text-xs">
                      {checklist.map((item) => (
                        <li
                          key={item.text}
                          className={`flex items-start gap-2 ${item.ok ? "text-emerald-700" : "text-amber-800"}`}
                        >
                          {item.ok ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          )}
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Question editor */}
                <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:max-h-[calc(100vh-200px)]">
                  {!draft || !type ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                      <p className="text-gray-500">Add a question to start building this quiz.</p>
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-active"
                      >
                        <Plus className="h-4 w-4" />
                        Add question
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">Question {draftIndex + 1}</h2>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {draft.id === null
                              ? "New question · not saved yet"
                              : dirty
                                ? "Unsaved changes"
                                : `Edited ${relativeTime(questions.find((q) => q.id === draft.id)?.updatedAt ?? quiz.updatedAt)} · saved as ${quiz.status.replace(/_/g, " ")}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete()}
                          className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
                        <div>
                          <SectionLabel>Question type</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(QUESTION_TYPES) as QuestionType[]).map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => key !== draft.questionType && patch({ questionType: key })}
                                className={[
                                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                                  key === draft.questionType
                                    ? "border-[#2b2f5c] bg-[#2b2f5c] text-white"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                              >
                                {QUESTION_TYPES[key].label}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">{type.hint}</p>
                        </div>

                        <div>
                          <SectionLabel>Prompt</SectionLabel>
                          <input
                            value={draft.prompt}
                            onChange={(e) => patch({ prompt: e.target.value })}
                            placeholder="e.g. Which letter is being signed?"
                            maxLength={500}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2b2f5c]"
                          />
                          <p className="mt-1.5 text-xs text-gray-500">
                            {type.video === "none"
                              ? "This is all the learner sees before answering."
                              : "Shown with the video. Don't reveal the answer here."}
                          </p>
                        </div>

                        {type.video !== "none" && (
                          <div>
                            <SectionLabel>Sign video{type.video === "optional" && " (optional)"}</SectionLabel>
                            {questionMediaSrc ? (
                              <div className="flex items-center gap-4 rounded-2xl border border-gray-200 p-3">
                                <MediaThumb
                                  src={questionMediaSrc}
                                  name={questionMediaName}
                                  onOpen={() => setPlaying({ src: questionMediaSrc, name: questionMediaName })}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold text-gray-900">
                                    {draft.video ? draft.video.name : "Sign video"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {draft.video ? "New file · uploads when you save" : "Uploaded sign"}
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1.5">
                                  <label className="cursor-pointer rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                                    Replace sign
                                    <input
                                      type="file"
                                      accept="video/*,image/*"
                                      className="sr-only"
                                      onChange={handleQuestionFile}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => patch(draft.video ? { video: null } : { mediaRef: null })}
                                    className="px-3 py-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600 transition hover:bg-gray-50">
                                <Upload className="h-5 w-5 shrink-0 text-gray-400" />
                                Choose a sign video or image (MP4, WebM, PNG, JPG · up to 50 MB)
                                <input
                                  type="file"
                                  accept="video/*,image/*"
                                  className="sr-only"
                                  onChange={handleQuestionFile}
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {type.answer === "options" ? (
                          <div>
                            <SectionLabel>Answer options</SectionLabel>
                            <div className="flex flex-col gap-2.5">
                              {draft.options.map((option, index) => (
                                <OptionRow
                                  key={option.key}
                                  index={index}
                                  option={option}
                                  withVideo={!!type.optionVideos}
                                  onChange={(changes) => patchOption(option.key, changes)}
                                  onMarkCorrect={() => markCorrect(option.key)}
                                  onRemove={() =>
                                    patch({ options: draft.options.filter((o) => o.key !== option.key) })
                                  }
                                  onPlay={(src, name) => setPlaying({ src, name })}
                                />
                              ))}
                            </div>
                            {draft.options.length < OPTION_LETTERS.length && (
                              <button
                                type="button"
                                onClick={() => patch({ options: [...draft.options, emptyOption()] })}
                                className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                              >
                                <Plus className="h-4 w-4" />
                                Add answer
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <SectionLabel>Correct answer</SectionLabel>
                            <input
                              value={draft.correctAnswer}
                              onChange={(e) => patch({ correctAnswer: e.target.value })}
                              placeholder={draft.questionType === "fill_blank" ? "e.g. Q" : "The expected sign, e.g. R"}
                              className={[
                                "w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2b2f5c]",
                                draft.correctAnswer.trim() ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200",
                              ].join(" ")}
                            />
                            <p className="mt-1.5 text-xs text-gray-500">
                              {draft.questionType === "fill_blank"
                                ? "What the learner must type. Letter case is ignored."
                                : "The sign the learner should produce."}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
                        <button
                          type="button"
                          onClick={discardChanges}
                          disabled={!dirty || savingQuestion}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          Discard changes
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveCurrentQuestion()}
                          disabled={!dirty || savingQuestion}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-active disabled:opacity-50"
                        >
                          {savingQuestion ? "Saving…" : "Save question"}
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </Container>

      <Dialog open={!!playing} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Sign</DialogTitle>
          </DialogHeader>
          <DialogBody>{playing && <MediaView key={playing.src} src={playing.src} name={playing.name} />}</DialogBody>
        </DialogContent>
      </Dialog>

      {/* What the learner sees for the open question, unsaved edits included */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Question {draftIndex + 1} of {listRows.length}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {draft && type && (
              <div className="flex flex-col gap-4">
                <p className="text-lg font-bold text-gray-900">{draft.prompt || "Untitled question"}</p>
                {type.video !== "none" && questionMediaSrc && (
                  <MediaView src={questionMediaSrc} name={questionMediaName} />
                )}
                {type.answer === "options" ? (
                  <div className={`grid gap-2 ${type.optionVideos ? "grid-cols-2" : ""}`}>
                    {filledOptions(draft).map((option, index) => (
                      <PreviewOption key={option.key} letter={OPTION_LETTERS[index]!} option={option} />
                    ))}
                  </div>
                ) : draft.questionType === "fill_blank" ? (
                  <input
                    placeholder="Type your answer"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
                    {draft.questionType === "video_record" ? "Record yourself signing" : "Sign it, then reveal the answer"}
                  </div>
                )}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};

// An answer button as the learner sees it
const PreviewOption = ({ letter, option }: { letter: string; option: OptionDraft }) => {
  const fileUrl = useObjectUrl(option.video);
  const src = fileUrl ?? (option.mediaRef ? quizMediaUrl(option.mediaRef) : null);
  const name = option.video?.name ?? option.mediaRef ?? "";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 text-sm font-semibold text-gray-800">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold">
        {letter}
      </span>
      {src ? (
        isImageMedia(name) ? (
          <img src={src} alt="" className="h-16 w-full rounded-lg object-cover" />
        ) : (
          <video src={src} muted loop autoPlay className="h-16 w-full rounded-lg bg-black object-cover" />
        )
      ) : (
        option.label
      )}
    </div>
  );
};

export { LessonQuizPage };

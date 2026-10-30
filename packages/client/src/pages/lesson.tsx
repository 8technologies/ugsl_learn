import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  BigCloseSvg,
  DoneSvg,
  LessonFastForwardEndFailSvg,
  LessonFastForwardEndPassSvg,
  LessonFastForwardStartSvg,
  LessonTopBarEmptyHeart,
  LessonTopBarHeart,
} from "~/components/Svgs";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client/react";
import { env } from "~/env.mjs";
import { LOAD_LESSON_PLAYER, LOAD_LESSONQUIZ } from "~/gql/lessons";

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

type LessonInfo = {
  moduleName: string;
  lessonTitle: string;
  level: string;
  xp: number;
};

/** Header info of the open lesson, read by the shell, back link and unit details. */
const LessonInfoContext = React.createContext<LessonInfo>({
  moduleName: "",
  lessonTitle: "",
  level: "",
  xp: 0,
});

type LessonUnit = {
  title: string;
  /** English word / letter shown in the "English letter" card. */
  english: string;
  meaning: string;
  usage?: string;
  tip: string;
  /** Full URL of the sign video or image. When missing, a placeholder is shown. */
  mediaRef?: string;
  isImage: boolean;
};

type QuestionType = "watch_match" | "multiple_choice" | "sign_recall" | "video_record" | "fill_blank";

type QuizOptionResult = {
  id: number;
  label: string | null;
  mediaRef: string | null;
  correctFlag: boolean;
};

type QuizQuestionResult = {
  id: number;
  questionType: string;
  prompt: string | null;
  mediaRef: string | null;
  sequence: number;
  correctAnswer: unknown;
  Options: QuizOptionResult[] | null;
};

type LessonQuizResult = {
  lessonQuiz: {
    id: string;
    passThreshold: number | null;
    status: string | null;
    quizQuestions: QuizQuestionResult[] | null;
  }[];
};

type QuizOption = {
  id: number;
  letter: string;
  label: string;
  /** Full URL of the option's sign video or image (multiple choice). */
  mediaRef?: string;
  isImage: boolean;
  correct: boolean;
};

type QuizQuestion = {
  id: number;
  type: QuestionType;
  prompt: string;
  mediaRef?: string;
  isImage: boolean;
  /** Expected text for fill blank, sign recall and video record questions. */
  answerText: string;
  options: QuizOption[];
};

type LessonQuiz = {
  passThreshold: number;
  questions: QuizQuestion[];
};

/** What the learner gave: an option, typed text, or their own verdict on a signed answer. */
type QuizAnswer =
  | { kind: "option"; optionId: number }
  | { kind: "text"; value: string }
  | { kind: "self"; correct: boolean };

type LessonPlayerResult = {
  lesson: {
    id: string;
    title: string | null;
    xpReward: number | null;
    status: string | null;
    module: {
      id: string;
      title: string | null;
      level: { id: string; name: string | null } | null;
    } | null;
    units: LessonUnitsResult[];
  } | null;
  
};

type LessonUnitsResult ={
  
    id: string;
    title: string | null;
    description: string | null;
    sequence: number | null;
    mediaRef: string | null;
  
}

const DEFAULT_TIP =
  "Watch once at normal speed, then slow it to 0.5× and copy the handshape. Use Replay until it feels natural.";

// Unit media is stored in the server's public/unitsMedia folder
const unitMediaUrl = (mediaRef: string) =>
  new URL(`/unitsMedia/${encodeURIComponent(mediaRef)}`, env.NEXT_PUBLIC_GRAPHQL_URL).toString();
const isImageMedia = (mediaRef: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(mediaRef);

const toLessonUnits = (units: LessonUnitsResult[]): LessonUnit[] =>
  [...units]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((unit) => {
      const title = unit.title ?? "Untitled unit";
      return {
        title,
        english: title,
        meaning: unit.description ?? "",
        tip: DEFAULT_TIP,
        mediaRef: unit.mediaRef ? unitMediaUrl(unit.mediaRef) : undefined,
        isImage: unit.mediaRef ? isImageMedia(unit.mediaRef) : false,
      };
    });

// Quiz media is stored in the server's public/quizMedia folder
const quizMediaUrl = (mediaRef: string) =>
  new URL(`/quizMedia/${encodeURIComponent(mediaRef)}`, env.NEXT_PUBLIC_GRAPHQL_URL).toString();

const QUESTION_TYPES: QuestionType[] = ["watch_match", "multiple_choice", "sign_recall", "video_record", "fill_blank"];
const OPTION_LETTERS = "ABCDEF";

// correctAnswer is JSON on the server; text answers are stored as plain strings
const answerText = (value: unknown) =>
  value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const toQuizQuestion = (question: QuizQuestionResult): QuizQuestion => {
  const type = QUESTION_TYPES.find((t) => t === question.questionType) ?? "watch_match";
  return {
    id: question.id,
    type,
    prompt: question.prompt ?? "",
    mediaRef: question.mediaRef ? quizMediaUrl(question.mediaRef) : undefined,
    isImage: question.mediaRef ? isImageMedia(question.mediaRef) : false,
    answerText: answerText(question.correctAnswer),
    options: (question.Options ?? []).map((option, i) => ({
      id: option.id,
      letter: OPTION_LETTERS[i] ?? "?",
      label: option.label ?? "",
      mediaRef: option.mediaRef ? quizMediaUrl(option.mediaRef) : undefined,
      isImage: option.mediaRef ? isImageMedia(option.mediaRef) : false,
      correct: option.correctFlag,
    })),
  };
};

const isOptionQuestion = (question: QuizQuestion) =>
  question.type === "watch_match" || question.type === "multiple_choice";

// Questions a learner can't answer (no correct option / no expected text) are left out
const isAnswerable = (question: QuizQuestion) =>
  isOptionQuestion(question)
    ? question.options.some((option) => option.correct)
    : question.answerText.trim() !== "";

// Learners only get a published quiz; a lesson without one completes after its units
const toLessonQuiz = (result: LessonQuizResult | undefined): LessonQuiz | null => {
  const quiz = result?.lessonQuiz.find((q) => q.status === "published");
  if (!quiz) return null;
  const questions = [...(quiz.quizQuestions ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map(toQuizQuestion)
    .filter(isAnswerable);
  return questions.length ? { passThreshold: quiz.passThreshold ?? 70, questions } : null;
};

const optionName = (option: QuizOption) => option.label || `Sign ${option.letter}`;

const correctResponse = (question: QuizQuestion) =>
  isOptionQuestion(question)
    ? question.options.filter((o) => o.correct).map(optionName).join(", ")
    : question.answerText;

const isCorrectAnswer = (question: QuizQuestion, answer: QuizAnswer | null) => {
  if (!answer) return false;
  if (answer.kind === "option") return question.options.some((o) => o.id === answer.optionId && o.correct);
  if (answer.kind === "text") return sameText(answer.value, question.answerText);
  return answer.correct;
};

const describeAnswer = (question: QuizQuestion, answer: QuizAnswer | null) => {
  if (!answer) return "Skipped";
  if (answer.kind === "option") {
    const option = question.options.find((o) => o.id === answer.optionId);
    return option ? optionName(option) : "—";
  }
  if (answer.kind === "text") return answer.value.trim();
  return answer.correct ? "You signed it correctly" : "You still need practice";
};

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000) % 60;
  const minutes = Math.floor(timeMs / 1000 / 60) % 60;
  const hours = Math.floor(timeMs / 1000 / 60 / 60);
  if (hours === 0)
    return [minutes, seconds]
      .map((x) => x.toString().padStart(2, "0"))
      .join(":");
  return [hours, minutes, seconds]
    .map((x) => x.toString().padStart(2, "0"))
    .join(":");
};

/* -------------------------------------------------------------------------- */
/*  Shared styling                                                             */
/* -------------------------------------------------------------------------- */

const display = "font-['Sora',sans-serif]";

const btnBase =
  "inline-flex h-[54px] items-center justify-center gap-2.5 rounded-[13px] px-6 text-[15.5px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3768] disabled:cursor-not-allowed";
const btnOutline =
  btnBase +
  " border-[1.5px] border-[#D9D4C7] bg-white text-[#1C1C24] hover:border-[#2C3768] disabled:opacity-40 disabled:hover:border-[#D9D4C7]";
const btnPrimary =
  btnBase + " bg-[#E8734A] text-white hover:brightness-105 active:brightness-95";
const btnGreen =
  btnBase + " bg-[#2F9E64] text-white hover:brightness-105 active:brightness-95";
const btnDanger =
  btnBase + " bg-[#D64545] text-white hover:brightness-105 active:brightness-95";
const btnDisabled = btnBase + " cursor-not-allowed bg-[#E7E3D9] text-[#8A887F]";

const Icon = ({
  children,
  size = 18,
  fill = "none",
}: {
  children: React.ReactNode;
  size?: number;
  fill?: string;
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={fill === "none" ? "currentColor" : "none"}
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Icon>
);
const ArrowRightIcon = () => (
  <Icon>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);
const ReplayIcon = () => (
  <Icon>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Icon>
);
const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size} fill="currentColor">
    <path d="M8 5v14l12-7z" />
  </Icon>
);
const PauseIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size} fill="currentColor">
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </Icon>
);
const FullscreenIcon = () => (
  <Icon size={17}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </Icon>
);
const BoltIcon = () => (
  <Icon size={13} fill="#E8734A">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
  </Icon>
);
const BulbIcon = () => (
  <Icon size={15}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
  </Icon>
);

/** Page frame shared by every screen: cream background, fonts, padding. */
const Shell = ({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) => {
  const lessonInfo = React.useContext(LessonInfoContext);
  return (
  <>
    <Head>
      <title>
        {lessonInfo.lessonTitle
          ? `${lessonInfo.moduleName} · ${lessonInfo.lessonTitle}`
          : "Lesson"}
      </title>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      />
    </Head>
    <div
      className={
        "flex min-h-screen flex-col bg-[#F6F4EF] px-4 py-5 font-['Plus_Jakarta_Sans',sans-serif] text-[#1C1C24] sm:px-8 lg:px-14 lg:pb-10 lg:pt-8 " +
        (center ? "items-center justify-center" : "")
      }
    >
      {children}
    </div>
  </>
  );
};

/** Loading, error and empty states, shown in the lesson frame. */
const LessonMessage = ({ title, text }: { title: string; text?: string }) => (
  <Shell center>
    <div className="flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className={display + " text-2xl font-bold"}>{title}</h1>
      {text && <p className="text-[#57564F]">{text}</p>}
      <Link href="/learn" className={btnOutline + " mt-2"}>
        <ArrowLeftIcon />
        Back to learning path
      </Link>
    </div>
  </Shell>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

// Opened from the learning path as /lesson?id=<lessonId>
const Lesson: NextPage = () => {
  const router = useRouter();
  const lessonId = Number(router.query.id);
  const hasLessonId = router.isReady && Number.isInteger(lessonId) && lessonId > 0;

  const { data, loading, error } = useQuery<LessonPlayerResult>(LOAD_LESSON_PLAYER, {
    variables: { id: String(lessonId) },
    skip: !hasLessonId,
    fetchPolicy: "network-only",
  });

  // A quiz that fails to load shouldn't block the lesson; it then ends after the units
  const { data: quizData, loading: quizLoading } = useQuery<LessonQuizResult>(LOAD_LESSONQUIZ, {
    variables: { lessonId },
    skip: !hasLessonId,
    fetchPolicy: "network-only",
  });
  const quiz = useMemo(() => toLessonQuiz(quizData), [quizData]);

  if (!router.isReady) return null;
  if (!hasLessonId) {
    return <LessonMessage title="No lesson selected" text="Pick a lesson from your learning path." />;
  }
  if (loading || quizLoading) return <LessonMessage title="Loading lesson…" />;
  if (error) return <LessonMessage title="Could not load this lesson" text={error.message} />;

  const lesson = data?.lesson;
  if (!lesson || lesson.status !== "published") {
    return <LessonMessage title="Lesson not found" text="This lesson doesn't exist or isn't available yet." />;
  }

  const units = toLessonUnits(lesson.units);
  if (units.length === 0) {
    return <LessonMessage title="Nothing to learn here yet" text="This lesson has no published units. Check back soon!" />;
  }

  const lessonInfo: LessonInfo = {
    moduleName: lesson.module?.title ?? "",
    lessonTitle: lesson.title ?? "",
    level: lesson.module?.level?.name ?? "",
    xp: lesson.xpReward ?? 0,
  };

  return (
    <LessonInfoContext.Provider value={lessonInfo}>
      <LessonScreens key={lesson.id} units={units} quiz={quiz} />
    </LessonInfoContext.Provider>
  );
};

export default Lesson;

// Teaching phase, then the lesson's quiz and result screens
const LessonScreens = ({ units, quiz }: { units: LessonUnit[]; quiz: LessonQuiz | null }) => {
  const router = useRouter();
  const questions = quiz?.questions ?? [];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<QuizAnswer | null>(null);
  const [correctAnswerShown, setCorrectAnswerShown] = useState(false);
  const [quitMessageShown, setQuitMessageShown] = useState(false);

  const startTime = useRef(Date.now());
  const endTime = useRef(startTime.current + 1000 * 60 * 3 + 1000 * 33);

  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [reviewLessonShown, setReviewLessonShown] = useState(false);

  // The teaching phase (watch each sign) that comes before the quiz
  const [isStudying, setIsStudying] = useState(true);
  const [unitIndex, setUnitIndex] = useState(0);

  // Query params are only reliable after mount; wait so we never flash (or
  // hydrate) the wrong screen for fast-forward / practice URLs.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [isStartingLesson, setIsStartingLesson] = useState(true);

  const question = questions[questionIndex];
  const isQuizFinished = questionIndex >= questions.length;
  const correctAnswerCount = questionResults.filter((r) => r.correct).length;
  const incorrectAnswerCount = questionResults.length - correctAnswerCount;
  const passThreshold = quiz?.passThreshold ?? 0;
  const correctNeeded = Math.ceil((passThreshold / 100) * questions.length);
  const passed = correctAnswerCount >= correctNeeded;

  const hearts =
    "fast-forward" in router.query &&
    !isNaN(Number(router.query["fast-forward"]))
      ? 3 - incorrectAnswerCount
      : null;

  const isAnswerCorrect = question ? isCorrectAnswer(question, answer) : false;

  const recordResult = (given: QuizAnswer | null) => {
    if (!question) return;
    setQuestionResults((results) => [
      ...results,
      {
        question: question.prompt,
        yourResponse: describeAnswer(question, given),
        correctResponse: correctResponse(question),
        correct: isCorrectAnswer(question, given),
      },
    ]);
  };

  const onCheckAnswer = () => {
    setCorrectAnswerShown(true);
    recordResult(answer);
  };

  const onSkip = () => {
    setAnswer(null);
    setCorrectAnswerShown(true);
    recordResult(null);
  };

  const onFinish = () => {
    setAnswer(null);
    setCorrectAnswerShown(false);
    setQuestionIndex((x) => x + 1);
    endTime.current = Date.now();
  };

  const restartQuiz = () => {
    setQuestionIndex(0);
    setAnswer(null);
    setCorrectAnswerShown(false);
    setQuestionResults([]);
    setReviewLessonShown(false);
    startTime.current = Date.now();
  };

  const unitNumber = Number(router.query["fast-forward"]);
  const isPractice = "practice" in router.query;

  if (!isMounted || !router.isReady) return null;

  if (hearts !== null && hearts < 0 && !correctAnswerShown) {
    return (
      <LessonFastForwardEndFail
        unitNumber={unitNumber}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts !== null && hearts >= 0 && isQuizFinished) {
    return (
      <LessonFastForwardEndPass
        unitNumber={unitNumber}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts !== null && isStartingLesson) {
    return (
      <LessonFastForwardStart
        unitNumber={unitNumber}
        setIsStartingLesson={setIsStartingLesson}
      />
    );
  }

  // Normal lessons start by learning the signs; fast-forward tests and
  // practice sessions go straight to the questions.
  if (isStudying && hearts === null && !isPractice) {
    return (
      <LearnUnits
        units={units}
        unitIndex={unitIndex}
        setUnitIndex={setUnitIndex}
        finishLabel={questions.length ? "Start quiz" : "Finish lesson"}
        onStartPractice={() => {
          setIsStudying(false);
          startTime.current = Date.now();
          endTime.current = Date.now();
        }}
      />
    );
  }

  if (isQuizFinished || !question) {
    if (!passed) {
      return (
        <QuizFailed
          correctAnswerCount={correctAnswerCount}
          total={questions.length}
          correctNeeded={correctNeeded}
          passThreshold={passThreshold}
          onRetry={restartQuiz}
          onRelearn={() => {
            restartQuiz();
            setUnitIndex(0);
            setIsStudying(true);
          }}
          reviewLessonShown={reviewLessonShown}
          setReviewLessonShown={setReviewLessonShown}
          questionResults={questionResults}
        />
      );
    }
    return (
      <LessonComplete
        correctAnswerCount={correctAnswerCount}
        incorrectAnswerCount={incorrectAnswerCount}
        startTime={startTime}
        endTime={endTime}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  return (
    <QuizQuestionScreen
      key={question.id}
      question={question}
      questionNumber={questionIndex + 1}
      questionResults={questionResults}
      total={questions.length}
      passThreshold={passThreshold}
      correctNeeded={correctNeeded}
      answer={answer}
      setAnswer={setAnswer}
      correctAnswerShown={correctAnswerShown}
      isAnswerCorrect={isAnswerCorrect}
      quitMessageShown={quitMessageShown}
      setQuitMessageShown={setQuitMessageShown}
      onCheckAnswer={onCheckAnswer}
      onFinish={onFinish}
      onSkip={onSkip}
      hearts={hearts}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Top row: back link, segmented progress, counter                            */
/* -------------------------------------------------------------------------- */

const BackLabel = ({ suffix }: { suffix?: string }) => {
  const lessonInfo = React.useContext(LessonInfoContext);
  return (
    <>
      <ArrowLeftIcon />
      <span>
        {lessonInfo.moduleName} · {lessonInfo.lessonTitle}
        {suffix && ` · ${suffix}`}
      </span>
    </>
  );
};

const SegmentedBar = ({
  done,
  total,
  label,
  current = true,
}: {
  done: number;
  total: number;
  label: string;
  /** Highlight the segment after the completed ones in coral. */
  current?: boolean;
}) => (
  <div
    className="flex h-[10px] grow gap-1.5"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={1}
    aria-valuenow={total === 0 ? 0 : done / total}
  >
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={
          "h-full flex-1 rounded-full transition-colors duration-500 " +
          (i < done
            ? "bg-[#2F9E64]"
            : i === done && current
              ? "bg-[#E8734A]"
              : "bg-[#E7E3D9]")
        }
      />
    ))}
  </div>
);

/** Quiz top row: one segment per question, green when right, red when wrong, coral for the current one. */
const QuizTopBar = ({
  questionResults,
  total,
  setQuitMessageShown,
  hearts,
}: {
  questionResults: QuestionResult[];
  total: number;
  setQuitMessageShown: (isShown: boolean) => void;
  hearts: null | number;
}) => {
  const backClass =
    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg py-2 text-sm font-bold text-[#3C3B35] hover:text-[#2C3768] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2C3768] sm:text-[14.5px]";
  const answered = questionResults.length;
  return (
    <header className="flex w-full items-center gap-4 sm:gap-7">
      {answered === 0 ? (
        <Link href="/learn" className={backClass}>
          <BackLabel suffix="Quiz" />
          <span className="sr-only">Exit lesson</span>
        </Link>
      ) : (
        <button className={backClass} onClick={() => setQuitMessageShown(true)}>
          <BackLabel suffix="Quiz" />
          <span className="sr-only">Exit lesson</span>
        </button>
      )}
      <div
        className="flex h-[10px] grow gap-1.5"
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={
              "h-full flex-1 rounded-full transition-colors duration-500 " +
              (i < answered
                ? questionResults[i]?.correct
                  ? "bg-[#2F9E64]"
                  : "bg-[#D64545]"
                : i === answered
                  ? "bg-[#E8734A]"
                  : "bg-[#E7E3D9]")
            }
          />
        ))}
      </div>
      <span className={display + " whitespace-nowrap text-[15px] font-bold"}>
        {Math.min(answered + 1, total)} / {total}
      </span>
      {hearts !== null && (
        <div className="flex gap-1" aria-label={`${Math.max(hearts, 0)} hearts left`}>
          {[1, 2, 3].map((heart) =>
            heart <= hearts ? (
              <LessonTopBarHeart key={heart} />
            ) : (
              <LessonTopBarEmptyHeart key={heart} />
            ),
          )}
        </div>
      )}
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/*  Teaching screen: video, caption, Previous / Replay / Next, info cards      */
/* -------------------------------------------------------------------------- */

const InfoCard = ({
  label,
  children,
  className = "",
  labelClassName = "",
  icon,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  icon?: React.ReactNode;
}) => (
  <section
    className={
      "rounded-2xl border border-[#E7E3D9] bg-white px-[22px] py-5 " + className
    }
  >
    <h3
      className={
        "mb-2 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#57564F] " +
        labelClassName
      }
    >
      {icon}
      {label}
    </h3>
    {children}
  </section>
);

const vbtn =
  "flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-sm font-bold text-white transition hover:bg-[#3A4780] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

const LearnUnits = ({
  units,
  unitIndex,
  setUnitIndex,
  finishLabel,
  onStartPractice,
}: {
  units: LessonUnit[];
  unitIndex: number;
  setUnitIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Text of the last unit's button, e.g. "Start quiz". */
  finishLabel: string;
  onStartPractice: () => void;
}) => {
  const unit = units[unitIndex] ?? units[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const lessonInfo = React.useContext(LessonInfoContext);

  if (!unit) return null;

  const isFirst = unitIndex === 0;
  const isLast = unitIndex === units.length - 1;

  const resetPlayer = () => {
    setPlaying(false);
    setProgress(0);
  };

  const goTo = (index: number) => {
    resetPlayer();
    setUnitIndex(index);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  const setSpeed = (isSlow: boolean) => {
    setSlow(isSlow);
    if (videoRef.current) videoRef.current.playbackRate = isSlow ? 0.5 : 1;
  };

  const seek = (value: number) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = (value / 100) * video.duration;
    }
    setProgress(value / 100);
  };

  const fullscreen = () => {
    void stageRef.current?.requestFullscreen?.();
  };

  // A unit's sign is either a video (with player controls) or a still image
  const hasImage = Boolean(unit.mediaRef) && unit.isImage;
  const hasVideo = Boolean(unit.mediaRef) && !unit.isImage;

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1328px] grow flex-col gap-6 lg:gap-[26px]">
        {/* Top row */}
        <header className="flex w-full items-center gap-4 sm:gap-7">
          <Link
            href="/learn"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg py-2 text-sm font-bold text-[#3C3B35] hover:text-[#2C3768] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2C3768] sm:text-[14.5px]"
          >
            <BackLabel />
            <span className="sr-only">Exit lesson</span>
          </Link>
          <SegmentedBar
            done={unitIndex}
            total={units.length}
            label={`Unit ${unitIndex + 1} of ${units.length}`}
          />
          <span className={display + " whitespace-nowrap text-[15px] font-bold"}>
            {unitIndex + 1} / {units.length}
          </span>
        </header>

        <div className="flex grow flex-col gap-6 lg:flex-row lg:gap-7">
          {/* Left: video, caption, navigation */}
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <div
              ref={stageRef}
              className={
                "relative flex min-h-[340px] grow flex-col items-center justify-center gap-3.5 rounded-[20px] bg-[#2C3768] lg:min-h-[420px] " +
                (hasImage ? "" : "pb-[116px]")
              }
            >
              {hasImage ? (
                <img
                  key={`${unitIndex}-${unit.mediaRef}`}
                  src={unit.mediaRef}
                  alt={`UGSL sign: ${unit.title}`}
                  className="absolute inset-0 h-full w-full rounded-[20px] object-contain p-4"
                />
              ) : hasVideo ? (
                <video
                  key={`${unitIndex}-${unit.mediaRef}`}
                  ref={videoRef}
                  src={unit.mediaRef}
                  className="absolute inset-0 h-full w-full rounded-[20px] object-contain"
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onLoadedMetadata={(e) => {
                    e.currentTarget.playbackRate = slow ? 0.5 : 1;
                  }}
                  onTimeUpdate={(e) => {
                    const { currentTime, duration } = e.currentTarget;
                    setProgress(duration > 0 ? currentTime / duration : 0);
                  }}
                />
              ) : (
                <>
                  <button
                    aria-label="Play video"
                    disabled
                    className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-[1.5px] border-white/40 bg-white/15 text-white"
                  >
                    <PlayIcon size={34} />
                  </button>
                  <div className="mt-1.5 text-center">
                    <div className={display + " text-xl font-bold text-white"}>
                      UGSL sign: {unit.title}
                    </div>
                    <div className="mt-1.5 text-sm text-[#C7CBE8]">
                      The signing video for this unit is coming soon
                    </div>
                  </div>
                </>
              )}

              {/* Video controls (images have nothing to play) */}
              {!hasImage && (
              <div className="absolute inset-x-4 bottom-4 rounded-[14px] bg-[#141A33] px-4 pb-3 pt-3.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={progress * 100}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!hasVideo}
                  aria-label="Seek"
                  className="mb-3 h-1.5 w-full cursor-pointer accent-white"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2.5">
                    <button
                      className={vbtn}
                      aria-label={playing ? "Pause" : "Play"}
                      onClick={togglePlay}
                    >
                      {playing ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button
                      className={vbtn + (!slow ? " bg-[#3A4780]" : "")}
                      aria-label="Normal speed, 1 times"
                      aria-pressed={!slow}
                      onClick={() => setSpeed(false)}
                    >
                      1×
                    </button>
                    <button
                      className={vbtn + (slow ? " bg-[#3A4780]" : "")}
                      aria-label="Slow motion, 0.5 times"
                      aria-pressed={slow}
                      onClick={() => setSpeed(true)}
                    >
                      0.5×
                    </button>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      className={vbtn + (captionsOn ? " bg-[#3A4780]" : "")}
                      aria-label="Captions"
                      aria-pressed={captionsOn}
                      onClick={() => setCaptionsOn((x) => !x)}
                    >
                      CC
                    </button>
                    <button
                      className={vbtn}
                      aria-label="Full screen"
                      onClick={fullscreen}
                    >
                      <FullscreenIcon />
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Caption */}
            <div
              className="flex min-h-[60px] items-center gap-4 rounded-[14px] bg-[#1B2340] px-6 py-4"
              aria-live="polite"
            >
              <span className="text-xs font-bold tracking-[.08em] text-[#9AA1C9]">
                CAPTION
              </span>
              {captionsOn && (
                <span className={display + " text-lg font-bold text-white"}>
                  {`"${unit.title}"`}
                </span>
              )}
            </div>

            {/* Previous / Replay / Next */}
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                className={btnOutline}
                disabled={isFirst}
                onClick={() => goTo(unitIndex - 1)}
              >
                <ArrowLeftIcon />
                Previous
              </button>
              <button
                className={btnOutline}
                disabled={!hasVideo}
                onClick={replay}
              >
                <ReplayIcon />
                Replay
              </button>
              <div className="grow" />
              <button
                className={btnPrimary + " min-w-[190px]"}
                onClick={() => (isLast ? onStartPractice() : goTo(unitIndex + 1))}
              >
                {isLast ? finishLabel : "Next"}
                <ArrowRightIcon />
              </button>
            </div>
          </div>

          {/* Right: unit details */}
          <aside className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[440px]">
            <section className="rounded-2xl border border-[#E7E3D9] bg-white px-[22px] py-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-full bg-[#EEF0FA] px-3 py-[5px] text-[12.5px] font-bold text-[#2C3768]">
                  {lessonInfo.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDEDE6] px-3 py-[5px] text-[12.5px] font-bold text-[#A8431F]">
                  <BoltIcon />+{lessonInfo.xp} XP
                </span>
                <span className="grow" />
                <span className="text-[13px] text-[#6B6A63]">
                  Unit {unitIndex + 1} of {units.length}
                </span>
              </div>
              <h1 className={display + " mt-3.5 text-[26px] font-bold"}>
                {unit.title}
              </h1>
              <p className="mt-1 text-[13px] text-[#6B6A63]">
                Lesson {lessonInfo.lessonTitle} · {lessonInfo.moduleName}
              </p>
            </section>

            <InfoCard
              label="In English"
              className="border-[#C7CBE8] bg-[#EEF0FA]"
              labelClassName="text-[#2C3768]"
            >
              <div className={display + " text-[34px] font-bold"}>
                {unit.english}
              </div>
            </InfoCard>

            {unit.meaning && (
              <InfoCard label="Meaning">
                <p className="text-[14.5px] leading-relaxed text-[#3C3B35]">
                  {unit.meaning}
                </p>
              </InfoCard>
            )}

            {unit.usage && (
              <InfoCard label="Usage & context">
                <p className="text-[14.5px] leading-relaxed text-[#3C3B35]">
                  {unit.usage}
                </p>
              </InfoCard>
            )}

            <InfoCard
              label="Learning tip"
              icon={<BulbIcon />}
              className="border-[#F0D48A] bg-[#FFF1D1]"
              labelClassName="text-[#7A4E00]"
            >
              <p className="text-[14.5px] leading-relaxed text-[#4A3300]">
                {unit.tip}
              </p>
            </InfoCard>
          </aside>
        </div>
      </div>
    </Shell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Quit confirmation                                                          */
/* -------------------------------------------------------------------------- */

const QuitMessage = ({
  quitMessageShown,
  setQuitMessageShown,
}: {
  quitMessageShown: boolean;
  setQuitMessageShown: (isShown: boolean) => void;
}) => {
  return (
    <>
      <div
        className={
          quitMessageShown
            ? "fixed bottom-0 left-0 right-0 top-0 z-30 bg-[#1B2340] bg-opacity-60 transition-all duration-300"
            : "pointer-events-none fixed bottom-0 left-0 right-0 top-0 z-30 bg-[#1B2340] bg-opacity-0 transition-all duration-300"
        }
        onClick={() => setQuitMessageShown(false)}
        aria-label="Close quit message"
        role="button"
      ></div>

      <article
        className={
          quitMessageShown
            ? "fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-4 rounded-t-3xl bg-white px-5 py-10 text-center transition-all duration-300 sm:flex-row sm:px-14"
            : "fixed -bottom-96 left-0 right-0 z-40 flex flex-col rounded-t-3xl bg-white px-5 py-10 text-center transition-all duration-300 sm:flex-row sm:px-14"
        }
        aria-hidden={!quitMessageShown}
      >
        <div className="flex grow flex-col gap-3 sm:text-left">
          <h2 className={display + " text-xl font-bold sm:text-2xl"}>
            Are you sure you want to quit?
          </h2>
          <p className="text-[#57564F] sm:text-lg">
            All progress for this lesson will be lost.
          </p>
        </div>
        <div className="flex grow flex-col items-center justify-center gap-3 sm:flex-row-reverse">
          <Link
            className={btnPrimary + " w-full sm:w-48"}
            href="/learn"
            tabIndex={quitMessageShown ? 0 : -1}
          >
            Quit
          </Link>
          <button
            className={btnOutline + " w-full sm:w-48"}
            onClick={() => setQuitMessageShown(false)}
            tabIndex={quitMessageShown ? 0 : -1}
          >
            Stay
          </button>
        </div>
      </article>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Check / Skip bar and feedback                                              */
/* -------------------------------------------------------------------------- */

const CheckAnswer = ({
  isAnswerSelected,
  isAnswerCorrect,
  correctAnswerShown,
  correctAnswer,
  onCheckAnswer,
  onFinish,
  onSkip,
  leading,
}: {
  isAnswerSelected: boolean;
  isAnswerCorrect: boolean;
  correctAnswerShown: boolean;
  correctAnswer: string;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  /** Shown on the left of the bar, e.g. a Replay button. */
  leading?: React.ReactNode;
}) => {
  return (
    <>
      <section className="mx-auto flex w-full max-w-[1328px] items-center gap-3.5 pt-6">
        {leading}
        <div className="hidden grow sm:block" />
        <button
          className={btnOutline + " hidden sm:inline-flex"}
          onClick={onSkip}
          disabled={correctAnswerShown}
        >
          Skip
        </button>
        {!isAnswerSelected ? (
          <button className={btnDisabled + " grow sm:min-w-[190px] sm:grow-0"} disabled>
            Check
          </button>
        ) : (
          <button
            onClick={onCheckAnswer}
            className={btnPrimary + " grow sm:min-w-[190px] sm:grow-0"}
          >
            Check
            <ArrowRightIcon />
          </button>
        )}
      </section>

      <div
        aria-live="polite"
        aria-hidden={!correctAnswerShown}
        className={
          correctAnswerShown
            ? isAnswerCorrect
              ? "fixed bottom-0 left-0 right-0 z-20 bg-[#E3F4EA] font-bold text-[#1F7A4B] transition-all"
              : "fixed bottom-0 left-0 right-0 z-20 bg-[#FBE4E4] font-bold text-[#B53030] transition-all"
            : "fixed -bottom-52 left-0 right-0"
        }
      >
        <div className="mx-auto flex max-w-[1328px] flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-14 sm:py-8">
          <>
            {isAnswerCorrect ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="hidden rounded-full bg-white p-4 text-[#2F9E64] sm:block">
                  <DoneSvg />
                </div>
                <div className={display + " text-2xl"}>Good job!</div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="hidden rounded-full bg-white p-4 text-[#D64545] sm:block">
                  <BigCloseSvg />
                </div>
                <div className="flex flex-col gap-2">
                  <div className={display + " text-2xl"}>Correct solution:</div>{" "}
                  <div className="text-sm font-normal">{correctAnswer}</div>
                </div>
              </div>
            )}
          </>
          <button
            onClick={onFinish}
            tabIndex={correctAnswerShown ? 0 : -1}
            className={
              (isAnswerCorrect ? btnGreen : btnDanger) +
              " w-full sm:w-auto sm:min-w-[190px]"
            }
          >
            Continue
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Quiz questions                                                             */
/* -------------------------------------------------------------------------- */

const CameraIcon = () => (
  <Icon size={17}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </Icon>
);
const StopIcon = () => (
  <Icon size={15} fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Icon>
);
const EyeIcon = () => (
  <Icon size={17}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const stageClass =
  "relative flex min-h-[340px] grow flex-col items-center justify-center gap-3.5 overflow-hidden rounded-[20px] bg-[#2C3768] lg:min-h-[420px]";
const controlsClass = "absolute inset-x-4 bottom-4 rounded-[14px] bg-[#141A33] px-4 pb-3 pt-3.5";

type SignVideoHandle = { replay: () => void };

/** The question's sign: a video with play / speed / full-screen controls, or a still image. */
const SignVideo = React.forwardRef<SignVideoHandle, { src?: string; isImage: boolean; label: string }>(
  ({ src, isImage, label }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [started, setStarted] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [slow, setSlow] = useState(false);

    const play = () => {
      const video = videoRef.current;
      if (!video) return;
      setStarted(true);
      void video.play();
    };

    useImperativeHandle(ref, () => ({
      replay: () => {
        if (videoRef.current) videoRef.current.currentTime = 0;
        play();
      },
    }));

    const togglePlay = () => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) play();
      else video.pause();
    };

    const setSpeed = (isSlow: boolean) => {
      setSlow(isSlow);
      if (videoRef.current) videoRef.current.playbackRate = isSlow ? 0.5 : 1;
    };

    const seek = (value: number) => {
      const video = videoRef.current;
      if (video && Number.isFinite(video.duration)) video.currentTime = (value / 100) * video.duration;
      setProgress(value / 100);
    };

    if (src && isImage) {
      return (
        <div className={stageClass}>
          <img src={src} alt={label} className="absolute inset-0 h-full w-full object-contain p-4" />
        </div>
      );
    }

    return (
      <div ref={stageRef} className={stageClass + " pb-[116px]"}>
        {src && (
          <video
            ref={videoRef}
            src={src}
            aria-label={label}
            className="absolute inset-0 h-full w-full object-contain"
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = slow ? 0.5 : 1;
            }}
            onTimeUpdate={(e) => {
              const { currentTime, duration } = e.currentTarget;
              setProgress(duration > 0 ? currentTime / duration : 0);
            }}
          />
        )}

        {/* Cover until the learner first presses play */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 bg-[#2C3768] pb-[116px]">
            <button
              aria-label="Play the sign"
              disabled={!src}
              onClick={play}
              className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-[1.5px] border-white/40 bg-white/15 text-white transition hover:bg-white/25 disabled:hover:bg-white/15"
            >
              <PlayIcon size={28} />
            </button>
            <div className="mt-1.5 text-center">
              <div className={display + " text-xl font-bold text-white"}>Watch the sign</div>
              <div className="mt-1.5 text-sm text-[#C7CBE8]">
                {src ? "You can replay it as many times as you like" : "The sign video for this question is coming soon"}
              </div>
            </div>
          </div>
        )}

        <div className={controlsClass}>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress * 100}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!src}
            aria-label="Seek"
            className="mb-3 h-1.5 w-full cursor-pointer accent-white"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5">
              <button className={vbtn} aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} disabled={!src}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                className={vbtn + (!slow ? " bg-[#3A4780]" : "")}
                aria-label="Normal speed, 1 times"
                aria-pressed={!slow}
                onClick={() => setSpeed(false)}
              >
                1×
              </button>
              <button
                className={vbtn + (slow ? " bg-[#3A4780]" : "")}
                aria-label="Slow motion, 0.5 times"
                aria-pressed={slow}
                onClick={() => setSpeed(true)}
              >
                0.5×
              </button>
            </div>
            <button
              className={vbtn}
              aria-label="Full screen"
              onClick={() => void stageRef.current?.requestFullscreen?.()}
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>
      </div>
    );
  },
);
SignVideo.displayName = "SignVideo";

/** Option styling: selected in navy; once checked, the right answer green and a wrong pick red. */
const optionStateClass = (option: QuizOption, selected: boolean, checked: boolean) => {
  if (checked && option.correct) return "border-[#2F9E64] bg-[#E3F4EA]";
  if (checked && selected) return "border-[#D64545] bg-[#FBE4E4]";
  if (selected) return "border-[#2C3768] bg-[#EEF0FA]";
  return "border-[#E7E3D9] bg-white hover:border-[#2C3768]";
};

const LetterBadge = ({ letter, active }: { letter: string; active: boolean }) => (
  <span
    className={
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold " +
      (active ? "bg-[#2C3768] text-white" : "bg-[#EFECE4] text-[#3C3B35]")
    }
  >
    {letter}
  </span>
);

/** Multiple choice: the answers are sign videos, shown large in the stage. */
const OptionVideoGrid = ({
  options,
  selectedId,
  checked,
  onSelect,
}: {
  options: QuizOption[];
  selectedId: number | null;
  checked: boolean;
  onSelect: (id: number) => void;
}) => (
  <div className="grid grow grid-cols-2 gap-3 rounded-[20px] bg-[#2C3768] p-3 lg:min-h-[420px]" role="radiogroup">
    {options.map((option) => {
      const selected = option.id === selectedId;
      return (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={`Sign ${option.letter}`}
          disabled={checked}
          onClick={() => onSelect(option.id)}
          className={
            "relative flex min-h-[150px] items-center justify-center overflow-hidden rounded-2xl border-[3px] bg-[#1B2340] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white " +
            (checked && option.correct
              ? "border-[#2F9E64]"
              : checked && selected
                ? "border-[#D64545]"
                : selected
                  ? "border-[#E8734A]"
                  : "border-transparent hover:border-white/40")
          }
        >
          {option.mediaRef ? (
            option.isImage ? (
              <img src={option.mediaRef} alt="" className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <video
                src={option.mediaRef}
                className="absolute inset-0 h-full w-full object-contain"
                muted
                loop
                autoPlay
                playsInline
              />
            )
          ) : (
            <span className="text-sm text-[#C7CBE8]">No video</span>
          )}
          <span className="absolute left-2.5 top-2.5">
            <LetterBadge letter={option.letter} active={selected} />
          </span>
        </button>
      );
    })}
  </div>
);

/** Sign recall: no video, just the thing to sign; the answer appears once revealed. */
const PromptStage = ({ prompt, answer, revealed }: { prompt: string; answer: string; revealed: boolean }) => (
  <div className={stageClass + " px-6 text-center"}>
    <div className="text-xs font-bold uppercase tracking-[.08em] text-[#9AA1C9]">Sign it from memory</div>
    <div className={display + " text-3xl font-bold text-white sm:text-4xl"}>{prompt}</div>
    {revealed && (
      <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4">
        <div className="text-xs font-bold uppercase tracking-[.08em] text-[#C7CBE8]">Answer</div>
        <div className={display + " mt-1 text-5xl font-bold text-white"}>{answer}</div>
      </div>
    )}
  </div>
);

type RecorderState = "idle" | "live" | "recording" | "recorded" | "error";

/** Video record: the learner films themselves signing. The clip stays on their device. */
const CameraRecorder = ({ onAttempted, disabled }: { onAttempted: () => void; disabled: boolean }) => {
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  // Turn the camera off when the question changes or the page closes
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => () => void (clipUrl && URL.revokeObjectURL(clipUrl)), [clipUrl]);
  useEffect(() => {
    if (liveRef.current && (state === "live" || state === "recording")) liveRef.current.srcObject = streamRef.current;
  }, [state]);

  const startCamera = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setState("live");
    } catch {
      setState("error");
      onAttempted();
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      setClipUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      setState("recorded");
      onAttempted();
    };
    recorderRef.current = recorder;
    recorder.start();
    setState("recording");
  };

  return (
    <div className={stageClass + " pb-[92px]"}>
      {(state === "live" || state === "recording") && (
        <video ref={liveRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
      )}
      {state === "recorded" && clipUrl && (
        <video src={clipUrl} controls loop autoPlay playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-contain" />
      )}
      {state === "idle" && (
        <div className="px-6 text-center">
          <div className={display + " text-xl font-bold text-white"}>Record your sign</div>
          <div className="mt-1.5 text-sm text-[#C7CBE8]">Your video stays on this device</div>
        </div>
      )}
      {state === "error" && (
        <div className="max-w-sm px-6 text-center">
          <div className={display + " text-xl font-bold text-white"}>Camera unavailable</div>
          <div className="mt-1.5 text-sm text-[#C7CBE8]">
            Sign in front of a mirror instead, then check your answer.
          </div>
        </div>
      )}
      {state === "recording" && (
        <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-[#D64545] px-3 py-1 text-xs font-bold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Recording
        </span>
      )}

      {state !== "error" && (
        <div className={controlsClass + " flex justify-center gap-2.5"}>
          {state === "idle" && (
            <button className={vbtn + " bg-[#3A4780]"} onClick={() => void startCamera()} disabled={disabled}>
              <CameraIcon />
              Turn on camera
            </button>
          )}
          {state === "live" && (
            <button className={vbtn + " bg-[#D64545] hover:bg-[#C03B3B]"} onClick={startRecording} disabled={disabled}>
              <span className="h-3 w-3 rounded-full bg-white" />
              Record
            </button>
          )}
          {state === "recording" && (
            <button className={vbtn + " bg-[#3A4780]"} onClick={() => recorderRef.current?.stop()}>
              <StopIcon />
              Stop
            </button>
          )}
          {state === "recorded" && (
            <button className={vbtn + " bg-[#3A4780]"} onClick={() => setState("live")} disabled={disabled}>
              <ReplayIcon />
              Retake
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const QUESTION_HINTS: Record<QuestionType, string> = {
  watch_match: "Watch the sign, then choose your answer.",
  multiple_choice: "Watch each sign, then choose the one that matches.",
  fill_blank: "Watch the sign, then type what you see.",
  sign_recall: "Sign it yourself, then reveal the answer and mark how you did.",
  video_record: "Record yourself signing, then compare with the answer.",
};

/** For signed answers there is nothing to auto-check: reveal the answer, then the learner marks themselves. */
const SelfCheck = ({
  question,
  revealed,
  onReveal,
  canReveal,
  answer,
  setAnswer,
  checked,
}: {
  question: QuizQuestion;
  revealed: boolean;
  onReveal: () => void;
  canReveal: boolean;
  answer: QuizAnswer | null;
  setAnswer: (answer: QuizAnswer) => void;
  checked: boolean;
}) => {
  if (!revealed) {
    return (
      <div className="flex flex-col gap-2">
        <button className={btnOutline + " w-full"} onClick={onReveal} disabled={!canReveal}>
          <EyeIcon />
          Show answer
        </button>
        {!canReveal && <p className="text-center text-[13px] text-[#6B6A63]">Record your sign first.</p>}
      </div>
    );
  }

  const verdict = answer?.kind === "self" ? answer.correct : null;
  const choice = (correct: boolean, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={verdict === correct}
      disabled={checked}
      onClick={() => setAnswer({ kind: "self", correct })}
      className={
        "flex min-h-[64px] items-center justify-center rounded-2xl border-2 px-4 text-[15px] font-bold transition " +
        (verdict === correct ? "border-[#2C3768] bg-[#EEF0FA] text-[#2C3768]" : "border-[#E7E3D9] bg-white hover:border-[#2C3768]")
      }
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {question.type === "video_record" && (
        <div className="rounded-2xl border border-[#C7CBE8] bg-[#EEF0FA] px-5 py-4">
          <div className="text-[11.5px] font-bold uppercase tracking-[.07em] text-[#2C3768]">Answer</div>
          <div className={display + " mt-1 text-[28px] font-bold"}>{question.answerText}</div>
          {question.mediaRef &&
            (question.isImage ? (
              <img src={question.mediaRef} alt={`Sign: ${question.answerText}`} className="mt-3 max-h-48 w-full rounded-xl object-contain" />
            ) : (
              <video src={question.mediaRef} controls playsInline className="mt-3 max-h-48 w-full rounded-xl bg-black" />
            ))}
        </div>
      )}
      <div className="text-[13px] font-semibold text-[#57564F]">Did your sign match?</div>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Did your sign match?">
        {choice(true, "I got it right")}
        {choice(false, "Not yet")}
      </div>
    </div>
  );
};

const QuizQuestionScreen = ({
  question,
  questionNumber,
  questionResults,
  total,
  passThreshold,
  correctNeeded,
  answer,
  setAnswer,
  correctAnswerShown,
  isAnswerCorrect,
  quitMessageShown,
  setQuitMessageShown,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  question: QuizQuestion;
  questionNumber: number;
  questionResults: QuestionResult[];
  total: number;
  passThreshold: number;
  correctNeeded: number;
  answer: QuizAnswer | null;
  setAnswer: (answer: QuizAnswer | null) => void;
  correctAnswerShown: boolean;
  isAnswerCorrect: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const signRef = useRef<SignVideoHandle>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const hasSignVideo = question.type === "watch_match" || question.type === "fill_blank";
  const selectedId = answer?.kind === "option" ? answer.optionId : null;
  const isAnswerSelected = answer !== null && (answer.kind !== "text" || answer.value.trim() !== "");
  const selectOption = (optionId: number) => setAnswer({ kind: "option", optionId });

  const stage = (() => {
    switch (question.type) {
      case "watch_match":
      case "fill_blank":
        return <SignVideo ref={signRef} src={question.mediaRef} isImage={question.isImage} label="Sign to identify" />;
      case "multiple_choice":
        return (
          <OptionVideoGrid
            options={question.options}
            selectedId={selectedId}
            checked={correctAnswerShown}
            onSelect={selectOption}
          />
        );
      case "sign_recall":
        return <PromptStage prompt={question.prompt} answer={question.answerText} revealed={revealed} />;
      case "video_record":
        return <CameraRecorder onAttempted={() => setAttempted(true)} disabled={correctAnswerShown} />;
    }
  })();

  const answerArea = (() => {
    switch (question.type) {
      case "watch_match":
      case "multiple_choice":
        return (
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={question.prompt}>
            {question.options.map((option) => {
              const selected = option.id === selectedId;
              const textOnly = question.type === "watch_match";
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={correctAnswerShown}
                  onClick={() => selectOption(option.id)}
                  className={
                    "flex min-h-[76px] items-center gap-3.5 rounded-2xl border-2 px-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3768] " +
                    optionStateClass(option, selected, correctAnswerShown)
                  }
                >
                  <LetterBadge letter={option.letter} active={selected} />
                  <span className={display + (textOnly ? " text-[26px] font-bold" : " text-[15px] font-bold")}>
                    {textOnly ? option.label : option.label || `Sign ${option.letter}`}
                  </span>
                </button>
              );
            })}
          </div>
        );
      case "fill_blank":
        return (
          <input
            autoFocus
            value={answer?.kind === "text" ? answer.value : ""}
            onChange={(e) => setAnswer({ kind: "text", value: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && isAnswerSelected && !correctAnswerShown && onCheckAnswer()}
            disabled={correctAnswerShown}
            placeholder="Type your answer"
            aria-label="Your answer"
            className={
              display +
              " h-[76px] w-full rounded-2xl border-2 border-[#E7E3D9] bg-white px-5 text-[26px] font-bold outline-none transition focus:border-[#2C3768]"
            }
          />
        );
      case "sign_recall":
      case "video_record":
        return (
          <SelfCheck
            question={question}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            canReveal={question.type === "sign_recall" || attempted}
            answer={answer}
            setAnswer={setAnswer}
            checked={correctAnswerShown}
          />
        );
    }
  })();

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1328px] grow flex-col gap-6 lg:gap-[26px]">
        <QuizTopBar
          questionResults={questionResults}
          total={total}
          setQuitMessageShown={setQuitMessageShown}
          hearts={hearts}
        />

        <div className="flex grow flex-col gap-6 lg:flex-row lg:gap-7">
          <div className="flex min-w-0 flex-1 flex-col">{stage}</div>

          <aside className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[440px]">
            <section className="rounded-2xl border border-[#E7E3D9] bg-white px-[22px] py-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-[#EEF0FA] px-3 py-[5px] text-[12.5px] font-bold text-[#2C3768]">
                  Quiz
                </span>
                <span className="text-[13px] text-[#6B6A63]">
                  Question {questionNumber} of {total}
                </span>
              </div>
              <h1 className={display + " mt-3.5 text-[26px] font-bold leading-tight"}>{question.prompt}</h1>
              <p className="mb-4 mt-1.5 text-[13px] text-[#6B6A63]">{QUESTION_HINTS[question.type]}</p>
              {answerArea}
            </section>

            <div className="flex items-center gap-2 rounded-[14px] border border-[#F0D48A] bg-[#FFF1D1] px-4 py-3 text-[13px] font-semibold text-[#4A3300]">
              <BulbIcon />
              Pass mark {passThreshold}% · you need {correctNeeded} of {total} correct
            </div>
          </aside>
        </div>
      </div>

      <CheckAnswer
        correctAnswer={correctResponse(question)}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={isAnswerSelected}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
        leading={
          hasSignVideo && question.mediaRef && !question.isImage ? (
            <button className={btnOutline} onClick={() => signRef.current?.replay()}>
              <ReplayIcon />
              Replay
            </button>
          ) : undefined
        }
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </Shell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Result screens                                                             */
/* -------------------------------------------------------------------------- */

const ResultActions = ({
  onReview,
  children,
}: {
  onReview: () => void;
  children: React.ReactNode;
}) => (
  <section className="mx-auto flex w-full max-w-[1328px] items-center gap-3.5 pt-2">
    <button className={btnOutline + " hidden sm:inline-flex"} onClick={onReview}>
      Review lesson
    </button>
    <div className="hidden grow sm:block" />
    {children}
  </section>
);

const LessonComplete = ({
  correctAnswerCount,
  incorrectAnswerCount,
  startTime,
  endTime,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  startTime: React.MutableRefObject<number>;
  endTime: React.MutableRefObject<number>;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const router = useRouter();
  const isPractice = "practice" in router.query;
  const lessonInfo = React.useContext(LessonInfoContext);
  const answered = correctAnswerCount + incorrectAnswerCount;

  const increaseXp = useBoundStore((x) => x.increaseXp);
  const addToday = useBoundStore((x) => x.addToday);
  const increaseLingots = useBoundStore((x) => x.increaseLingots);
  const increaseLessonsCompleted = useBoundStore(
    (x) => x.increaseLessonsCompleted,
  );

  const stat =
    "min-w-[130px] overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white text-center";
  return (
    <Shell>
      <div className="flex grow flex-col items-center justify-center gap-8">
        <h1 className={display + " text-center text-3xl font-bold"}>
          Lesson Complete!
        </h1>
        <div className="flex flex-wrap justify-center gap-4">
          <div className={stat}>
            <h2 className="bg-[#FFF1D1] py-2 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#7A4E00]">
              Total XP
            </h2>
            <div className={display + " py-5 text-2xl font-bold"}>
              {lessonInfo.xp}
            </div>
          </div>
          <div className={stat}>
            <h2 className="bg-[#EEF0FA] py-2 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#2C3768]">
              Committed
            </h2>
            <div className={display + " py-5 text-2xl font-bold"}>
              {formatTime(endTime.current - startTime.current)}
            </div>
          </div>
          <div className={stat}>
            <h2 className="bg-[#E3F4EA] py-2 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#1F7A4B]">
              Amazing
            </h2>
            <div className={display + " py-5 text-2xl font-bold"}>
              {/* A lesson without a quiz has nothing to score */}
              {answered ? Math.round((correctAnswerCount / answered) * 100) : 100}%
            </div>
          </div>
        </div>
      </div>
      <ResultActions onReview={() => setReviewLessonShown(true)}>
        <Link
          className={btnPrimary + " w-full sm:w-auto sm:min-w-[190px]"}
          href="/learn"
          onClick={() => {
            increaseXp(lessonInfo.xp);
            addToday();
            increaseLingots(isPractice ? 0 : 1);
            if (!isPractice) {
              increaseLessonsCompleted();
            }
            // saveQuizAttempt();
          }}
        >
          Continue
          <ArrowRightIcon />
        </Link>
      </ResultActions>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </Shell>
  );
};

/** Quiz finished below the pass mark: try again, or rewatch the lesson's signs first. */
const QuizFailed = ({
  correctAnswerCount,
  total,
  correctNeeded,
  passThreshold,
  onRetry,
  onRelearn,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  correctAnswerCount: number;
  total: number;
  correctNeeded: number;
  passThreshold: number;
  onRetry: () => void;
  onRelearn: () => void;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => (
  <Shell>
    <div className="flex grow flex-col items-center justify-center gap-5 text-center">
      <h1 className={display + " text-3xl font-bold"}>Almost there!</h1>
      <p className="max-w-md text-lg text-[#57564F]">
        You got {correctAnswerCount} of {total} right. You need {correctNeeded} ({passThreshold}%) to pass
        this lesson. Retakes are unlimited.
      </p>
    </div>
    <ResultActions onReview={() => setReviewLessonShown(true)}>
      <button className={btnOutline + " w-full sm:w-auto"} onClick={onRelearn}>
        <ReplayIcon />
        Watch the signs again
      </button>
      <button className={btnPrimary + " w-full sm:w-auto sm:min-w-[190px]"} onClick={onRetry}>
        Try again
        <ArrowRightIcon />
      </button>
    </ResultActions>
    <ReviewLesson
      reviewLessonShown={reviewLessonShown}
      setReviewLessonShown={setReviewLessonShown}
      questionResults={questionResults}
    />
  </Shell>
);

type QuestionResult = {
  question: string;
  yourResponse: string;
  correctResponse: string;
  correct: boolean;
};

const ReviewLesson = ({
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const [selectedQuestionResult, setSelectedQuestionResult] =
    useState<null | QuestionResult>(null);
  return (
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center p-5 transition duration-300",
        reviewLessonShown ? "" : "pointer-events-none opacity-0",
      ].join(" ")}
      aria-hidden={!reviewLessonShown}
    >
      <div
        className={[
          "absolute inset-0 bg-[#1B2340]",
          reviewLessonShown ? "opacity-75" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setReviewLessonShown(false)}
      ></div>
      <div className="relative flex w-full max-w-4xl flex-col gap-5 rounded-3xl border border-[#E7E3D9] bg-[#F6F4EF] p-8">
        <button
          className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#E7E3D9] bg-white text-[#57564F] hover:text-[#1C1C24]"
          onClick={() => setReviewLessonShown(false)}
          tabIndex={reviewLessonShown ? 0 : -1}
        >
          <BigCloseSvg className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </button>
        <h2 className={display + " text-center text-3xl font-bold"}>
          Check out your scorecard!
        </h2>
        <p className="text-center text-lg text-[#57564F]">
          Click the tiles below to reveal the solutions
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {questionResults.map((questionResult, i) => {
            return (
              <button
                key={i}
                tabIndex={reviewLessonShown ? 0 : -1}
                className={[
                  "relative flex flex-col items-stretch gap-3 rounded-2xl p-5 text-left",
                  questionResult.correct
                    ? "bg-[#E3F4EA] text-[#1F7A4B]"
                    : "bg-[#FBE4E4] text-[#B53030]",
                ].join(" ")}
                onClick={() =>
                  setSelectedQuestionResult((selectedQuestionResult) =>
                    selectedQuestionResult === questionResult
                      ? null
                      : questionResult,
                  )
                }
              >
                <div className="flex justify-between gap-2">
                  <h3 className="font-bold">{questionResult.question}</h3>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    {questionResult.correct ? (
                      <DoneSvg className="h-5 w-5" />
                    ) : (
                      <BigCloseSvg className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div>{questionResult.yourResponse}</div>
                {selectedQuestionResult === questionResult && (
                  <div className="absolute left-1 right-1 top-20 z-10 rounded-2xl border border-[#E7E3D9] bg-white p-3 text-sm tracking-tighter shadow-lg">
                    <div
                      className="absolute -top-2 h-3 w-3 rotate-45 border-l border-t border-[#E7E3D9] bg-white"
                      style={{ left: "calc(50% - 6px)" }}
                    ></div>
                    <div className="font-bold uppercase text-[#57564F]">
                      Your response:
                    </div>
                    <div className="mb-3 text-[#1C1C24]">
                      {questionResult.yourResponse}
                    </div>
                    <div className="font-bold uppercase text-[#57564F]">
                      Correct response:
                    </div>
                    <div className="text-[#1C1C24]">
                      {questionResult.correctResponse}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FastForwardScreen = ({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  children: React.ReactNode;
}) => (
  <Shell>
    <div className="flex grow flex-col items-center justify-center gap-5 text-center">
      {icon}
      <h1 className={display + " text-2xl font-bold"}>{title}</h1>
      {text && <p className="text-lg text-[#57564F]">{text}</p>}
    </div>
    {children}
  </Shell>
);

const LessonFastForwardStart = ({
  unitNumber,
  setIsStartingLesson,
}: {
  unitNumber: number;
  setIsStartingLesson: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <FastForwardScreen
      icon={<LessonFastForwardStartSvg />}
      title={`Want to jump to Unit ${unitNumber}?`}
      text={`Pass the test to jump ahead. We won't make it easy for you though.`}
    >
      <section className="mx-auto flex w-full max-w-[1328px] flex-col-reverse items-center gap-4 pt-2 sm:flex-row sm:justify-between">
        <Link
          href="/learn"
          className="rounded-lg px-2 py-3 font-bold text-[#2C3768] transition hover:underline"
        >
          Maybe later
        </Link>
        <button
          className={btnPrimary + " w-full sm:w-auto sm:min-w-[190px]"}
          onClick={() => setIsStartingLesson(false)}
        >
          {`Let's go`}
          <ArrowRightIcon />
        </button>
      </section>
    </FastForwardScreen>
  );
};

const LessonFastForwardEndFail = ({
  unitNumber,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  unitNumber: number;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  return (
    <FastForwardScreen
      icon={<LessonFastForwardEndFailSvg />}
      title={`You didn't unlock Unit ${unitNumber}`}
      text={`Don't worry! Practice makes perfect.`}
    >
      <ResultActions onReview={() => setReviewLessonShown(true)}>
        <Link
          className={btnPrimary + " w-full sm:w-auto sm:min-w-[190px]"}
          href="/learn"
        >
          Continue
          <ArrowRightIcon />
        </Link>
      </ResultActions>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </FastForwardScreen>
  );
};

const LessonFastForwardEndPass = ({
  unitNumber,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  unitNumber: number;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const jumpToUnit = useBoundStore((x) => x.jumpToUnit);
  return (
    <FastForwardScreen
      icon={<LessonFastForwardEndPassSvg />}
      title={`You unlocked Unit ${unitNumber}!`}
      text="Way to go! You’re making great strides!"
    >
      <ResultActions onReview={() => setReviewLessonShown(true)}>
        <Link
          className={btnGreen + " w-full sm:w-auto sm:min-w-[190px]"}
          href="/learn"
          onClick={() => jumpToUnit(unitNumber)}
        >
          Continue
          <ArrowRightIcon />
        </Link>
      </ResultActions>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </FastForwardScreen>
  );
};
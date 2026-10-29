import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  AppleSvg,
  BigCloseSvg,
  BoySvg,
  DoneSvg,
  LessonFastForwardEndFailSvg,
  LessonFastForwardEndPassSvg,
  LessonFastForwardStartSvg,
  LessonTopBarEmptyHeart,
  LessonTopBarHeart,
  WomanSvg,
} from "~/components/Svgs";
import womanPng from "../../public/woman.png";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client/react";
import { env } from "~/env.mjs";
import { LOAD_LESSON_PLAYER, LOAD_LESSON_UNITS } from "~/gql/lessons";

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

const lessonProblem1 = {
  type: "SELECT_1_OF_3",
  question: `Which one of these is "the apple"?`,
  answers: [
    { icon: <AppleSvg />, name: "la manzana" },
    { icon: <BoySvg />, name: "el niño" },
    { icon: <WomanSvg />, name: "la mujer" },
  ],
  correctAnswer: 0,
} as const;

const lessonProblem2 = {
  type: "WRITE_IN_ENGLISH",
  question: "El niño",
  answerTiles: ["woman", "milk", "water", "I", "The", "boy"],
  correctAnswer: [4, 5],
} as const;

const lessonProblems = [lessonProblem1, lessonProblem2];

const numbersEqual = (a: readonly number[], b: readonly number[]): boolean => {
  return a.length === b.length && a.every((_, i) => a[i] === b[i]);
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
    variables: { id: String(lessonId), lessonId },
    skip: !hasLessonId,
    fetchPolicy: "network-only",
  });

  console.log("ccccccccccccccccc",data);
  // const { data, loading, error } = useQuery<LessonUnitsResult>(LOAD_LESSON_UNITS, {
  //   variables: { id: String(lessonId), lessonId },
  //   skip: !hasLessonId,
  //   fetchPolicy: "network-only",
  // });

  if (!router.isReady) return null;
  if (!hasLessonId) {
    return <LessonMessage title="No lesson selected" text="Pick a lesson from your learning path." />;
  }
  if (loading) return <LessonMessage title="Loading lesson…" />;
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
      <LessonScreens key={lesson.id} units={units} />
    </LessonInfoContext.Provider>
  );
};

export default Lesson;

// Teaching phase, then practice problems and result screens
const LessonScreens = ({ units }: { units: LessonUnit[] }) => {
  const router = useRouter();

  const [lessonProblem, setLessonProblem] = useState(0);
  const [correctAnswerCount, setCorrectAnswerCount] = useState(0);
  const [incorrectAnswerCount, setIncorrectAnswerCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<null | number>(null);
  const [correctAnswerShown, setCorrectAnswerShown] = useState(false);
  const [quitMessageShown, setQuitMessageShown] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);

  const startTime = useRef(Date.now());
  const endTime = useRef(startTime.current + 1000 * 60 * 3 + 1000 * 33);

  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [reviewLessonShown, setReviewLessonShown] = useState(false);

  // New: the teaching phase (watch each sign) that comes before the practice.
  const [isStudying, setIsStudying] = useState(true);
  const [unitIndex, setUnitIndex] = useState(0);

  // Query params are only reliable after mount; wait so we never flash (or
  // hydrate) the wrong screen for fast-forward / practice URLs.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const problem = lessonProblems[lessonProblem] ?? lessonProblem1;

  const totalCorrectAnswersNeeded = 2;

  const [isStartingLesson, setIsStartingLesson] = useState(true);
  const hearts =
    "fast-forward" in router.query &&
    !isNaN(Number(router.query["fast-forward"]))
      ? 3 - incorrectAnswerCount
      : null;

  const { correctAnswer } = problem;
  const isAnswerCorrect = Array.isArray(correctAnswer)
    ? numbersEqual(selectedAnswers, correctAnswer)
    : selectedAnswer === correctAnswer;

  const onCheckAnswer = () => {
    setCorrectAnswerShown(true);
    if (isAnswerCorrect) {
      setCorrectAnswerCount((x) => x + 1);
    } else {
      setIncorrectAnswerCount((x) => x + 1);
    }
    setQuestionResults((questionResults) => [
      ...questionResults,
      {
        question: problem.question,
        yourResponse:
          problem.type === "SELECT_1_OF_3"
            ? problem.answers[selectedAnswer ?? 0]?.name ?? ""
            : selectedAnswers.map((i) => problem.answerTiles[i]).join(" "),
        correctResponse:
          problem.type === "SELECT_1_OF_3"
            ? problem.answers[problem.correctAnswer].name
            : problem.correctAnswer
                .map((i) => problem.answerTiles[i])
                .join(" "),
      },
    ]);
  };

  const onFinish = () => {
    setSelectedAnswer(null);
    setSelectedAnswers([]);
    setCorrectAnswerShown(false);
    setLessonProblem((x) => (x + 1) % lessonProblems.length);
    endTime.current = Date.now();
  };

  const onSkip = () => {
    setSelectedAnswer(null);
    setCorrectAnswerShown(true);
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

  if (
    hearts !== null &&
    hearts >= 0 &&
    !correctAnswerShown &&
    correctAnswerCount >= totalCorrectAnswersNeeded
  ) {
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
        onStartPractice={() => setIsStudying(false)}
      />
    );
  }

  if (correctAnswerCount >= totalCorrectAnswersNeeded && !correctAnswerShown) {
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

  switch (problem.type) {
    case "SELECT_1_OF_3": {
      return (
        <ProblemSelect1Of3
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }

    case "WRITE_IN_ENGLISH": {
      return (
        <ProblemWriteInEnglish
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswers={selectedAnswers}
          setSelectedAnswers={setSelectedAnswers}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }
  }
};

/* -------------------------------------------------------------------------- */
/*  Top row: back link, segmented progress, counter                            */
/* -------------------------------------------------------------------------- */

const BackLabel = () => {
  const lessonInfo = React.useContext(LessonInfoContext);
  return (
    <>
      <ArrowLeftIcon />
      <span>
        {lessonInfo.moduleName} · {lessonInfo.lessonTitle}
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

const ProgressBar = ({
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  setQuitMessageShown,
  hearts,
}: {
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  setQuitMessageShown: (isShown: boolean) => void;
  hearts: null | number;
}) => {
  const backClass =
    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg py-2 text-sm font-bold text-[#3C3B35] hover:text-[#2C3768] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2C3768] sm:text-[14.5px]";
  return (
    <header className="flex w-full items-center gap-4 sm:gap-7">
      {correctAnswerCount === 0 ? (
        <Link href="/learn" className={backClass}>
          <BackLabel />
          <span className="sr-only">Exit lesson</span>
        </Link>
      ) : (
        <button className={backClass} onClick={() => setQuitMessageShown(true)}>
          <BackLabel />
          <span className="sr-only">Exit lesson</span>
        </button>
      )}
      <SegmentedBar
        done={correctAnswerCount}
        total={totalCorrectAnswersNeeded}
        label="Lesson progress"
      />
      <span className={display + " whitespace-nowrap text-[15px] font-bold"}>
        {Math.min(correctAnswerCount + 1, totalCorrectAnswersNeeded)} /{" "}
        {totalCorrectAnswersNeeded}
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
  onStartPractice,
}: {
  units: LessonUnit[];
  unitIndex: number;
  setUnitIndex: React.Dispatch<React.SetStateAction<number>>;
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
                {isLast ? "Start practice" : "Next"}
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
}: {
  isAnswerSelected: boolean;
  isAnswerCorrect: boolean;
  correctAnswerShown: boolean;
  correctAnswer: string;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
}) => {
  return (
    <>
      <section className="mx-auto flex w-full max-w-[1328px] items-center gap-3.5 pt-2">
        <button className={btnOutline + " hidden sm:inline-flex"} onClick={onSkip}>
          Skip
        </button>
        <div className="hidden grow sm:block" />
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
/*  Practice problems                                                          */
/* -------------------------------------------------------------------------- */

const ProblemSelect1Of3 = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswer,
  setSelectedAnswer,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: typeof lessonProblem1;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswer: number | null;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<number | null>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, answers, correctAnswer } = problem;

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1328px] grow flex-col gap-6 lg:gap-[26px]">
        <ProgressBar
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          setQuitMessageShown={setQuitMessageShown}
          hearts={hearts}
        />
        <section className="mx-auto flex w-full max-w-2xl grow flex-col justify-center gap-8 pb-24 sm:gap-12">
          <div>
            <span className="inline-flex rounded-full bg-[#EEF0FA] px-3 py-[5px] text-[12.5px] font-bold text-[#2C3768]">
              Choose the sign
            </span>
            <h1 className={display + " mt-3 text-2xl font-bold sm:text-3xl"}>
              {question}
            </h1>
          </div>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label={question}
          >
            {answers.map((answer, i) => {
              return (
                <button
                  key={i}
                  type="button"
                  className={
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3768] " +
                    (i === selectedAnswer
                      ? "border-[#2C3768] bg-[#EEF0FA] text-[#2C3768]"
                      : "border-[#E7E3D9] bg-white hover:border-[#2C3768]")
                  }
                  role="radio"
                  aria-checked={i === selectedAnswer}
                  onClick={() => setSelectedAnswer(i)}
                >
                  {answer.icon}
                  <h2 className="text-center font-semibold">{answer.name}</h2>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={answers[correctAnswer].name}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswer !== null}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </Shell>
  );
};

const ProblemWriteInEnglish = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswers,
  setSelectedAnswers,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: typeof lessonProblem2;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswers: number[];
  setSelectedAnswers: React.Dispatch<React.SetStateAction<number[]>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, correctAnswer, answerTiles } = problem;

  const tile =
    "min-h-[44px] rounded-xl border-2 bg-white px-3.5 py-2 font-semibold text-[#1C1C24] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3768] ";

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1328px] grow flex-col gap-6 lg:gap-[26px]">
        <ProgressBar
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          setQuitMessageShown={setQuitMessageShown}
          hearts={hearts}
        />
        <section className="mx-auto flex w-full max-w-2xl grow flex-col justify-center gap-8 pb-24 sm:gap-10">
          <div>
            <span className="inline-flex rounded-full bg-[#EEF0FA] px-3 py-[5px] text-[12.5px] font-bold text-[#2C3768]">
              Translate
            </span>
            <h1 className={display + " mt-3 text-2xl font-bold sm:text-3xl"}>
              Write this in English
            </h1>
          </div>

          <div className="w-full">
            <div className="flex items-center gap-2 px-2">
              <Image src={womanPng} alt="" width={92} height={115} />
              <div className="relative ml-2 w-fit rounded-2xl border-2 border-[#E7E3D9] bg-white p-4 font-semibold">
                {question}
                <div
                  className="absolute h-4 w-4 rotate-45 border-b-2 border-l-2 border-[#E7E3D9] bg-white"
                  style={{
                    top: "calc(50% - 8px)",
                    left: "-10px",
                  }}
                ></div>
              </div>
            </div>

            <div
              className="mt-3 flex min-h-[64px] flex-wrap gap-2 rounded-2xl border-2 border-dashed border-[#D9D4C7] bg-white/60 p-2"
              aria-label="Your answer"
            >
              {selectedAnswers.map((i) => {
                return (
                  <button
                    key={i}
                    className={tile + "border-[#2C3768] hover:bg-[#EEF0FA]"}
                    onClick={() => {
                      setSelectedAnswers((selectedAnswers) => {
                        return selectedAnswers.filter((x) => x !== i);
                      });
                    }}
                  >
                    {answerTiles[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {answerTiles.map((answerTile, i) => {
              return (
                <button
                  key={i}
                  className={
                    selectedAnswers.includes(i)
                      ? tile + "border-[#E7E3D9] !bg-[#E7E3D9] text-[#E7E3D9]"
                      : tile + "border-[#D9D4C7] hover:border-[#2C3768]"
                  }
                  disabled={selectedAnswers.includes(i)}
                  onClick={() =>
                    setSelectedAnswers((selectedAnswers) => {
                      if (selectedAnswers.includes(i)) {
                        return selectedAnswers;
                      }
                      return [...selectedAnswers, i];
                    })
                  }
                >
                  {answerTile}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={correctAnswer.map((i) => answerTiles[i]).join(" ")}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswers.length > 0}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
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
              {correctAnswerCount}
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
              {Math.round(
                (correctAnswerCount /
                  (correctAnswerCount + incorrectAnswerCount)) *
                  100,
              )}
              %
            </div>
          </div>
        </div>
      </div>
      <ResultActions onReview={() => setReviewLessonShown(true)}>
        <Link
          className={btnPrimary + " w-full sm:w-auto sm:min-w-[190px]"}
          href="/learn"
          onClick={() => {
            increaseXp(correctAnswerCount);
            addToday();
            increaseLingots(isPractice ? 0 : 1);
            if (!isPractice) {
              increaseLessonsCompleted();
            }
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

type QuestionResult = {
  question: string;
  yourResponse: string;
  correctResponse: string;
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
                  questionResult.yourResponse === questionResult.correctResponse
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
                    {questionResult.yourResponse ===
                    questionResult.correctResponse ? (
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

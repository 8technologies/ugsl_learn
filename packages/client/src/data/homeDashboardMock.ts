// Placeholder data for the Home dashboard until the learner/quiz GraphQL
// modules grow real queries backed by LearnerProgress, Lesson, Module, etc.
// (packages/server/schema/learner and schema/quiz are still bare type
// stubs). Swap this for a real `useQuery` once those exist — the shape
// here is what the Home page expects back.
export type HomeDashboardData = {
  continueLesson: {
    moduleName: string;
    levelName: string;
    lessonTitle: string;
    lessonNumber: number;
    totalLessons: number;
    xpReward: number;
    videoLabel: string;
  };
  stats: {
    lessonsCompleted: number;
    level: string;
    minutesLeftToday: number;
  };
  dailyChallenge: {
    title: string;
    done: number;
    total: number;
    xpReward: number;
  };
};

export const HOME_DASHBOARD_MOCK: HomeDashboardData = {
  continueLesson: {
    moduleName: "Greetings & Introductions",
    levelName: "Beginner",
    lessonTitle: '"What Is Your Name?"',
    lessonNumber: 4,
    totalLessons: 7,
    xpReward: 20,
    videoLabel: "Real UGSL signing video",
  },
  stats: {
    lessonsCompleted: 24,
    level: "Beginner",
    minutesLeftToday: 8,
  },
  dailyChallenge: {
    title: "Sign 5 new words today",
    done: 2,
    total: 5,
    xpReward: 30,
  },
};

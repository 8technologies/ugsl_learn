// Placeholder learning-path data until real Level/Module/Lesson + learner
// progress queries exist (packages/server/schema/learner is still a bare
// type stub). Swap this for a real `useQuery` later — the shape here is
// what the Learn page expects back.
export type LearningNodeStatus = "done" | "current" | "locked";

export type LearningNode = {
  id: string;
  label: string;
  xp: number;
  status: LearningNodeStatus;
};

export type LearningUnit = {
  id: string;
  unitLabel: string;
  title: string;
  doneCount: number;
  totalCount: number;
  locked: boolean;
  nodes: LearningNode[];
};

export const LEARNING_PATH_MOCK: LearningUnit[] = [
  {
    id: "unit-1",
    unitLabel: "Unit 1",
    title: "Alphabet Basics",
    doneCount: 2,
    totalCount: 4,
    locked: false,
    nodes: [
      { id: "a-f", label: "A – F", xp: 50, status: "done" },
      { id: "g-l", label: "G – L", xp: 50, status: "done" },
      { id: "m-r", label: "M – R", xp: 50, status: "current" },
      { id: "s-z", label: "S – Z", xp: 50, status: "locked" },
    ],
  },
  {
    id: "unit-2",
    unitLabel: "Unit 2",
    title: "Numbers",
    doneCount: 0,
    totalCount: 3,
    locked: true,
    nodes: [
      { id: "0-9", label: "0 – 9", xp: 50, status: "locked" },
      { id: "tens", label: "Tens", xp: 50, status: "locked" },
      { id: "counting", label: "Counting", xp: 50, status: "locked" },
    ],
  },
  {
    id: "module-3",
    unitLabel: "Module 3",
    title: "Greetings",
    doneCount: 1,
    totalCount: 2,
    locked: true,
    nodes: [
      { id: "1", label: "Greetings", xp: 50, status: "locked" },
      { id: "2", label: "Introductions", xp: 30, status: "locked" },
    ],
  }
];

import { gql } from "@apollo/client";

// Arguments come from `variables` in useQuery; leave one undefined to skip that filter
export const LOAD_MODULES = gql`
  query Modules($levelId: Int, $limit: Int, $offset: Int, $search: String, $status: String) {
    modules(levelId: $levelId, limit: $limit, offset: $offset, search: $search, status: $status) {
      createdAt
      description
      id
      levelId
      requiresModuleId
      sequence
      status
      title
      updatedAt
      xpReward
    }
  }
`;

export const LOAD_LEVELS = gql`
  query Levels($limit: Int, $offset: Int, $search: String, $status: String) {
    levels(limit: $limit, offset: $offset, search: $search, status: $status) {
      createdAt
      description
      difficulty
      id
      name
      sequence
      status
      updatedAt
    }
  }
`;

// Modules admin table: modules with their lessons and prerequisite module
export const LOAD_MODULES_TABLE = gql`
  query ModulesTable($levelId: Int, $limit: Int, $offset: Int, $search: String, $status: String) {
    modules(levelId: $levelId, limit: $limit, offset: $offset, search: $search, status: $status) {
      id
      levelId
      title
      description
      sequence
      xpReward
      status
      requiresModuleId
      requiresModule {
        id
        title
      }
      unitCount
      lessons {
        id
        title
        sequence
        xpReward
        status
      }
    }
  }
`;

// Module lessons page: one module, its stats and its lessons
export const LOAD_MODULE_DETAIL = gql`
  query ModuleDetail($id: ID!) {
    module(id: $id) {
      id
      levelId
      title
      description
      sequence
      xpReward
      status
      unitCount
      level {
        id
        name
      }
      requiresModule {
        id
        title
      }
      lessons {
        id
        moduleId
        title
        description
        sequence
        xpReward
        status
        updatedAt
        unitCount
      }
    }
  }
`;

export const LOAD_LESSON_UNITS = gql`
  query LessonUnits($lessonId: Int!) {
    units(lessonId: $lessonId, limit: 200) {
      id
      lessonId
      title
      description
      sequence
      mediaRef
      entryId
      needsVideo
      status
    }
  }
`;

// Learner lesson page: the lesson's header info plus its published units, in order
/* export const LOAD_LESSON_PLAYER = gql`
  query LessonPlayer($id: ID!, $lessonId: Int!) {
    lesson(id: $id) {
      id
      title
      xpReward
      status
      module {
        id
        title
        level {
          id
          name
        }
      }
    }
    units(lessonId: $lessonId, status: "published", limit: 200) {
      id
      title
      description
      sequence
      mediaRef
    }
  }
`; */

export const LOAD_LESSON_PLAYER = gql`
  query LessonPlayer($id: ID!) {
    lesson(id: $id) {
      id
      title
      xpReward
      status
      units {
        id
        title
        description
        sequence
        mediaRef
      }
      module {
        id
        title
        level {
          id
          name
        }
      }
    }
  }
`;

// No `id` in the input creates a lesson; with an `id` it updates that lesson
export const SAVE_LESSON = gql`
  mutation SaveLesson($input: lessonsInput!) {
    saveLessons(input: $input) {
      success
      message
    }
  }
`;

// Plain string (not gql) because units with a video are sent as a multipart upload
export const SAVE_UNIT_MUTATION = gql`
  mutation SaveUnit($input: unitInput!) {
    saveUnit(input: $input) {
      success
      message
    }
  }
`;


export const DELETE_UNIT = gql`
  mutation DeleteUnit($id: ID!) {
    deleteUnit(id: $id) {
      success
      message
    }
  }
`;

// Levels page: same as LOAD_LEVELS plus each level's modules, for the module count
export const LOAD_LEVELS_WITH_MODULES = gql`
  query LevelsWithModules($limit: Int, $offset: Int, $search: String, $status: String) {
    levels(limit: $limit, offset: $offset, search: $search, status: $status) {
      id
      name
      description
      difficulty
      sequence
      status
      updatedAt
      modules {
        id
      }
    }
  }
`;

// No `id` in the input creates a level; with an `id` it updates that level
export const SAVE_LEVEL = gql`
  mutation SaveLevel($input: levelInput!) {
    saveLevel(input: $input) {
      message
      success
    }
  }
`;

// No `id` in the input creates a module; with an `id` it updates that module
export const SAVE_MODULES = gql`
  mutation SaveModule($input: moduleInput!) {
    saveModule(input: $input) {
      message
      success
    }
  }
`;

// A lesson's quiz with its questions and their answer options
export const LOAD_LESSONQUIZ = gql`
  query LessonQuiz($lessonId: Int!) {
    lessonQuiz(lessonId: $lessonId) {
      id
      lessonId
      passThreshold
      status
      updatedAt
      quizQuestions {
        id
        questionType
        prompt
        mediaRef
        sequence
        correctAnswer
        updatedAt
        Options {
          id
          label
          mediaRef
          correctFlag
        }
      }
    }
  }
`;

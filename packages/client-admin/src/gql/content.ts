import { gql } from "@apollo/client";

// Learning content: levels -> modules -> lessons -> units.
// Leave a query variable undefined to skip that filter.

export const LOAD_LEVELS = gql`
  query Levels($limit: Int, $offset: Int, $search: String, $status: String) {
    levels(limit: $limit, offset: $offset, search: $search, status: $status) {
      id
      name
      description
      difficulty
      sequence
      status
      createdAt
      updatedAt
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
      success
      message
    }
  }
`;

// Modules table: modules with their lessons, unit count and prerequisite module
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

// No `id` in the input creates a module; with an `id` it updates that module
export const SAVE_MODULE = gql`
  mutation SaveModule($input: moduleInput!) {
    saveModule(input: $input) {
      success
      message
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

// `input.video` may be a File: the upload link sends it as a multipart request
export const SAVE_UNIT = gql`
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

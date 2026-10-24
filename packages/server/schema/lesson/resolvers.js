import { GraphQLError } from "graphql";
import { db } from "../../config/database.js";
import saveData from "../../utils/db/saveData.js";
import requireAnyPermission from "../../helpers/requireAnyPermission.js";
import saveUpload from "../../helpers/saveUpload.js";

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function checkPaging(limit, offset) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    throw badInput("Limit must be 1–100 and offset must be zero or greater.");
  }
}

// GraphQL IDs arrive as strings; content tables use Int ids
function toIntId(id) {
  const value = Number(id);
  if (!Number.isInteger(value)) throw badInput("Invalid id.");
  return value;
}

const notDeleted = { deleted: false };

export const getLevels = async ({ limit = 20, offset = 0, id, search, status } = {}) => {
  try {
    const where = { ...notDeleted };
    if (id) where.id = id;
    if (status) where.status = status;
    if (search) where.OR = [{ name: { contains: search } }, { description: { contains: search } }];

    return await db.level.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    console.log(error.message);
    throw new GraphQLError(`Failed to fetch levels: ${error.message}`);
  }
};

export const getModules = async ({ limit = 20, offset = 0, id, levelId, search, status } = {}) => {
  try {
    const where = { ...notDeleted };
    if (id) where.id = id;
    if (levelId) where.levelId = levelId;
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];

    return await db.module.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    throw new GraphQLError(`Failed to fetch modules: ${error.message}`);
  }
};

export const getLessons = async ({ limit = 20, offset = 0, id, moduleId, search, status } = {}) => {
  try {
    const where = { ...notDeleted };
    if (id) where.id = id;
    if (moduleId) where.moduleId = moduleId;
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];

    return await db.lesson.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    throw new GraphQLError(`Failed to fetch lessons: ${error.message}`);
  }
};

export const getUnits = async ({ limit = 50, offset = 0, lessonId, search, status } = {}) => {
  try {
    const where = { ...notDeleted };
    if (lessonId) where.lessonId = lessonId;
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];

    return await db.unit.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ lessonId: "asc" }, { sequence: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    throw new GraphQLError(`Failed to fetch units: ${error.message}`);
  }
};

const UNIT_VIDEO_MAX_SIZE = 50 * 1024 * 1024;

// Stores an uploaded sign video and returns its path for Unit.mediaRef
async function saveUnitMedia(file) {
  const upload = await file;
  // if (!upload?.mimetype?.startsWith("video/") || !upload?.mimetype?.startsWith("image/")) throw badInput("The unit video must be a video file.");
  const saved = await saveUpload({ file: upload, subdir: "unitsMedia", maxSize: UNIT_VIDEO_MAX_SIZE });
  return saved.filename;
}

const findOne = async (model, id, client = db) => {
  const row = await client[model].findUnique({ where: { id: toIntId(id) } });
  return row && !row.deleted ? row : null;
};

// Creating needs can_create_content, editing needs can_edit_content
function requireContentPermission(context, id) {
  requireAnyPermission(
    context,
    id ? ["can_edit_content"] : ["can_create_content"],
    `You do not have permission to ${id ? "edit" : "create"} learning content.`,
  );
}

// Keep only fields the client sent; required columns may be omitted on update but never set to null
function pickFields(input, fields, required) {
  const data = {};
  for (const field of fields) {
    if (input[field] === undefined) continue;
    if (input[field] === null && required.includes(field)) throw badInput(`${field} cannot be empty.`);
    data[field] = typeof input[field] === "string" ? input[field].trim() : input[field];
  }
  return data;
}

function requireOnCreate(id, data, required) {
  if (id) return;
  const missing = required.filter((field) => data[field] === undefined || data[field] === "");
  if (missing.length) throw badInput(`Missing required field(s): ${missing.join(", ")}.`);
}

async function ensureExists(model, id, label, client = db) {
  if (id == null) return;
  if (!(await findOne(model, id, client))) throw badInput(`${label} ${id} does not exist.`);
}

function rethrow(error, what) {
  if (error instanceof GraphQLError) throw error;
  throw new GraphQLError(`Failed to save ${what}: ${error.message}`);
}

const contentResolvers = {
  Query: {
    levels: (_parent, { limit, offset, search, status }) => {
      checkPaging(limit, offset);
      return getLevels({ limit, offset, search, status });
    },
    level: (_parent, { id }) => findOne("level", id),

    modules: (_parent, { limit, offset, search, status, levelId }) => {
      checkPaging(limit, offset);
      return getModules({ limit, offset, search, status, levelId });
    },
    module: (_parent, { id }) => findOne("module", id),

    lessons: (_parent, { limit, offset, search, status, moduleId }) => {
      checkPaging(limit, offset);
      return getLessons({ limit, offset, search, status, moduleId });
    },
    lesson: (_parent, { id }) => findOne("lesson", id),

    units: (_parent, { limit, offset, search, status, lessonId }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) {
        throw badInput("Limit must be 1–200 and offset must be zero or greater.");
      }
      return getUnits({ limit, offset, search, status, lessonId });
    },
    unit: (_parent, { id }) => findOne("unit", id),
  },

  
  Level: {
    modules: (level) =>
      db.module.findMany({ where: { levelId: level.id, ...notDeleted }, orderBy: { sequence: "asc" } }),
  },
  Module: {
    level: (module) => db.level.findUnique({ where: { id: module.levelId } }),
    requiresModule: (module) =>
      module.requiresModuleId ? db.module.findUnique({ where: { id: module.requiresModuleId } }) : null,
    unlocks: (module) =>
      db.module.findMany({ where: { requiresModuleId: module.id, ...notDeleted }, orderBy: { sequence: "asc" } }),
    lessons: (module) =>
      db.lesson.findMany({ where: { moduleId: module.id, ...notDeleted }, orderBy: { sequence: "asc" } }),
    unitCount: (module) =>
      db.unit.count({ where: { ...notDeleted, lesson: { moduleId: module.id, ...notDeleted } } }),
  },
  Lesson: {
    module: (lesson) => db.module.findUnique({ where: { id: lesson.moduleId } }),
    units: (lesson) =>
      db.unit.findMany({ where: { lessonId: lesson.id, ...notDeleted }, orderBy: { sequence: "asc" } }),
    unitCount: (lesson) => db.unit.count({ where: { lessonId: lesson.id, ...notDeleted } }),
  },
  Unit: {
    lesson: (unit) => db.lesson.findUnique({ where: { id: unit.lessonId } }),
    needsVideo: (unit) => !unit.mediaRef && unit.entryId == null,
  },

  //MUtations
  Mutation: {
    saveLevel: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      try {
        const required = ["name", "sequence", "difficulty", "status"];
        const data = pickFields(input, ["name", "description", "difficulty", "sequence", "status"], required);
        requireOnCreate(id, data, ["name", "sequence"]);
        if (id) await ensureExists("level", id, "Level");

        await saveData({ 
            model: "level", 
            data, 
            id 
        });

        return { success: true, message: id ? "Level updated successfully" : "Level created successfully" };
      } catch (error) {
        rethrow(error, "level");
      }
    },

    saveModule: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      try {
        const required = ["levelId", "title", "sequence", "xpReward", "status"];
        const data = pickFields(
          input,
          ["levelId", "title", "description", "sequence", "xpReward", "requiresModuleId", "status"],
          required,
        );

        // const data = {
        //   id,
        //   levelId, 
        //   title,   
        //   description,  
        //   sequence,
        //   xpReward,   
        //   unlocks, 
        //   status 
        // }

        // requireOnCreate(id, data, ["levelId", "title", "sequence"]);

        const unlocks = input.unlocks?.filter((moduleId) => moduleId != null) ?? null;
        if (id && (data.requiresModuleId === id || unlocks?.includes(id))) {
          throw badInput("A module cannot be its own prerequisite.");
        }

        // Saving the module and re-pointing the modules it unlocks happens all-or-nothing
        await db.$transaction(async (tx) => {
          if (id) await ensureExists("module", id, "Module", tx);
          await ensureExists("level", data.levelId, "Level", tx);
          await ensureExists("module", data.requiresModuleId, "Prerequisite module", tx);
          for (const moduleId of unlocks ?? []) await ensureExists("module", moduleId, "Module", tx);

          const savedId = await saveData({ model: "module", data, id, tx });

          // `unlocks` lists the modules that require this one; omit it to leave them unchanged
          if (unlocks) {
            await tx.module.updateMany({
              where: { requiresModuleId: savedId, id: { notIn: unlocks } },
              data: { requiresModuleId: null },
            });
            await tx.module.updateMany({
              where: { id: { in: unlocks } },
              data: { requiresModuleId: savedId },
            });
          }
        });

        return { success: true, message: id ? "Module updated successfully" : "Module created successfully" };
      } catch (error) {
        rethrow(error, "module");
      }
    },

    saveLessons: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      try {
        const required = ["moduleId", "title", "sequence", "xpReward", "status"];
        const data = pickFields(
          input,
          ["moduleId", "title", "description", "sequence", "xpReward", "status"],
          required,
        );
        requireOnCreate(id, data, ["moduleId", "title", "sequence"]);
        if (id) await ensureExists("lesson", id, "Lesson");
        await ensureExists("module", data.moduleId, "Module");

        // Media lives on units (Unit.mediaRef), not on lessons
        await saveData({ model: "lesson", data, id });

        return { success: true, message: id ? "Lesson updated successfully" : "Lesson created successfully" };
      } catch (error) {
        rethrow(error, "lesson");
      }
    },

    saveUnit: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      console.log(input);

      try {
        const required = ["lessonId", "title", "sequence", "status"];
        const data = pickFields(
          input,
          ["lessonId", "title", "description", "sequence", "entryId", "status"],
          required,
        );
        requireOnCreate(id, data, ["lessonId", "title"]);

        if (id) await ensureExists("unit", id, "Unit");
        await ensureExists("lesson", data.lessonId, "Lesson");
        await ensureExists("dictionaryEntry", data.entryId, "Dictionary sign");

        // New units go to the end of their lesson unless an order is given
        if (!id && data.sequence === undefined) {
          const last = await db.unit.aggregate({
            where: { lessonId: data.lessonId, ...notDeleted },
            _max: { sequence: true },
          });
          data.sequence = (last._max.sequence ?? 0) + 1;
        }

        if (input.video) {
          data.mediaRef = await saveUnitMedia(input.video);
        }


        await saveData({ model: "unit", data, id });

        return { success: true, message: id ? "Unit updated successfully" : "Unit created successfully" };
      } catch (error) {
        throw new GraphQLError(error.message);
      }
    },

    // Soft delete: the row stays for history but disappears from every query
    deleteUnit: async (_parent, { id }, context) => {
      requireAnyPermission(context, ["can_delete_content"], "You do not have permission to delete learning content.");

      try {
        const unitId = toIntId(id);
        await ensureExists("unit", unitId, "Unit");
        await db.unit.update({ where: { id: unitId }, data: { deleted: true } });
        return { success: true, message: "Unit deleted successfully" };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(`Failed to delete unit: ${error.message}`);
      }
    },
  },

};

export default contentResolvers;

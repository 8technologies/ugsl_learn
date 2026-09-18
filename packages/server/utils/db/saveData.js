import { db } from "../../config/database.js";
import { GraphQLError } from "graphql";

const saveData = async ({ model, id, data, idColumn = "id", tx }) => {
  const client = tx || db;
  const prismaModel = client[model];

  if (!prismaModel) {
    throw new GraphQLError(`Unknown model "${model}"`);
  }

  try {
    // Handle array case: bulk insert
    if (Array.isArray(data)) {
      const created = await client.$transaction(
        data.map((row) => prismaModel.create({ data: row }))
      );

      return created.map((row) => row[idColumn]);
    }

    // Update
    if (id) {
      try {
        const updated = await prismaModel.update({
          where: { [idColumn]: id },
          data,
        });

        return updated[idColumn];
      } catch (error) {
        if (error.code === "P2025") {
          throw new GraphQLError("No data that matched the provided id!");
        }
        throw error;
      }
    }

    // Insert
    const created = await prismaModel.create({ data });

    return created[idColumn];
  } catch (error) {
    if (error instanceof GraphQLError) throw error;
    throw new GraphQLError(error.message);
  }
};

export default saveData;

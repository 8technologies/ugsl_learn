import { fileURLToPath } from "node:url";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { createSchema } from "graphql-yoga";
import { loadModules } from "./loadModules.js";

const modules = await loadModules(fileURLToPath(new URL("./", import.meta.url)));

export const typeDefs = mergeTypeDefs(modules.typeDefs);
export const resolvers = mergeResolvers(modules.resolvers);
export const schema = createSchema({ typeDefs, resolvers });

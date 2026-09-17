import { createYoga } from "graphql-yoga";
import { isProduction } from "./config/config.js";
import { createContext } from "./context.js";
import { schema } from "./schema/index.js";

export const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: !isProduction,
  context: createContext,
});

import { createYoga } from "graphql-yoga";
import { isProduction } from "./config/config.js";
import { createContext } from "./context.js";
import { schema } from "./schema/index.js";
import { logError, requestLogContext } from "./utils/logger.js";
import authenticateUser from "./middleware/auth.js";
import { hasUsableBearerToken, isPublicGraphqlOperation } from "./utils/graphqlPublicAccess.js";

export const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: !isProduction,
  context: createContext,
  plugins: [
    {
      // Runs once the GraphQL params (query/operationName) are known, before
      // execution — the right place to gate access, since the request body
      // has already been consumed by the time the context factory runs.
      async onParams({ request, params, context, setResult }) {
        const publicOperation = isPublicGraphqlOperation({
          operationName: params.operationName,
          query: params.query,
        });
        const authReq =
          context.req ||
          (context.req = {
            headers: {
              authorization: request.headers.get("authorization") || undefined,
              "x-portal-type": request.headers.get("x-portal-type") || undefined,
            },
          });
        const hasUsableCredentials = hasUsableBearerToken(authReq.headers.authorization);

        if (hasUsableCredentials || !publicOperation) {
          try {
            await authenticateUser({ req: authReq });
          } catch (error) {
            setResult({ errors: [error] });
          }
        }
      },
    },
    {
      onExecute({ args }) {
        return {
          onExecuteDone({ result }) {
            for (const error of result?.errors || []) {
              logError("graphql_request_failed", error, {
                ...requestLogContext(args.contextValue?.req),
                operation_name: args.operationName || null,
              });
            }
          },
        };
      },
    },
  ],
});

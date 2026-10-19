import { CombinedGraphQLErrors } from "@apollo/client/errors";

// The server's `extensions.code` for a GraphQL error (e.g. "EMAIL_NOT_VERIFIED")
export const getErrorCode = (error: unknown): string | undefined =>
  CombinedGraphQLErrors.is(error)
    ? (error.errors.find((e) => e.extensions?.code)?.extensions?.code as string | undefined)
    : undefined;

export const toFriendlyErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
